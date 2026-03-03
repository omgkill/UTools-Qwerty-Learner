import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TypingStateActionType, initialState, typingReducer } from '@/pages/Typing/store'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords, loadTypingSession } from '@/services'
import { RepeatLearningManager } from '@/pages/Typing/hooks/RepeatLearningManager'
import { getTodayStartTime } from '@/utils/timeService'
import 'fake-indexeddb/auto'

const createWordList = (count: number): Word[] => {
  const words: Word[] = []
  for (let i = 0; i < count; i++) {
    words.push({
      name: `word${i}`,
      trans: [`n. 单词${i}`],
      usphone: '',
      ukphone: '',
      tense: '',
    })
  }
  return words
}

describe('重复学习完整流程测试', () => {
  const dictId = 'test-dict-repeat-learning-flow'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
  })

  it('完整流程：100词 → 学习20词 → 进入重复学习 → 验证第一个词 → 重新打开验证进度', async () => {
    // 1. 准备100词
    const wordList = createWordList(100)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))

    // 2. 获取今日学习单词
    const record = await dailyRecordService.getTodayRecord(dictId)
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
            getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    console.log(`今日学习单词数量: ${session.learningWords.length}`)

    // 3. 初始化 reducer state
    let state = initialState
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: session.learningWords },
    })
    state = typingReducer(state, { type: TypingStateActionType.SET_IS_TYPING, payload: true })

    // 4. 学习20个单词（模拟打字完成）
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    const learnedWords: string[] = []

    for (let i = 0; i < 20; i++) {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) break
      learnedWords.push(currentWord.name)

      // 记录学习记录（用于重复学习）
      await db.wordRecords.add({
        word: currentWord.name,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })

      // 下一个单词
      state = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })
    }

    console.log(`已学习单词: ${learnedWords.join(', ')}`)
    expect(learnedWords.length).toBe(20)

    // 5. 获取重复学习单词
    const repeatWords = await getRepeatLearningWords({
      currentDictId: dictId,
      wordList,
      listWordRecordsInRange: async (dictIdParam, start, end) => {
        return db.wordRecords
          .where('[dict+timeStamp]')
          .between([dictIdParam, start], [dictIdParam, end])
          .toArray()
      },
    })

    console.log(`重复学习单词数量: ${repeatWords.length}`)
    expect(repeatWords.length).toBe(20)

    // 6. 进入重复学习
    const manager = new RepeatLearningManager()
    await manager.start(dictId, repeatWords)

    // 7. 设置重复学习状态（模拟 React 组件中的逻辑）
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: repeatWords },
    })
    state = typingReducer(state, {
      type: TypingStateActionType.SET_CURRENT_INDEX,
      payload: 0,
    })
    state = typingReducer(state, {
      type: TypingStateActionType.SET_IS_REPEAT_LEARNING,
      payload: true,
    })

    // 8. 验证第一个单词是重复学习列表的第一个
    const firstRepeatWord = state.wordListData.words[state.wordListData.index]
    console.log(`重复学习第一个单词: ${firstRepeatWord?.name}`)
    expect(firstRepeatWord?.name).toBe(repeatWords[0].name)

    // 9. 学习5个单词
    for (let i = 0; i < 5; i++) {
      state = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })
      await manager.updateIndex(dictId, state.wordListData.index)
    }

    const currentIndex = state.wordListData.index
    const currentWord = state.wordListData.words[currentIndex]
    console.log(`学习5个单词后，当前 index=${currentIndex}, 单词=${currentWord?.name}`)
    expect(currentIndex).toBe(5)

    // 10. 模拟重新打开界面（新的 manager 实例）
    const manager2 = new RepeatLearningManager()
    const restoredState = await manager2.initialize(dictId)

    // 11. 验证恢复的状态
    expect(restoredState).not.toBeNull()
    expect(restoredState?.currentIndex).toBe(5)
    expect(restoredState?.learningWords.length).toBe(20)

    // 12. 模拟 React 组件恢复状态
    let state2 = initialState
    state2 = typingReducer(state2, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: restoredState!.learningWords },
    })
    state2 = typingReducer(state2, {
      type: TypingStateActionType.SET_CURRENT_INDEX,
      payload: restoredState!.currentIndex,
    })
    state2 = typingReducer(state2, {
      type: TypingStateActionType.SET_IS_REPEAT_LEARNING,
      payload: true,
    })

    // 13. 验证恢复后的单词正确
    const restoredWord = state2.wordListData.words[state2.wordListData.index]
    console.log(`重新打开后，当前 index=${state2.wordListData.index}, 单词=${restoredWord?.name}`)
    expect(state2.wordListData.index).toBe(5)
    expect(restoredWord?.name).toBe(repeatWords[5].name)
  })

  it('验证不使用 initialIndex 会导致进度丢失', async () => {
    // 1. 准备100词
    const wordList = createWordList(100)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))

    // 2. 获取今日学习单词
    const record = await dailyRecordService.getTodayRecord(dictId)
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
            getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 3. 初始化并学习到 index=15
    let state = initialState
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: session.learningWords },
    })

    for (let i = 0; i < 15; i++) {
      state = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })
    }
    expect(state.wordListData.index).toBe(15)

    // 4. 模拟重复学习恢复，但不使用 initialIndex（bug 场景）
    const repeatWords: WordWithIndex[] = []
    for (let i = 0; i < 10; i++) {
      repeatWords.push({ ...wordList[i], index: i })
    }

    // 不使用 initialIndex
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: repeatWords },  // 没有 initialIndex
    })

    // 5. 验证 index 被重置为 0（因为找不到 normal15 在 repeatWords 中）
    console.log(`不使用 initialIndex 时，index=${state.wordListData.index}`)
    expect(state.wordListData.index).toBe(0)  // 这就是 bug
  })
})

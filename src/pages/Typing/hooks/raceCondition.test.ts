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

describe('模拟真实 React useEffect 执行顺序 - 发现竞态条件', () => {
  const dictId = 'test-dict-race-condition'
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

  it('关键测试：模拟 useNormalLearningSync 和 useRepeatLearningSync 的竞态条件', async () => {
    console.log('========================================')
    console.log('准备数据：100词 → 学习20词 → 进入重复学习 → 学习5词')
    console.log('========================================')
    
    const wordList = createWordList(100)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))

    const record = await dailyRecordService.getTodayRecord(dictId)
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
            getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 学习20个单词
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: session.learningWords[i].name,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }

    // 获取重复学习单词
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

    // 进入重复学习并学习5个单词
    const manager = new RepeatLearningManager()
    await manager.start(dictId, repeatWords)
    
    for (let i = 0; i < 5; i++) {
      await manager.updateIndex(dictId, i + 1)
    }

    console.log(`✓ 准备完成：重复学习进度 index=5`)

    console.log('\n========================================')
    console.log('模拟重新打开界面（关键：模拟真实的 useEffect 执行顺序）')
    console.log('========================================')

    let state = initialState
    const dispatchLog: string[] = []
    const dispatch = (action: any) => {
      state = typingReducer(state, action)
      const logEntry = `${action.type}: index=${state.wordListData.index}, words.length=${state.wordListData.words?.length}`
      dispatchLog.push(logEntry)
      console.log(`[dispatch] ${logEntry}`)
    }

    // 模拟 React state
    let mode: 'normal' | 'repeat' | null = null
    let isModeInitialized = false

    // 模拟 useWordList 返回的 words
    // 当 mode='normal' 时，useWordList 会加载正常学习的单词列表
    const normalLearningWords = session.learningWords

    // ========== 模拟 React 组件挂载时的 useEffect 执行顺序 ==========
    
    console.log('\n--- 第一轮渲染 ---')
    
    // 1. useTypingMode 的 useEffect 执行
    console.log('1. useTypingMode useEffect: 设置 mode=normal')
    mode = 'normal'
    isModeInitialized = true

    // 2. 模拟 useWordList 的 loadLearningWords
    // 当 mode='normal' 时，会加载正常学习的单词
    console.log('2. useWordList loadLearningWords: 加载正常学习单词')
    // 这里 words 会变成正常学习的单词列表

    // 3. useNormalLearningSync 的 useEffect 执行
    // isActive = mode === 'normal' && isModeInitialized = true
    const normalSyncIsActive = mode === 'normal' && isModeInitialized
    console.log(`3. useNormalLearningSync useEffect: isActive=${normalSyncIsActive}`)
    
    if (normalSyncIsActive) {
      // 这里会 dispatch SET_WORDS（正常学习的单词）
      // 这是问题的关键！
      console.log('   [问题] dispatch SET_WORDS（正常学习的单词）')
      dispatch({
        type: TypingStateActionType.SET_WORDS,
        payload: { words: normalLearningWords },
      })
      // 注意：SET_WORDS 会重置 index 为 0（如果单词列表变化）
    }

    // 4. useRepeatLearningSync 的第一个 useEffect 执行
    console.log('4. useRepeatLearningSync 第一个 useEffect: checkAndRestore')
    
    const managerForSync = new RepeatLearningManager()
    const savedState = await managerForSync.initialize(dictId)
    
    if (savedState && savedState.learningWords.length > 0) {
      console.log(`   发现重复学习记录: index=${savedState.currentIndex}`)
      
      // onStateRestored 回调
      console.log('   dispatch SET_WORDS（重复学习的单词）')
      dispatch({
        type: TypingStateActionType.SET_WORDS,
        payload: { words: savedState.learningWords },
      })
      
      console.log('   dispatch SET_CURRENT_INDEX')
      dispatch({
        type: TypingStateActionType.SET_CURRENT_INDEX,
        payload: savedState.currentIndex,
      })
      
      // switchToRepeat
      console.log('   switchToRepeat()')
      mode = 'repeat'
    }

    console.log('\n========================================')
    console.log('最终状态')
    console.log('========================================')
    console.log(`mode = ${mode}`)
    console.log(`state.wordListData.index = ${state.wordListData.index}`)
    console.log(`当前单词 = ${state.wordListData.words[state.wordListData.index]?.name}`)
    
    console.log('\n所有 dispatch 操作:')
    dispatchLog.forEach((log, i) => console.log(`  ${i + 1}. ${log}`))

    // 验证
    console.log('\n验证结果:')
    console.log(`  预期 index = 5`)
    console.log(`  实际 index = ${state.wordListData.index}`)
    
    // 这个测试应该会失败，因为 useNormalLearningSync 先执行了 SET_WORDS
    // 但由于 SET_WORDS 不会重置 index（如果单词不在列表中），所以可能不会失败
    // 让我检查一下 reducer 的逻辑
    
    expect(state.wordListData.index).toBe(5)
  })
})

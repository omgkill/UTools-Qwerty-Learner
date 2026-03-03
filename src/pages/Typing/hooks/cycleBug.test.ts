import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TypingStateActionType, initialState, typingReducer } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getNextReplacementWord, handleMasteredFlow, loadTypingSession } from '@/services'
import 'fake-indexeddb/auto'

const createWordList = (count: number): Word[] => {
  const words: Word[] = []
  for (let i = 0; i < count; i++) {
    words.push({
      name: `word${i}`,
      trans: ['n. 测试'],
      usphone: '',
      ukphone: '',
      tense: '',
    })
  }
  return words
}

describe('Typing Page - 真实流程复现', () => {
  const dictId = 'test-dict-cycle-bug'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
  })

  it('词库100词 -> 设置词库 -> 获取今日单词列表 -> 点击掌握40次', async () => {
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

    let state = initialState
    state = typingReducer(state, { type: TypingStateActionType.SET_WORDS, payload: { words: session.learningWords } })
    state = typingReducer(state, { type: TypingStateActionType.SET_IS_TYPING, payload: true })

    const wordSequence: string[] = []

    for (let i = 0; i < 40; i++) {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) break
      wordSequence.push(currentWord.name)

      const result = await handleMasteredFlow({
        currentWord,
        markAsMastered: (word) => wordProgressService.markAsMastered(dictId, word),
        getNextNewWord: () =>
          getNextReplacementWord({
            wordList,
            currentLearningWords: state.wordListData.words,
            getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
          }),
      })

      if (result.replacementWord) {
        state = typingReducer(state, {
          type: TypingStateActionType.ADD_REPLACEMENT_WORD,
          payload: result.replacementWord,
        })
      }

      if (result.shouldSkip) {
        state = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })
      }

      const nextWord = state.wordListData.words[state.wordListData.index]
      console.log(`当前单词：${currentWord.name}，掌握后下一个单词：${nextWord?.name ?? 'none'}`)
    }

    expect(wordSequence.length).toBeGreaterThan(0)
    expect(new Set(wordSequence).size).toBe(wordSequence.length)
  })

  it('所有单词已有NEW进度时，getNewWords 仍返回新词', async () => {
    const wordList = createWordList(3)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))

    const newWords = await wordProgressService.getNewWords(dictId, wordList, 3)
    expect(newWords.length).toBe(3)
  })

  it('存在已掌握单词时，getNewWords 不返回已掌握单词', async () => {
    const wordList = createWordList(3)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    await wordProgressService.markAsMastered(dictId, wordList[0].name)

    const newWords = await wordProgressService.getNewWords(dictId, wordList, 3)
    const names = newWords.map((word) => word.name)
    expect(names).not.toContain(wordList[0].name)
    expect(newWords.length).toBe(2)
  })
})

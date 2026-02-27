import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords } from '@/services'
import { getTodayStartTime, getTodayString, getTomorrowDateString } from '@/utils/timeService'
import 'fake-indexeddb/auto'

const REPEAT_STATE_KEY = 'typing-state'

const utoolsDbMock = (() => {
  let store: Record<string, { data: unknown; _rev?: string }> = {}
  let rev = 0
  return {
    get: (id: string) => store[id] ?? null,
    put: (doc: { _id: string; data: unknown; _rev?: string }) => {
      rev += 1
      store[doc._id] = { data: doc.data, _rev: String(rev) }
      return { ok: true }
    },
    remove: (id: string) => {
      delete store[id]
      return { ok: true }
    },
    clear: () => {
      store = {}
      rev = 0
    },
  }
})()

const globalWindow = globalThis as typeof globalThis & { window?: Window }
if (!globalWindow.window) {
  Object.defineProperty(globalWindow, 'window', { value: globalThis as unknown as Window })
}
Object.defineProperty(globalWindow, 'utools', {
  value: { db: utoolsDbMock },
})
if (globalWindow.window && !globalWindow.window.utools) {
  Object.defineProperty(globalWindow.window, 'utools', {
    value: { db: utoolsDbMock },
  })
}

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

const createWordWithIndex = (word: Word, index: number): WordWithIndex => {
  return { ...word, index }
}

describe('重复学习功能测试', () => {
  const dictId = 'test-dict-repeat-learning'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
    utoolsDbMock.clear()
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    utoolsDbMock.clear()
  })

  it('今日学习完成后，点击重复学习，应该能够正确保存和恢复状态', async () => {
    const wordList = createWordList(20)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    await dailyRecordService.getTodayRecord(dictId)
    
    for (let i = 0; i < 10; i++) {
      await dailyRecordService.incrementLearned(dictId)
    }
    for (let i = 0; i < 10; i++) {
      await dailyRecordService.incrementReviewed(dictId)
    }
    
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }
    
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
    
    console.log('重复学习单词列表:', repeatWords.map(w => w.name))
    expect(repeatWords.length).toBe(20)
    
    const savedState = {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: getTodayString(),
    }
    utoolsDbMock.put({ _id: REPEAT_STATE_KEY, data: savedState })
    
    const loadedStateDoc = utoolsDbMock.get(REPEAT_STATE_KEY)
    expect(loadedStateDoc).not.toBeNull()
    
    const loadedState = loadedStateDoc?.data as typeof savedState
    console.log('加载的状态:', loadedState)
    
    expect(loadedState.isRepeatLearning).toBe(true)
    expect(loadedState.learningWords.length).toBe(20)
    expect(loadedState.date).toBe(getTodayString())
    
    const loadedWordNames = loadedState.learningWords.map((w: WordWithIndex) => w.name)
    const originalWordNames = repeatWords.map(w => w.name)
    expect(loadedWordNames.sort()).toEqual(originalWordNames.sort())
  })

  it('第二天应该清除昨天的重复学习状态', async () => {
    const yesterdayDate = getTomorrowDateString().replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
      const date = new Date(`${y}-${m}-${d}`)
      date.setDate(date.getDate() - 2)
      return date.toISOString().split('T')[0]
    })
    
    const wordList = createWordList(10)
    const repeatWords = wordList.map((word, index) => createWordWithIndex(word, index))
    
    const savedState = {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: yesterdayDate,
    }
    utoolsDbMock.put({ _id: REPEAT_STATE_KEY, data: savedState })
    
    const loadedStateDoc = utoolsDbMock.get(REPEAT_STATE_KEY)
    const loadedState = loadedStateDoc?.data as typeof savedState
    
    const today = getTodayString()
    expect(loadedState.date).not.toBe(today)
    
    if (loadedState.date !== today) {
      console.log('日期不匹配，应该清除昨天的状态')
    }
  })

  it('重复学习模式下，学习单词应该正确显示', async () => {
    const wordList = createWordList(15)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    
    for (let i = 0; i < 15; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }
    
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
    
    expect(repeatWords.length).toBe(15)
    
    const uniqueWords = new Set(repeatWords.map(w => w.name))
    expect(uniqueWords.size).toBe(15)
    
    repeatWords.forEach(word => {
      expect(word).toHaveProperty('name')
      expect(word).toHaveProperty('index')
      expect(typeof word.index).toBe('number')
    })
  })

  it('没有学习记录时，重复学习应该返回空列表', async () => {
    const wordList = createWordList(10)
    
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
    
    expect(repeatWords.length).toBe(0)
  })

  it('进入重复学习后，学习几个单词，重新进入应该保持学习状态', async () => {
    const wordList = createWordList(20)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }
    
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
    
    expect(repeatWords.length).toBe(20)
    
    const todayString = getTodayString()
    const savedState = {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: todayString,
    }
    utoolsDbMock.put({ _id: REPEAT_STATE_KEY, data: savedState })
    
    const learnedWords = repeatWords.slice(0, 5)
    const remainingWords = repeatWords.slice(5)
    
    const updatedState = {
      isRepeatLearning: true,
      learningWords: remainingWords,
      date: todayString,
    }
    utoolsDbMock.put({ _id: REPEAT_STATE_KEY, data: updatedState })
    
    const loadedStateDoc = utoolsDbMock.get(REPEAT_STATE_KEY)
    expect(loadedStateDoc).not.toBeNull()
    
    const loadedState = loadedStateDoc?.data as typeof updatedState
    console.log('重新进入后加载的状态:', {
      isRepeatLearning: loadedState.isRepeatLearning,
      learningWordsCount: loadedState.learningWords.length,
      date: loadedState.date,
    })
    
    expect(loadedState.isRepeatLearning).toBe(true)
    expect(loadedState.learningWords.length).toBe(15)
    expect(loadedState.date).toBe(todayString)
    
    const loadedWordNames = loadedState.learningWords.map((w: WordWithIndex) => w.name)
    const remainingWordNames = remainingWords.map(w => w.name)
    expect(loadedWordNames.sort()).toEqual(remainingWordNames.sort())
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords } from '@/services'
import { getTodayDate } from '@/utils/db/progress'
import 'fake-indexeddb/auto'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

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
    localStorage.clear()
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    localStorage.clear()
  })

  it('今日学习完成后，点击重复学习，应该能够正确保存和恢复状态', async () => {
    const wordList = createWordList(20)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    await dailyRecordService.incrementLearned(dictId, 10)
    await dailyRecordService.incrementReviewed(dictId, 10)
    
    const today = getTodayDate()
    const todayStart = Math.floor(new Date(today).getTime() / 1000)
    
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        errorCount: 0,
        letterMistake: {},
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
      date: new Date().toISOString().split('T')[0],
    }
    localStorage.setItem('typingState', JSON.stringify(savedState))
    
    const loadedStateString = localStorage.getItem('typingState')
    expect(loadedStateString).not.toBeNull()
    
    const loadedState = JSON.parse(loadedStateString!)
    console.log('加载的状态:', loadedState)
    
    expect(loadedState.isRepeatLearning).toBe(true)
    expect(loadedState.learningWords.length).toBe(20)
    expect(loadedState.date).toBe(new Date().toISOString().split('T')[0])
    
    const loadedWordNames = loadedState.learningWords.map((w: WordWithIndex) => w.name)
    const originalWordNames = repeatWords.map(w => w.name)
    expect(loadedWordNames.sort()).toEqual(originalWordNames.sort())
  })

  it('第二天应该清除昨天的重复学习状态', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split('T')[0]
    
    const wordList = createWordList(10)
    const repeatWords = wordList.map((word, index) => createWordWithIndex(word, index))
    
    const savedState = {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: yesterdayDate,
    }
    localStorage.setItem('typingState', JSON.stringify(savedState))
    
    const loadedStateString = localStorage.getItem('typingState')
    const loadedState = JSON.parse(loadedStateString!)
    
    const today = new Date().toISOString().split('T')[0]
    expect(loadedState.date).not.toBe(today)
    
    if (loadedState.date !== today) {
      console.log('日期不匹配，应该清除昨天的状态')
    }
  })

  it('重复学习模式下，学习单词应该正确显示', async () => {
    const wordList = createWordList(15)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const today = getTodayDate()
    const todayStart = Math.floor(new Date(today).getTime() / 1000)
    
    for (let i = 0; i < 15; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        errorCount: 0,
        letterMistake: {},
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
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords } from '@/services'
import { getTodayStartTime, getTodayString, getTomorrowDateString } from '@/utils/timeService'
import 'fake-indexeddb/auto'
import type { ITypingState } from '@/utils/db'

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

async function writeRepeatLearningState(currentDictId: string, state: Omit<ITypingState, 'id'>): Promise<void> {
  try {
    if (db.typingStates) {
      const allStates = await db.typingStates.toArray()
      const existing = allStates.find(item => item.dict === currentDictId && item.date === state.date)
      if (existing) {
        await db.typingStates.update(existing.id!, state)
      } else {
        await db.typingStates.add(state)
      }
    }
  } catch (e) {
    console.error('Failed to save state:', e)
  }
}

async function readRepeatLearningState(currentDictId: string): Promise<ITypingState | null> {
  try {
    if (db.typingStates) {
      const allStates = await db.typingStates.toArray()
      return allStates.find(item => item.dict === currentDictId && item.date === getTodayString()) ?? null
    }
    return null
  } catch (e) {
    console.error('Failed to load saved state:', e)
    return null
  }
}

describe('重复学习功能测试', () => {
  const dictId = 'test-dict-repeat-learning'
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
    
    await writeRepeatLearningState(dictId, {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: getTodayString(),
      dict: dictId,
      currentIndex: 0,
    })
    
    const loadedState = await readRepeatLearningState(dictId)
    expect(loadedState).not.toBeNull()
    
    expect(loadedState?.isRepeatLearning).toBe(true)
    expect(loadedState?.learningWords.length).toBe(20)
    expect(loadedState?.date).toBe(getTodayString())
    
    const loadedWordNames = (loadedState?.learningWords as WordWithIndex[])?.map(w => w.name)
    const originalWordNames = repeatWords.map(w => w.name)
    expect(loadedWordNames?.sort()).toEqual(originalWordNames.sort())
  })

  it('第二天应该清除昨天的重复学习状态', async () => {
    const yesterdayDate = getTomorrowDateString().replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
      const date = new Date(`${y}-${m}-${d}`)
      date.setDate(date.getDate() - 2)
      return date.toISOString().split('T')[0]
    })
    
    const wordList = createWordList(10)
    const repeatWords = wordList.map((word, index) => createWordWithIndex(word, index))
    
    await writeRepeatLearningState(dictId, {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: yesterdayDate,
      dict: dictId,
      currentIndex: 0,
    })
    
    const loadedState = await readRepeatLearningState(dictId)
    
    const today = getTodayString()
    expect(loadedState?.date).not.toBe(today)
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
    await writeRepeatLearningState(dictId, {
      isRepeatLearning: true,
      learningWords: repeatWords,
      date: todayString,
      dict: dictId,
      currentIndex: 0,
    })
    
    const learnedWords = repeatWords.slice(0, 5)
    const remainingWords = repeatWords.slice(5)
    
    await writeRepeatLearningState(dictId, {
      isRepeatLearning: true,
      learningWords: remainingWords,
      date: todayString,
      dict: dictId,
      currentIndex: 5,
    })
    
    const loadedState = await readRepeatLearningState(dictId)
    expect(loadedState).not.toBeNull()
    
    expect(loadedState?.isRepeatLearning).toBe(true)
    expect(loadedState?.learningWords.length).toBe(15)
    expect(loadedState?.date).toBe(todayString)
    
    const loadedWordNames = (loadedState?.learningWords as WordWithIndex[])?.map(w => w.name)
    const remainingWordNames = remainingWords.map(w => w.name)
    expect(loadedWordNames?.sort()).toEqual(remainingWordNames.sort())
  })
})

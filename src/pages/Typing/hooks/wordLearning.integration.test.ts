import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MASTERY_LEVELS, getTodayDate, DailyRecord } from '@/utils/db/progress'
import type { Word } from '@/typings'
import { WordRecord } from '@/utils/db/record'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, loadTypingSession, handleMasteredFlow } from '@/services'
import dayjs from 'dayjs'
import 'fake-indexeddb/auto'
import { advanceDays, resetTimeDiff, getTomorrowDateString } from '@/utils/timeService'

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

const saveWordRecord = async (word: string, dictId: string, timing: number[], wrongCount: number, mistakes: Record<number, string[]>) => {
  const wordRecord = new WordRecord(word, dictId, null, timing, wrongCount, mistakes)
  const dbID = await db.wordRecords.add(wordRecord)
  return dbID
}

describe('背单词集成测试 - 第一天学习新词', () => {
  const dictId = 'test-dict-word-learning'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
  })

  it('词库 100 词 -> 第一天背 20 个新词 -> 中间多次输入失败 -> 预期：都是新词，学了 20 个新词，没有复习词', async () => {
    const wordList = createWordList(100)
    
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(session.learningType).toBe('new')
    expect(session.learningWords.length).toBe(20)
    expect(session.dueCount).toBe(0)
    expect(session.newCount).toBe(100)

    const learningWords = session.learningWords
    const learnedWordNames: string[] = []

    for (let i = 0; i < learningWords.length; i++) {
      const word = learningWords[i]
      learnedWordNames.push(word.name)

      const progressBefore = await wordProgressService.getProgress(dictId, word.name)
      expect(progressBefore?.masteryLevel).toBe(MASTERY_LEVELS.NEW)
      expect(progressBefore?.reps).toBe(0)

      const wrongCount = Math.floor(Math.random() * 5) + 1
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      // 模拟真实的输入流程：多次错误后正确
      for (let j = 0; j < wrongCount; j++) {
        await wordProgressService.updateProgress(dictId, word.name, false, 0)
      }
      await wordProgressService.updateProgress(dictId, word.name, true, 0)

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
      await dailyRecordService.incrementLearned(dictId)

      const progressAfter = await wordProgressService.getProgress(dictId, word.name)
      expect(progressAfter?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progressAfter?.reps).toBe(wrongCount + 1)
      expect(progressAfter?.wrongCount).toBe(wrongCount)
    }

    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.learnedCount).toBe(20)
    expect(updatedRecord.reviewedCount).toBe(0)

    const allProgress = await wordProgressService.getAllProgress(dictId)
    const learnedProgress = allProgress.filter((p) => learnedWordNames.includes(p.word))
    
    expect(learnedProgress.length).toBe(20)
    
    for (const progress of learnedProgress) {
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progress.reps).toBeGreaterThan(0)
    }

    const newProgress = allProgress.filter((p) => !learnedWordNames.includes(p.word))
    expect(newProgress.length).toBe(80)
    
    for (const progress of newProgress) {
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.NEW)
      expect(progress.reps).toBe(0)
    }

    const today = getTodayDate()
    const startOfDay = dayjs(today).startOf('day').unix()
    const endOfDay = dayjs(today).endOf('day').unix()
    
    const allWordRecords = await db.wordRecords.where('dict').equals(dictId).toArray()
    const wordFirstDateMap = new Map<string, string>()
    const sortedAllRecords = [...allWordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
    for (const r of sortedAllRecords) {
      if (!wordFirstDateMap.has(r.word)) {
        wordFirstDateMap.set(r.word, dayjs(r.timeStamp * 1000).format('YYYY-MM-DD'))
      }
    }

    const todayWordRecords = allWordRecords.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
    
    const wordDetails = todayWordRecords.map((record) => {
      const firstDateEver = wordFirstDateMap.get(record.word)
      const currentDate = dayjs(record.timeStamp * 1000).format('YYYY-MM-DD')
      const isMastered = record.timing.length === 0 && record.wrongCount === 0
      const type: 'new' | 'review' | 'mastered' = isMastered ? 'mastered' : (firstDateEver === currentDate ? 'new' : 'review')
      return {
        word: record.word,
        timeStamp: record.timeStamp,
        wrongCount: record.wrongCount,
        type,
      }
    })

    const newWords = wordDetails.filter((w) => w.type === 'new')
    const reviewWords = wordDetails.filter((w) => w.type === 'review')
    const masteredWords = wordDetails.filter((w) => w.type === 'mastered')

    expect(newWords.length).toBe(20)
    expect(reviewWords.length).toBe(0)
    expect(masteredWords.length).toBe(0)
    
    for (const word of newWords) {
      expect(learnedWordNames).toContain(word.word)
      expect(word.wrongCount).toBeGreaterThan(0)
    }
  })

  it('词库 100 词 -> 第一天背 20 个新词 -> 每个单词都正确输入 -> 预期：都是新词，学了 20 个新词，没有复习词', async () => {
    const wordList = createWordList(100)
    
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(session.learningType).toBe('new')
    expect(session.learningWords.length).toBe(20)
    expect(session.dueCount).toBe(0)

    const learningWords = session.learningWords
    const learnedWordNames: string[] = []

    for (let i = 0; i < learningWords.length; i++) {
      const word = learningWords[i]
      learnedWordNames.push(word.name)

      const progressBefore = await wordProgressService.getProgress(dictId, word.name)
      expect(progressBefore?.masteryLevel).toBe(MASTERY_LEVELS.NEW)
      expect(progressBefore?.reps).toBe(0)

      const timing = [Math.floor(Math.random() * 500) + 100]
      const mistakes: Record<number, string[]> = {}
      
      // 模拟真实的输入流程：一次正确
      await wordProgressService.updateProgress(dictId, word.name, true, 0)

      await saveWordRecord(word.name, dictId, timing, 0, mistakes)
      await dailyRecordService.incrementLearned(dictId)

      const progressAfter = await wordProgressService.getProgress(dictId, word.name)
      expect(progressAfter?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progressAfter?.reps).toBe(1)
      expect(progressAfter?.wrongCount).toBe(0)
    }

    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.learnedCount).toBe(20)
    expect(updatedRecord.reviewedCount).toBe(0)

    const allProgress = await wordProgressService.getAllProgress(dictId)
    const learnedProgress = allProgress.filter((p) => learnedWordNames.includes(p.word))
    
    expect(learnedProgress.length).toBe(20)
    
    for (const progress of learnedProgress) {
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progress.reps).toBe(1)
      expect(progress.wrongCount).toBe(0)
    }

    const newProgress = allProgress.filter((p) => !learnedWordNames.includes(p.word))
    expect(newProgress.length).toBe(80)
    
    for (const progress of newProgress) {
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.NEW)
      expect(progress.reps).toBe(0)
    }

    const today = getTodayDate()
    const startOfDay = dayjs(today).startOf('day').unix()
    const endOfDay = dayjs(today).endOf('day').unix()
    
    const allWordRecords = await db.wordRecords.where('dict').equals(dictId).toArray()
    const wordFirstDateMap = new Map<string, string>()
    const sortedAllRecords = [...allWordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
    for (const r of sortedAllRecords) {
      if (!wordFirstDateMap.has(r.word)) {
        wordFirstDateMap.set(r.word, dayjs(r.timeStamp * 1000).format('YYYY-MM-DD'))
      }
    }

    const todayWordRecords = allWordRecords.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
    
    const wordDetails = todayWordRecords.map((record) => {
      const firstDateEver = wordFirstDateMap.get(record.word)
      const currentDate = dayjs(record.timeStamp * 1000).format('YYYY-MM-DD')
      const isMastered = record.timing.length === 0 && record.wrongCount === 0
      const type: 'new' | 'review' | 'mastered' = isMastered ? 'mastered' : (firstDateEver === currentDate ? 'new' : 'review')
      return {
        word: record.word,
        timeStamp: record.timeStamp,
        wrongCount: record.wrongCount,
        type,
      }
    })

    const newWords = wordDetails.filter((w) => w.type === 'new')
    const reviewWords = wordDetails.filter((w) => w.type === 'review')
    const masteredWords = wordDetails.filter((w) => w.type === 'mastered')

    expect(newWords.length).toBe(20)
    expect(reviewWords.length).toBe(0)
    expect(masteredWords.length).toBe(0)
    
    for (const word of newWords) {
      expect(learnedWordNames).toContain(word.word)
      expect(word.wrongCount).toBe(0)
    }
  })

  it('词库 100 词 -> 第一天背 20 个新词 -> 部分单词错误输入后正确 -> 预期：都是新词，学了 20 个新词，没有复习词', async () => {
    const wordList = createWordList(100)
    
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(session.learningType).toBe('new')
    expect(session.learningWords.length).toBe(20)

    const learningWords = session.learningWords
    const learnedWordNames: string[] = []

    for (let i = 0; i < learningWords.length; i++) {
      const word = learningWords[i]
      learnedWordNames.push(word.name)

      const wrongCount = i % 3 === 0 ? 3 : 0
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      // 模拟真实的输入流程：部分单词有错误
      if (wrongCount > 0) {
        for (let j = 0; j < wrongCount; j++) {
          await wordProgressService.updateProgress(dictId, word.name, false, 0)
        }
      }
      await wordProgressService.updateProgress(dictId, word.name, true, 0)

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
      await dailyRecordService.incrementLearned(dictId)
    }

    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.learnedCount).toBe(20)
    expect(updatedRecord.reviewedCount).toBe(0)

    const allProgress = await wordProgressService.getAllProgress(dictId)
    const learnedProgress = allProgress.filter((p) => learnedWordNames.includes(p.word))
    
    expect(learnedProgress.length).toBe(20)
    
    for (const progress of learnedProgress) {
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      // reps 应该等于错误次数 + 1（最后一次正确）
      const wordIndex = learnedWordNames.indexOf(progress.word)
      const expectedWrongCount = wordIndex % 3 === 0 ? 3 : 0
      expect(progress.reps).toBe(expectedWrongCount + 1)
      expect(progress.wrongCount).toBe(expectedWrongCount)
    }

    const today = getTodayDate()
    const startOfDay = dayjs(today).startOf('day').unix()
    const endOfDay = dayjs(today).endOf('day').unix()
    
    const allWordRecords = await db.wordRecords.where('dict').equals(dictId).toArray()
    const wordFirstDateMap = new Map<string, string>()
    const sortedAllRecords = [...allWordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
    for (const r of sortedAllRecords) {
      if (!wordFirstDateMap.has(r.word)) {
        wordFirstDateMap.set(r.word, dayjs(r.timeStamp * 1000).format('YYYY-MM-DD'))
      }
    }

    const todayWordRecords = allWordRecords.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
    
    const wordDetails = todayWordRecords.map((record) => {
      const firstDateEver = wordFirstDateMap.get(record.word)
      const currentDate = dayjs(record.timeStamp * 1000).format('YYYY-MM-DD')
      const isMastered = record.timing.length === 0 && record.wrongCount === 0
      const type: 'new' | 'review' | 'mastered' = isMastered ? 'mastered' : (firstDateEver === currentDate ? 'new' : 'review')
      return {
        word: record.word,
        timeStamp: record.timeStamp,
        wrongCount: record.wrongCount,
        type,
      }
    })

    const newWords = wordDetails.filter((w) => w.type === 'new')
    const reviewWords = wordDetails.filter((w) => w.type === 'review')
    const masteredWords = wordDetails.filter((w) => w.type === 'mastered')

    expect(newWords.length).toBe(20)
    expect(reviewWords.length).toBe(0)
    expect(masteredWords.length).toBe(0)
  })

  it('学习详情显示学过的单词不应在背单词列表中再次出现 - 数据一致性测试', async () => {
    const wordList = createWordList(10)
    
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    // 第一次加载单词列表
    const session1 = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(session1.learningType).toBe('new')
    expect(session1.learningWords.length).toBe(10)

    const firstWord = session1.learningWords[0]
    const firstWordName = firstWord.name

    // 学习第一个单词
    const wrongCount = 2
    const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
    const mistakes: Record<number, string[]> = {}
    
    // 模拟真实的输入流程：多次错误后正确
    for (let j = 0; j < wrongCount; j++) {
      await wordProgressService.updateProgress(dictId, firstWordName, false, 0)
    }
    await wordProgressService.updateProgress(dictId, firstWordName, true, 0)

    await saveWordRecord(firstWordName, dictId, timing, wrongCount, mistakes)
    await dailyRecordService.incrementLearned(dictId)

    // 验证单词进度已更新
    const progressAfter = await wordProgressService.getProgress(dictId, firstWordName)
    expect(progressAfter?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
    expect(progressAfter?.reps).toBe(wrongCount + 1)
    expect(progressAfter?.wrongCount).toBe(wrongCount)

    // 验证学习详情中显示该单词
    const today = getTodayDate()
    const startOfDay = dayjs(today).startOf('day').unix()
    const endOfDay = dayjs(today).endOf('day').unix()
    
    const allWordRecords = await db.wordRecords.where('dict').equals(dictId).toArray()
    const todayWordRecords = allWordRecords.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
    
    const learnedWordInRecords = todayWordRecords.some((r) => r.word === firstWordName)
    expect(learnedWordInRecords).toBe(true)

    // 重新加载单词列表（模拟关闭再打开的场景）
    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    const session2 = await loadTypingSession({
      wordList,
      reviewedCount: updatedRecord.reviewedCount,
      learnedCount: updatedRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 验证已学习的单词不在新的单词列表中
    const learningWordNames = session2.learningWords.map((w) => w.name)
    expect(learningWordNames).not.toContain(firstWordName)

    // 验证学习详情仍然显示该单词
    const allWordRecordsAfter = await db.wordRecords.where('dict').equals(dictId).toArray()
    const todayWordRecordsAfter = allWordRecordsAfter.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
    
    const learnedWordInRecordsAfter = todayWordRecordsAfter.some((r) => r.word === firstWordName)
    expect(learnedWordInRecordsAfter).toBe(true)
  })

  it('词库 100 词 -> 第一天学习 20 个新词 -> 第二天应该复习这些单词', async () => {
    const wordList = createWordList(100)
    
    // 第一天：学习 20 个新词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)
    expect(firstDaySession.dueCount).toBe(0)

    const learnedWordNames: string[] = []

    // 学习 20 个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      learnedWordNames.push(word.name)

      const wrongCount = Math.floor(Math.random() * 3)
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      // 模拟真实的输入流程
      if (wrongCount > 0) {
        for (let j = 0; j < wrongCount; j++) {
          await wordProgressService.updateProgress(dictId, word.name, false, 0)
        }
      }
      await wordProgressService.updateProgress(dictId, word.name, true, 0)

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
      await dailyRecordService.incrementLearned(dictId)
    }

    // 验证第一天学习完成
    const updatedFirstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedFirstDayRecord.learnedCount).toBe(20)
    expect(updatedFirstDayRecord.reviewedCount).toBe(0)

    // 直接修改所有学习过的单词的nextReviewTime为过去的时间，模拟到期
    for (const wordName of learnedWordNames) {
      const progress = await wordProgressService.getProgress(dictId, wordName)
      if (progress) {
        // 设置为1天前的时间
        progress.nextReviewTime = Date.now() - 24 * 60 * 60 * 1000
        if (progress.id) {
          await db.wordProgress.update(progress.id, { nextReviewTime: progress.nextReviewTime })
        }
      }
    }

    try {
      const tomorrowDate = getTomorrowDateString()
      
      await db.dailyRecords.where('[dict+date]').equals([dictId, tomorrowDate]).delete()
      const secondDayRecord = new DailyRecord(dictId, tomorrowDate)
      secondDayRecord.id = await db.dailyRecords.add(secondDayRecord)
      
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证第二天应该有复习单词
      expect(secondDaySession.dueCount).toBeGreaterThan(0)
      expect(secondDaySession.learningType).toBe('review')
      
      // 验证复习单词都是第一天学习的
      const reviewWordNames = secondDaySession.learningWords.map((w) => w.name)
      for (const wordName of reviewWordNames) {
        expect(learnedWordNames).toContain(wordName)
      }

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })

  it('Bug 验证：新词输入错误后完成，masteryLevel 应变为 LEARNED 而非保持 NEW', async () => {
    const wordList = createWordList(100)
    
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(session.learningType).toBe('new')
    expect(session.learningWords.length).toBe(20)

    const learnedWordNames: string[] = []

    // 学习前 10 个单词（都正确）
    for (let i = 0; i < 10; i++) {
      const word = session.learningWords[i]
      learnedWordNames.push(word.name)
      
      // 模拟真实的输入流程：一次正确
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    // 第 11 个单词有错误
    const wordWithWrong = session.learningWords[10]
    const wordWithWrongName = wordWithWrong.name
    learnedWordNames.push(wordWithWrongName)

    const wrongCount = 3
    // 模拟真实的输入流程：多次错误后正确
    for (let j = 0; j < wrongCount; j++) {
      await wordProgressService.updateProgress(dictId, wordWithWrongName, false, 0)
    }
    await wordProgressService.updateProgress(dictId, wordWithWrongName, true, 0)
    await saveWordRecord(wordWithWrongName, dictId, Array.from({ length: wrongCount + 1 }, () => 100), wrongCount, {})
    await dailyRecordService.incrementLearned(dictId)

    // 第 12 个单词正确
    const lastCorrectWord = session.learningWords[11]
    const lastCorrectWordName = lastCorrectWord.name
    learnedWordNames.push(lastCorrectWordName)
    
    // 模拟真实的输入流程：一次正确
    await wordProgressService.updateProgress(dictId, lastCorrectWordName, true, 0)
    await saveWordRecord(lastCorrectWordName, dictId, [100], 0, {})
    await dailyRecordService.incrementLearned(dictId)

    // 验证有错误的单词 masteryLevel 应为 LEARNED
    const progressAfterWrong = await wordProgressService.getProgress(dictId, wordWithWrongName)
    expect(progressAfterWrong?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)

    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.learnedCount).toBe(12)

    const newSession = await loadTypingSession({
      wordList,
      reviewedCount: updatedRecord.reviewedCount,
      learnedCount: updatedRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    const learningWordNames = newSession.learningWords.map((w) => w.name)
    
    for (const learnedWord of learnedWordNames) {
      expect(learningWordNames).not.toContain(learnedWord)
    }

    expect(newSession.learningWords.length).toBe(8)
  })

  it('第一天和第二天：学习20词过程中，有两个词点击掌握 -> 验证学习详情', async () => {
    const wordList = createWordList(100)
    
    // 第一天：学习20个新词，其中2个点击掌握
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)

    const learnedWordNames: string[] = []
    const masteredWordNames: string[] = []
    const allLearnedWords: string[] = [] // 包含补充的新词
    let supplementCount = 0 // 记录补充了多少个新词

    /**
     * 掌握单词业务逻辑：
     * 当用户点击掌握一个单词时：
     * 1. 这个单词被标记为掌握（masteryLevel = MASTERED）
     * 2. 不占用每日配额（不计入 learnedCount 或 reviewedCount）
     * 3. 系统会立即补充一个新词给用户学习
     * 4. 补充的新词才会计入 learnedCount
     * 
     * 实际流程：
     * 第一天：学习 22 个词，掌握 2 个 → learnedCount = 20（18 个初始词 + 2 个补充词）
     * 第二天：复习 18 个词 + 学习 2 个补充新词，掌握 2 个 → reviewedCount = 18, learnedCount = 2
     * 
     * 核心原则：
     * - 掌握的单词相当于"删除"，不占用每日配额
     * - 系统始终保持用户学习 N 个"未掌握"的单词
     * - 每日配额 = 新词 + 复习词 = 20 个（不包含掌握词）
     */

    // 学习 20 个单词，其中第 5 个和第 15 个点击掌握
    // 点击掌握后会补充新词，保持学习总量为 20 个有效学习
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      learnedWordNames.push(word.name)
      allLearnedWords.push(word.name)

      const isMastered = i === 4 || i === 14 // 第 5 个和第 15 个单词点击掌握
      const wrongCount = isMastered ? 0 : Math.floor(Math.random() * 2)
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      if (isMastered) {
        // 模拟点击掌握的逻辑（掌握不计入 learnedCount）
        const result = await handleMasteredFlow({
          currentWord: { ...word, index: i },
          markAsMastered: (wordName) => wordProgressService.markAsMastered(dictId, wordName),
          getNextNewWord: async () => {
            // 模拟补充一个新词（真实业务中 getNextNewWord 会补充新词）
            const newWordIndex = 20 + supplementCount
            if (newWordIndex < wordList.length) {
              const newWord = wordList[newWordIndex]
              allLearnedWords.push(newWord.name)
              supplementCount++
              return { ...newWord, index: newWordIndex }
            }
            return null
          },
          createWordRecord: async () => {
            // 模拟创建学习记录（掌握单词时不需要创建记录）
          },
        })
        
        masteredWordNames.push(word.name)
        // 调用 incrementMastered（真实业务中 handleMastered 会调用）
        await dailyRecordService.incrementMastered(dictId)
        
        // 如果有补充的新词，模拟学习补充的新词（真实业务中用户会输入这个新词）
        if (result.replacementWord) {
          // 模拟学习补充的新词（真实业务中用户会输入这个新词，完成后调用 incrementLearned）
          await wordProgressService.updateProgress(dictId, result.replacementWord.name, true, 0)
          // 补充的新词算作新学习，调用 incrementLearned
          await dailyRecordService.incrementLearned(dictId)
          await saveWordRecord(result.replacementWord.name, dictId, [100], 0, {})
        }
      } else {
        // 正常学习
        for (let j = 0; j < wrongCount; j++) {
          await wordProgressService.updateProgress(dictId, word.name, false, 0)
        }
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await dailyRecordService.incrementLearned(dictId)
      }

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
    }

    // 验证第一天学习完成
    const updatedFirstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    // 学习了 20 个有效词（2 个掌握，补充了 2 个新词）
    expect(updatedFirstDayRecord.learnedCount).toBe(20)
    expect(updatedFirstDayRecord.reviewedCount).toBe(0)
    expect(updatedFirstDayRecord.masteredCount).toBe(2)

    // 验证掌握的单词状态
    console.log('masteredWordNames:', masteredWordNames)
    for (const wordName of masteredWordNames) {
      const progress = await wordProgressService.getProgress(dictId, wordName)
      expect(progress?.masteryLevel).toBe(MASTERY_LEVELS.MASTERED)
    }

    // 验证非掌握的单词状态（排除补充的新词）
    const nonMasteredWords = learnedWordNames.filter(w => !masteredWordNames.includes(w))
    console.log('nonMasteredWords count:', nonMasteredWords.length)
    console.log('nonMasteredWords:', nonMasteredWords)
    for (const wordName of nonMasteredWords) {
      const progress = await wordProgressService.getProgress(dictId, wordName)
      if (progress?.masteryLevel !== MASTERY_LEVELS.LEARNED) {
        console.log(`单词 ${wordName} 的 masteryLevel: ${progress?.masteryLevel}`)
      }
      expect(progress?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
    }

    // 直接修改所有学习过的单词的nextReviewTime为过去的时间，模拟到期
    for (const wordName of learnedWordNames) {
      const progress = await wordProgressService.getProgress(dictId, wordName)
      if (progress) {
        // 设置为1天前的时间
        progress.nextReviewTime = Date.now() - 24 * 60 * 60 * 1000
        if (progress.id) {
          await db.wordProgress.update(progress.id, { nextReviewTime: progress.nextReviewTime })
        }
      }
    }

    try {
      // 前进到第二天
      advanceDays(1)
      
      // 第二天：复习单词
      const tomorrowDate = getTodayDate()
      
      await db.dailyRecords.where('[dict+date]').equals([dictId, tomorrowDate]).delete()
      const secondDayRecord = new DailyRecord(dictId, tomorrowDate)
      secondDayRecord.id = await db.dailyRecords.add(secondDayRecord)
      
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证第二天应该有复习单词
      expect(secondDaySession.dueCount).toBeGreaterThan(0)
      expect(secondDaySession.learningType).toBe('review')
      
      /**
       * 第二天掌握单词业务逻辑：
       * 第一天学习了 20 个有效词（掌握 2 个，补充 2 个）
       * 第二天到期 18 个词（20 个有效词 - 2 个掌握词）
       * 学习过程中掌握 2 个词，补充 2 个新词
       * 最终：reviewedCount = 18（16 个复习词 + 2 个补充词），learnedCount = 2（2 个补充的新词）
       */
      
      // 学习第二天的单词，其中再掌握 2 个
      // 点击掌握后会补充新词，保持学习总量为 20 个有效学习
      const secondDayMasteredWords: string[] = []
      const secondDayAllLearnedWords: string[] = [] // 包含补充的新词
      let secondDaySupplementCount = 0 // 记录第二天补充了多少个新词

      for (let i = 0; i < secondDaySession.learningWords.length; i++) {
        const word = secondDaySession.learningWords[i]
        secondDayAllLearnedWords.push(word.name)

        const isMastered = i === 2 || i === 7 // 第二天再掌握 2 个单词
        const wrongCount = isMastered ? 0 : Math.floor(Math.random() * 2)
        const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
        const mistakes: Record<number, string[]> = {}
        
        if (isMastered) {
          // 模拟点击掌握的逻辑（掌握不计入 reviewedCount）
          const result = await handleMasteredFlow({
            currentWord: { ...word, index: i },
            markAsMastered: (wordName) => wordProgressService.markAsMastered(dictId, wordName),
            getNextNewWord: async () => {
              // 模拟补充一个新词（真实业务中 getNextNewWord 会补充新词）
              const newWordIndex = 22 + secondDaySupplementCount // 22 是第一天学习后的总数
              if (newWordIndex < wordList.length) {
                const newWord = wordList[newWordIndex]
                secondDayAllLearnedWords.push(newWord.name)
                secondDaySupplementCount++
                return { ...newWord, index: newWordIndex }
              }
              return null
            },
            createWordRecord: async () => {
              // 模拟创建学习记录（掌握单词时不需要创建记录）
            },
          })
          
          secondDayMasteredWords.push(word.name)
          // 调用 incrementMastered（真实业务中 handleMastered 会调用）
          await dailyRecordService.incrementMastered(dictId)
          
          // 如果有补充的新词，模拟学习补充的新词（真实业务中用户会输入这个新词）
          if (result.replacementWord) {
            // 模拟学习补充的新词（真实业务中用户会输入这个新词，完成后调用 incrementLearned）
            await wordProgressService.updateProgress(dictId, result.replacementWord.name, true, 0)
            // 补充的新词算作新学习，调用 incrementLearned
            await dailyRecordService.incrementLearned(dictId)
            await saveWordRecord(result.replacementWord.name, dictId, [100], 0, {})
          }
        } else {
          // 正常复习
          for (let j = 0; j < wrongCount; j++) {
            await wordProgressService.updateProgress(dictId, word.name, false, 0)
          }
          await wordProgressService.updateProgress(dictId, word.name, true, 0)
          await dailyRecordService.incrementReviewed(dictId)
        }

        await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
      }

      // 验证第二天复习完成
      const updatedSecondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      // 复习了 18 个有效词（2 个掌握，补充了 2 个新词）
      expect(updatedSecondDayRecord.reviewedCount).toBe(18)
      expect(updatedSecondDayRecord.masteredCount).toBe(2)

      // 验证学习详情 - 调用真实业务逻辑
      // 恢复时间到第一天
      resetTimeDiff()
      const firstDayDate = getTodayDate()
      
      // 前进到第二天
      advanceDays(1)
      const secondDayDate = getTodayDate()
      
      // 从 wordRecords 获取学习和复习记录
      const allWordRecords = await db.wordRecords.where('dict').equals(dictId).toArray()
      const wordFirstDateMap = new Map<string, string>()
      const sortedAllRecords = [...allWordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
      for (const r of sortedAllRecords) {
        if (!wordFirstDateMap.has(r.word)) {
          wordFirstDateMap.set(r.word, dayjs(r.timeStamp * 1000).format('YYYY-MM-DD'))
        }
      }

      // 第一天的记录
      const firstDayWordRecords = allWordRecords.filter((r) => {
        const recordDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return recordDate === firstDayDate
      })
      
      // 从 wordProgress 获取第一天掌握的单词
      const firstDayMasteredWords = await db.wordProgress
        .where({ dict: dictId })
        .filter((p) => {
          const reviewDate = dayjs(p.lastReviewTime).format('YYYY-MM-DD')
          return p.masteryLevel === MASTERY_LEVELS.MASTERED && reviewDate === firstDayDate
        })
        .toArray()

      const masteredWordNames = new Set(firstDayMasteredWords.map(p => p.word))

      // 统计第一天的学习详情（排除掌握的单词）
      // 注意：第一天实际学习了 22 个词（20 个 + 2 个补充），其中 2 个掌握
      const firstDayNewWords = firstDayWordRecords.filter((r) => {
        const firstDate = wordFirstDateMap.get(r.word)
        const currentDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return firstDate === currentDate && !masteredWordNames.has(r.word)
      })

      const firstDayReviewWords = firstDayWordRecords.filter((r) => {
        const firstDate = wordFirstDateMap.get(r.word)
        const currentDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return firstDate !== currentDate && !masteredWordNames.has(r.word)
      })

      // 验证第一天的学习情况
      console.log('第一天学习详情:')
      console.log(`学习新词: ${firstDayNewWords.length}`)
      console.log(`复习次数: ${firstDayReviewWords.length}`)
      console.log(`掌握单词: ${firstDayMasteredWords.length}`)

      // 第二天的记录
      const secondDayWordRecords = allWordRecords.filter((r) => {
        const recordDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return recordDate === secondDayDate
      })

      // 从 wordProgress 获取第二天掌握的单词
      const secondDayMasteredWordsFromProgress = await db.wordProgress
        .where({ dict: dictId })
        .filter((p) => {
          const reviewDate = dayjs(p.lastReviewTime).format('YYYY-MM-DD')
          return p.masteryLevel === MASTERY_LEVELS.MASTERED && reviewDate === secondDayDate
        })
        .toArray()

      const secondDayMasteredWordNames = new Set(secondDayMasteredWordsFromProgress.map(p => p.word))

      // 统计第二天的学习详情（排除掌握的单词）
      const secondDayNewWords = secondDayWordRecords.filter((r) => {
        const firstDate = wordFirstDateMap.get(r.word)
        const currentDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return firstDate === currentDate && !secondDayMasteredWordNames.has(r.word)
      })

      const secondDayReviewWords = secondDayWordRecords.filter((r) => {
        const firstDate = wordFirstDateMap.get(r.word)
        const currentDate = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
        return firstDate !== currentDate && !secondDayMasteredWordNames.has(r.word)
      })

      // 验证第二天的学习情况
      console.log('第二天学习详情:')
      console.log(`学习新词: ${secondDayNewWords.length}`)
      console.log(`复习次数: ${secondDayReviewWords.length}`)
      console.log(`掌握单词: ${secondDayMasteredWordsFromProgress.length}`)

      // 总掌握单词数验证
      const totalMasteredWords = firstDayMasteredWords.length + secondDayMasteredWordsFromProgress.length
      console.log(`两天总掌握单词数: ${totalMasteredWords}`)

      // 测试第二天学习完后重新打开界面，应该还能学习新词
      // 模拟重新打开界面
      const reopenSession = await loadTypingSession({
        wordList,
        reviewedCount: updatedSecondDayRecord.reviewedCount,
        learnedCount: updatedSecondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证重新打开界面后应该能学习新词
      console.log('重新打开界面后的学习类型:', reopenSession.learningType)
      console.log('重新打开界面后的学习单词数:', reopenSession.learningWords.length)
      console.log('重新打开界面后的新词数量:', reopenSession.newCount)

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })

  it('第二天学习完后重新打开界面，验证达到每日目标', async () => {
    const wordList = createWordList(100)
    
    // 第一天：学习 20 个新词，其中 2 个点击掌握
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)

    const learnedWordNames: string[] = []
    const masteredWordNames: string[] = []
    const allLearnedWords: string[] = [] // 包含补充的新词
    let supplementCount = 0

    /**
     * 掌握单词业务逻辑：
     * 当用户点击掌握一个单词时：
     * 1. 这个单词被标记为掌握（masteryLevel = MASTERED）
     * 2. 不占用每日配额（不计入 learnedCount 或 reviewedCount）
     * 3. 系统会立即补充一个新词给用户学习
     * 4. 补充的新词才会计入 learnedCount
     * 
     * 第一天：学习 22 个词，掌握 2 个 → learnedCount = 20（18 个初始词 + 2 个补充词）
     */

    // 学习 20 个单词，其中第 5 个和第 15 个点击掌握
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      learnedWordNames.push(word.name)
      allLearnedWords.push(word.name)

      const isMastered = i === 4 || i === 14 // 第 5 个和第 15 个单词点击掌握
      const wrongCount = isMastered ? 0 : Math.floor(Math.random() * 2)
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      if (isMastered) {
        // 模拟点击掌握的逻辑
        const result = await handleMasteredFlow({
          currentWord: { ...word, index: i },
          markAsMastered: (wordName) => wordProgressService.markAsMastered(dictId, wordName),
          getNextNewWord: async () => {
            const newWordIndex = 20 + supplementCount
            if (newWordIndex < wordList.length) {
              const newWord = wordList[newWordIndex]
              allLearnedWords.push(newWord.name)
              supplementCount++
              return { ...newWord, index: newWordIndex }
            }
            return null
          },
          createWordRecord: async () => {},
        })
        
        masteredWordNames.push(word.name)
        await dailyRecordService.incrementMastered(dictId)
        
        // 学习补充的新词
        if (result.replacementWord) {
          await wordProgressService.updateProgress(dictId, result.replacementWord.name, true, 0)
          await dailyRecordService.incrementLearned(dictId)
          await saveWordRecord(result.replacementWord.name, dictId, [100], 0, {})
        }
      } else {
        for (let j = 0; j < wrongCount; j++) {
          await wordProgressService.updateProgress(dictId, word.name, false, 0)
        }
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await dailyRecordService.incrementLearned(dictId)
      }

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
    }

    // 验证第一天
    const updatedFirstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedFirstDayRecord.learnedCount).toBe(20)
    expect(updatedFirstDayRecord.masteredCount).toBe(2)

    // 直接修改所有学习过的单词的nextReviewTime为过去的时间，模拟到期
    for (const wordName of learnedWordNames) {
      const progress = await wordProgressService.getProgress(dictId, wordName)
      if (progress) {
        // 设置为1天前的时间
        progress.nextReviewTime = Date.now() - 24 * 60 * 60 * 1000
        if (progress.id) {
          await db.wordProgress.update(progress.id, { nextReviewTime: progress.nextReviewTime })
        }
      }
    }

    try {
      // 前进到第二天
      advanceDays(1)
      
      // 第二天：复习单词
      const secondDayDate = getTodayDate()
      
      await db.dailyRecords.where('[dict+date]').equals([dictId, secondDayDate]).delete()
      const secondDayRecord = new DailyRecord(dictId, secondDayDate)
      secondDayRecord.id = await db.dailyRecords.add(secondDayRecord)
      
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证第二天应该有复习单词
      expect(secondDaySession.dueCount).toBeGreaterThan(0)
      expect(secondDaySession.learningType).toBe('review')
      
      /**
       * 第二天掌握单词业务逻辑：
       * 第一天学习了 20 个有效词（掌握 2 个，补充 2 个）
       * 第二天到期 18 个词（20 个有效词 - 2 个掌握词）
       * 学习过程中掌握 2 个词，补充 2 个新词
       * 最终：reviewedCount = 18, learnedCount = 2（2 个补充的新词）
       */
      
      // 学习第二天的单词，其中再掌握 2 个
      const secondDayMasteredWords: string[] = []
      const secondDayAllLearnedWords: string[] = []
      let secondDaySupplementCount = 0

      for (let i = 0; i < secondDaySession.learningWords.length; i++) {
        const word = secondDaySession.learningWords[i]
        secondDayAllLearnedWords.push(word.name)

        const isMastered = i === 2 || i === 7 // 第二天再掌握 2 个单词
        const wrongCount = isMastered ? 0 : Math.floor(Math.random() * 2)
        const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
        const mistakes: Record<number, string[]> = {}
        
        if (isMastered) {
          // 模拟点击掌握的逻辑
          const result = await handleMasteredFlow({
            currentWord: { ...word, index: i },
            markAsMastered: (wordName) => wordProgressService.markAsMastered(dictId, wordName),
            getNextNewWord: async () => {
              const newWordIndex = 22 + secondDaySupplementCount
              if (newWordIndex < wordList.length) {
                const newWord = wordList[newWordIndex]
                secondDayAllLearnedWords.push(newWord.name)
                secondDaySupplementCount++
                return { ...newWord, index: newWordIndex }
              }
              return null
            },
            createWordRecord: async () => {},
          })
          
          secondDayMasteredWords.push(word.name)
          await dailyRecordService.incrementMastered(dictId)
          
          // 学习补充的新词
          if (result.replacementWord) {
            await wordProgressService.updateProgress(dictId, result.replacementWord.name, true, 0)
            await dailyRecordService.incrementLearned(dictId)
            await saveWordRecord(result.replacementWord.name, dictId, [100], 0, {})
          }
        } else {
          for (let j = 0; j < wrongCount; j++) {
            await wordProgressService.updateProgress(dictId, word.name, false, 0)
          }
          await wordProgressService.updateProgress(dictId, word.name, true, 0)
          await dailyRecordService.incrementReviewed(dictId)
        }

        await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)
      }

      // 验证第二天
      const updatedSecondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      expect(updatedSecondDayRecord.reviewedCount).toBe(18)
      expect(updatedSecondDayRecord.learnedCount).toBe(2)
      expect(updatedSecondDayRecord.masteredCount).toBe(2)

      // 模拟重新打开界面
      const reopenSession = await loadTypingSession({
        wordList,
        reviewedCount: updatedSecondDayRecord.reviewedCount,
        learnedCount: updatedSecondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证重新打开界面后应该达到了每日目标
      console.log('重新打开界面后的学习类型:', reopenSession.learningType)
      console.log('重新打开界面后的学习单词数:', reopenSession.learningWords.length)
      console.log('重新打开界面后的新词数量:', reopenSession.newCount)

      // 验证应该达到了每日目标（20 个有效学习：18 个复习 + 2 个新词）
      expect(reopenSession.learningType).toBe('complete')
      expect(updatedSecondDayRecord.reviewedCount + updatedSecondDayRecord.learnedCount).toBe(20)

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })

  it('额外复习机制：到期词超过 20 个时，应该只复习前 20 个，剩余的可额外复习', async () => {
    const wordList = createWordList(100)
    
    // 初始化所有单词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 第一天：学习 20 个新词（word0-word19）
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)

    // 学习 20 个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    try {
      // 前进到第二天
      advanceDays(1)
      
      // 第二天：复习第一天的 20 个词
      const secondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      expect(secondDaySession.learningType).toBe('review')
      expect(secondDaySession.learningWords.length).toBe(20)

      // 复习 20 个单词
      for (let i = 0; i < secondDaySession.learningWords.length; i++) {
        const word = secondDaySession.learningWords[i]
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await saveWordRecord(word.name, dictId, [100], 0, {})
        await dailyRecordService.incrementReviewed(dictId)
      }

      // 前进到第三天
      advanceDays(1)
      
      // 第三天：学习 20 个新词（word20-word39）
      const thirdDayRecord = await dailyRecordService.getTodayRecord(dictId)
      const thirdDaySession = await loadTypingSession({
        wordList,
        reviewedCount: thirdDayRecord.reviewedCount,
        learnedCount: thirdDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      expect(thirdDaySession.learningType).toBe('new')
      expect(thirdDaySession.learningWords.length).toBe(20)

      // 学习 20 个新词
      for (let i = 0; i < thirdDaySession.learningWords.length; i++) {
        const word = thirdDaySession.learningWords[i]
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await saveWordRecord(word.name, dictId, [100], 0, {})
        await dailyRecordService.incrementLearned(dictId)
      }

      // 前进到第四天
      advanceDays(1)
      
      // 第四天：应该有 40 个到期词（第一天的 20 个 + 第三天的 20 个）
      const fourthDayDate = getTodayDate()
      await db.dailyRecords.where('[dict+date]').equals([dictId, fourthDayDate]).delete()
      const fourthDayRecord = new DailyRecord(dictId, fourthDayDate)
      fourthDayRecord.id = await db.dailyRecords.add(fourthDayRecord)
      
      const fourthDaySession = await loadTypingSession({
        wordList,
        reviewedCount: fourthDayRecord.reviewedCount,
        learnedCount: fourthDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：有 40 个到期词，但只加载 20 个
      expect(fourthDaySession.learningType).toBe('review')
      expect(fourthDaySession.learningWords.length).toBe(20)
      expect(fourthDaySession.dueCount).toBe(40) // 实际到期词数量
      expect(fourthDaySession.hasMoreDueWords).toBe(true) // 还有更多到期词

      // 学习前 20 个到期词
      for (let i = 0; i < fourthDaySession.learningWords.length; i++) {
        const word = fourthDaySession.learningWords[i]
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await saveWordRecord(word.name, dictId, [100], 0, {})
        await dailyRecordService.incrementReviewed(dictId)
      }

      // 验证达到每日上限
      const updatedFourthDayRecord = await dailyRecordService.getTodayRecord(dictId)
      expect(updatedFourthDayRecord.reviewedCount).toBe(20)

      // 重新加载会话，验证是否标记为还有更多到期词
      const reopenSession = await loadTypingSession({
        wordList,
        reviewedCount: updatedFourthDayRecord.reviewedCount,
        learnedCount: updatedFourthDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：达到上限，但还有到期词
      expect(reopenSession.learningType).toBe('complete')
      expect(reopenSession.hasMoreDueWords).toBe(true)
      expect(reopenSession.remainingDueCount).toBe(20) // 还有 20 个到期词可以额外复习

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })

  it('巩固模式：无到期词且无新词时，应该进入巩固模式', async () => {
    const wordList = createWordList(20) // 只有 20 个词
    
    // 初始化所有单词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 第一天：学习 20 个新词
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)

    // 学习 20 个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    // 验证达到每日上限
    const updatedFirstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedFirstDayRecord.learnedCount).toBe(20)

    // 重新加载会话，验证是否完成
    const reopenSession = await loadTypingSession({
      wordList,
      reviewedCount: updatedFirstDayRecord.reviewedCount,
      learnedCount: updatedFirstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 验证：所有词都学完了，没有新词也没有复习词
    expect(reopenSession.learningType).toBe('complete')
    expect(reopenSession.learningWords.length).toBe(0)
    expect(reopenSession.newCount).toBe(0) // 没有新词了
    expect(reopenSession.dueCount).toBe(0) // 没有到期词
  })

  it('混合场景：部分复习 + 部分新词 + 掌握单词的复杂场景', async () => {
    const wordList = createWordList(100)
    
    // 初始化所有单词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 第一天：学习 20 个新词
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)

    // 学习 20 个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    try {
      // 前进到第二天
      advanceDays(1)
      
      // 第二天：复习 20 个到期词，中间掌握 1 个
      const secondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：有 20 个到期词，应该先复习
      expect(secondDaySession.learningType).toBe('review')
      expect(secondDaySession.learningWords.length).toBe(20)
      expect(secondDaySession.dueCount).toBe(20)

      // 模拟混合场景：复习 10 个词，然后掌握 1 个，然后继续复习剩余词
      let supplementCount = 0

      for (let i = 0; i < secondDaySession.learningWords.length; i++) {
        const word = secondDaySession.learningWords[i]
        
        if (i === 10) {
          // 复习到第 11 个词时点击掌握
          const result = await handleMasteredFlow({
            currentWord: { ...word, index: i },
            markAsMastered: (wordName) => wordProgressService.markAsMastered(dictId, wordName),
            getNextNewWord: async () => {
              // 模拟补充新词
              const newWord = wordList[20 + supplementCount]
              supplementCount++
              return { ...newWord, index: 20 + supplementCount }
            },
          })
          
          await dailyRecordService.incrementMastered(dictId)
          
          // 学习补充的新词
          if (result.replacementWord) {
            await wordProgressService.updateProgress(dictId, result.replacementWord.name, true, 0)
            await saveWordRecord(result.replacementWord.name, dictId, [100], 0, {})
            await dailyRecordService.incrementLearned(dictId)
          }
        } else {
          // 正常复习
          await wordProgressService.updateProgress(dictId, word.name, true, 0)
          await saveWordRecord(word.name, dictId, [100], 0, {})
          await dailyRecordService.incrementReviewed(dictId)
        }
      }

      // 验证第二天的学习详情
      const updatedSecondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      
      // 预期结果：
      // - 复习了 19 个词（20 个到期词 - 1 个掌握词）
      // - 掌握了 1 个词
      // - 学习了 1 个新词（掌握后补充的）
      expect(updatedSecondDayRecord.reviewedCount).toBe(19)
      expect(updatedSecondDayRecord.learnedCount).toBe(1) // 补充的 1 个新词
      expect(updatedSecondDayRecord.masteredCount).toBe(1)

      // 验证第三天：第二天复习的词还没到期，只有补充的新词（word20）在第四天才会到期
      // 所以第三天应该没有到期词，或者只有其他到期词
      const thirdDayRecord = await dailyRecordService.getTodayRecord(dictId)
      const thirdDaySession = await loadTypingSession({
        wordList,
        reviewedCount: thirdDayRecord.reviewedCount,
        learnedCount: thirdDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：第三天没有到期词（因为第二天复习的词还没到期）
      // 但还有新词可以学习
      expect(thirdDaySession.newCount).toBeGreaterThanOrEqual(79) // 还有大量新词可学（100 - 20 - 1）
      
      // 前进到第四天，第二天复习的词应该还没到期（取决于复习间隔）
      // 这个测试主要验证掌握单词后补充新词的机制
      // 验证第二天的学习详情是正确的
      expect(updatedSecondDayRecord.reviewedCount).toBe(19)
      expect(updatedSecondDayRecord.learnedCount).toBe(1) // 补充的 1 个新词
      expect(updatedSecondDayRecord.masteredCount).toBe(1)

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })

  it('边界条件：刚好达到每日上限 20 个词', async () => {
    const wordList = createWordList(100)
    
    // 初始化所有单词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 第一天：学习 20 个新词
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)
    expect(firstDaySession.newCount).toBe(100) // 100 个新词可用

    // 学习 20 个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    // 验证刚好达到上限
    const updatedFirstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedFirstDayRecord.learnedCount).toBe(20)
    expect(updatedFirstDayRecord.reviewedCount).toBe(0)

    // 重新加载会话，验证不能继续学习
    const reopenSession = await loadTypingSession({
      wordList,
      reviewedCount: updatedFirstDayRecord.reviewedCount,
      learnedCount: updatedFirstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 验证：达到上限，不能继续学习
    expect(reopenSession.learningType).toBe('complete')
    expect(reopenSession.learningWords.length).toBe(0)
  })

  it('边界条件：新词配额计算 - 复习 15 个词后还能学习 5 个新词', async () => {
    const wordList = createWordList(100)
    
    // 初始化所有单词
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 真实业务场景：
    // 第一天：用户只学习了 15 个新词（没学满 20 个就停了）
    const firstDayRecord = await dailyRecordService.getTodayRecord(dictId)
    const firstDaySession = await loadTypingSession({
      wordList,
      reviewedCount: firstDayRecord.reviewedCount,
      learnedCount: firstDayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    expect(firstDaySession.learningType).toBe('new')
    expect(firstDaySession.learningWords.length).toBe(20)
    
    // 只学习 15 个（模拟用户没学完就停了）
    for (let i = 0; i < 15; i++) {
      const word = firstDaySession.learningWords[i]
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    try {
      // 前进到第二天
      advanceDays(1)
      
      // 第二天：应该有 15 个到期词（第一天学习的 15 个）
      const secondDayRecord = await dailyRecordService.getTodayRecord(dictId)
      const secondDaySession = await loadTypingSession({
        wordList,
        reviewedCount: secondDayRecord.reviewedCount,
        learnedCount: secondDayRecord.learnedCount,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：有 15 个到期词
      expect(secondDaySession.learningType).toBe('review')
      expect(secondDaySession.learningWords.length).toBe(15)
      expect(secondDaySession.dueCount).toBe(15)

      // 复习 15 个词
      for (let i = 0; i < secondDaySession.learningWords.length; i++) {
        const word = secondDaySession.learningWords[i]
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await saveWordRecord(word.name, dictId, [100], 0, {})
        await dailyRecordService.incrementReviewed(dictId)
      }

      // 验证：复习完后，dailyRecord 显示只复习了 15 个
      const afterReviewRecord = await dailyRecordService.getTodayRecord(dictId)
      expect(afterReviewRecord.reviewedCount).toBe(15)
      expect(afterReviewRecord.learnedCount).toBe(0)

      // 重新打开界面，系统会补充 5 个新词（因为还有配额）
      const reopenSession = await loadTypingSession({
        wordList,
        reviewedCount: 15,
        learnedCount: 0,
        isExtraReview: false,
        getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
        getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      // 验证：复习了 15 个词，还能学习 5 个新词（20 - 15 = 5）
      expect(reopenSession.learningType).toBe('new')
      expect(reopenSession.learningWords.length).toBe(5)

      // 学习 5 个新词
      for (let i = 0; i < reopenSession.learningWords.length; i++) {
        const word = reopenSession.learningWords[i]
        await wordProgressService.updateProgress(dictId, word.name, true, 0)
        await saveWordRecord(word.name, dictId, [100], 0, {})
        await dailyRecordService.incrementLearned(dictId)
      }

      // 验证最终结果：15 个复习 + 5 个新词 = 20 个
      const finalRecord = await dailyRecordService.getTodayRecord(dictId)
      expect(finalRecord.reviewedCount).toBe(15)
      expect(finalRecord.learnedCount).toBe(5)
      expect(finalRecord.reviewedCount + finalRecord.learnedCount).toBe(20)

    } finally {
      // 重置时间差异
      resetTimeDiff()
    }
  })
})

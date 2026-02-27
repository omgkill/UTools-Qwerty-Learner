import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MASTERY_LEVELS, getTodayDate, DailyRecord } from '@/utils/db/progress'
import type { Word } from '@/typings'
import { WordRecord } from '@/utils/db/record'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, loadTypingSession } from '@/services'
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

  it('词库100词 -> 第一天背20个新词 -> 中间多次输入失败 -> 预期：都是新词，学了20个新词，没有复习词', async () => {
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
      
      await wordProgressService.updateProgress(dictId, word.name, true, wrongCount)

      await saveWordRecord(word.name, dictId, timing, wrongCount, mistakes)

      const progressAfter = await wordProgressService.getProgress(dictId, word.name)
      expect(progressAfter?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progressAfter?.reps).toBe(1)
      expect(progressAfter?.wrongCount).toBe(0)

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
      expect(progress.reps).toBe(1)
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

  it('词库100词 -> 第一天背20个新词 -> 每个单词都正确输入 -> 预期：都是新词，学了20个新词，没有复习词', async () => {
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
      
      await wordProgressService.updateProgress(dictId, word.name, true, 0)

      await saveWordRecord(word.name, dictId, timing, 0, mistakes)

      const progressAfter = await wordProgressService.getProgress(dictId, word.name)
      expect(progressAfter?.masteryLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(progressAfter?.reps).toBe(1)
      expect(progressAfter?.wrongCount).toBe(0)

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

  it('词库100词 -> 第一天背20个新词 -> 部分单词错误输入后正确 -> 预期：都是新词，学了20个新词，没有复习词', async () => {
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
      
      await wordProgressService.updateProgress(dictId, word.name, true, wrongCount)

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
      expect(progress.reps).toBe(1)
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

  it('词库100词 -> 第一天学习20个新词 -> 第二天应该复习这些单词', async () => {
    const wordList = createWordList(100)
    
    // 第一天：学习20个新词
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

    // 学习20个单词
    for (let i = 0; i < firstDaySession.learningWords.length; i++) {
      const word = firstDaySession.learningWords[i]
      learnedWordNames.push(word.name)

      const wrongCount = Math.floor(Math.random() * 3)
      const timing = Array.from({ length: wrongCount + 1 }, () => Math.floor(Math.random() * 500) + 100)
      const mistakes: Record<number, string[]> = {}
      
      for (let j = 0; j < wrongCount; j++) {
        await wordProgressService.updateProgress(dictId, word.name, false, 0)
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

  it('Bug验证：新词输入错误后完成，masteryLevel应变为LEARNED而非保持NEW', async () => {
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

    for (let i = 0; i < 10; i++) {
      const word = session.learningWords[i]
      learnedWordNames.push(word.name)
      
      await wordProgressService.updateProgress(dictId, word.name, true, 0)
      await saveWordRecord(word.name, dictId, [100], 0, {})
      await dailyRecordService.incrementLearned(dictId)
    }

    const wordWithWrong = session.learningWords[10]
    const wordWithWrongName = wordWithWrong.name
    learnedWordNames.push(wordWithWrongName)

    const wrongCount = 3
    await wordProgressService.updateProgress(dictId, wordWithWrongName, true, wrongCount)
    await saveWordRecord(wordWithWrongName, dictId, Array.from({ length: wrongCount + 1 }, () => 100), wrongCount, {})
    await dailyRecordService.incrementLearned(dictId)

    const lastCorrectWord = session.learningWords[11]
    const lastCorrectWordName = lastCorrectWord.name
    learnedWordNames.push(lastCorrectWordName)
    
    await wordProgressService.updateProgress(dictId, lastCorrectWordName, true, 0)
    await saveWordRecord(lastCorrectWordName, dictId, [100], 0, {})
    await dailyRecordService.incrementLearned(dictId)

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
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LearningService } from './LearningService'
import { MockProgressRepository } from '../repositories/implementations/MockProgressRepository'
import { MockDailyRecordRepository } from '../repositories/implementations/MockDailyRecordRepository'
import type { WordProgress, MasteryLevel } from '../types/learning'

/**
 * 创建测试用的进度数据
 */
function createTestProgress(dictId: string, word: string, options: {
  masteryLevel?: MasteryLevel
  nextReviewTime?: number
} = {}): WordProgress {
  return {
    word,
    dictId,
    masteryLevel: options.masteryLevel ?? 0,
    nextReviewTime: options.nextReviewTime ?? 0,
  }
}

describe('LearningService', () => {
  let progressRepo: MockProgressRepository
  let dailyRecordRepo: MockDailyRecordRepository
  let service: LearningService
  const dictId = 'test-dict'
  const wordList = ['apple', 'banana', 'cherry', 'dog', 'elephant', 'fish', 'grape', 'house', 'ice', 'jungle']

  beforeEach(() => {
    progressRepo = new MockProgressRepository()
    dailyRecordRepo = new MockDailyRecordRepository()
    service = new LearningService(progressRepo, dailyRecordRepo)
  })

  afterEach(() => {
    progressRepo.clearAll()
    dailyRecordRepo.clearAll()
  })

  /**
   * 场景 1：首次打开，无进度
   * 期望：返回 dailyLimit 个新词
   */
  describe('场景 1：首次打开应用', () => {
    it('无进度时，返回 20 个新词', () => {
      const dailyLimit = 20
      const longWordList = Array.from({ length: 100 }, (_, i) => `word${i}`)

      const result = service.getTodayWords(dictId, longWordList, dailyLimit)

      expect(result.words.length).toBe(20)
      expect(result.learningType).toBe('new')
      expect(result.stats.todayLearned).toBe(0)
      expect(result.stats.todayReviewed).toBe(0)
      expect(result.stats.newCount).toBe(100)
    })

    it('新词不足时，返回所有新词', () => {
      const dailyLimit = 20

      const result = service.getTodayWords(dictId, wordList, dailyLimit)

      expect(result.words.length).toBe(10) // 只有 10 个词
      expect(result.learningType).toBe('new')
    })

    it('无新词时，返回完成状态', () => {
      // 所有词都已掌握
      for (const word of wordList) {
        progressRepo.set(dictId, word, createTestProgress(dictId, word, { masteryLevel: 7 }))
      }

      const result = service.getTodayWords(dictId, wordList, 20)

      expect(result.words.length).toBe(0)
      expect(result.learningType).toBe('complete')
    })
  })

  /**
   * 场景 2：今日已学部分
   * 期望：返回剩余配额数量的单词
   */
  describe('场景 2：今日已学部分单词', () => {
    it('今日已学 10 个，上限 20，返回 10 个', () => {
      // 设置今日已学记录
      dailyRecordRepo.set(dictId, getTodayDate(), {
        dictId,
        date: getTodayDate(),
        learnedCount: 10,
        reviewedCount: 0,
        masteredCount: 0,
        todayWords: wordList.slice(0, 10),
        wordTypes: {},
      })

      const longWordList = Array.from({ length: 100 }, (_, i) => `word${i}`)
      const result = service.getTodayWords(dictId, longWordList, 20)

      expect(result.words.length).toBe(10)
      expect(result.stats.todayLearned).toBe(10)
    })

    it('今日已学 15 个复习 + 5 个新学，上限 20，返回完成状态', () => {
      dailyRecordRepo.set(dictId, getTodayDate(), {
        dictId,
        date: getTodayDate(),
        learnedCount: 5,
        reviewedCount: 15,
        masteredCount: 0,
        todayWords: wordList,
        wordTypes: {},
      })

      const result = service.getTodayWords(dictId, wordList, 20)

      expect(result.words.length).toBe(0)
      expect(result.learningType).toBe('complete')
    })
  })

  /**
   * 场景 3：有到期词
   * 期望：到期词优先，剩余配额给新词
   */
  describe('场景 3：有到期词', () => {
    it('到期词 5 个，上限 20，返回 5 到期词 + 15 新词', () => {
      const longWordList = Array.from({ length: 100 }, (_, i) => `word${i}`)

      // 设置 5 个到期词
      const now = Date.now()
      for (let i = 0; i < 5; i++) {
        progressRepo.set(dictId, `word${i}`, createTestProgress(dictId, `word${i}`, {
          masteryLevel: 1,
          nextReviewTime: now - 1000, // 已到期
        }))
      }

      const result = service.getTodayWords(dictId, longWordList, 20)

      expect(result.words.length).toBe(20)
      expect(result.learningType).toBe('review')
      // 前 5 个应该是到期词
      expect(result.words.slice(0, 5)).toEqual(['word0', 'word1', 'word2', 'word3', 'word4'])
    })

    it('到期词 25 个，上限 20，只返回 20 个到期词', () => {
      const longWordList = Array.from({ length: 100 }, (_, i) => `word${i}`)
      const now = Date.now()

      // 设置 25 个到期词
      for (let i = 0; i < 25; i++) {
        progressRepo.set(dictId, `word${i}`, createTestProgress(dictId, `word${i}`, {
          masteryLevel: 2,
          nextReviewTime: now - 1000,
        }))
      }

      const result = service.getTodayWords(dictId, longWordList, 20)

      expect(result.words.length).toBe(20)
      expect(result.learningType).toBe('review')
      expect(result.stats.dueCount).toBe(25)
    })

    it('到期词 3 个 + 今日已学 15，返回 3 到期词 + 2 新词', () => {
      const longWordList = Array.from({ length: 100 }, (_, i) => `word${i}`)
      const now = Date.now()

      // 设置今日已学 15 个
      dailyRecordRepo.set(dictId, getTodayDate(), {
        dictId,
        date: getTodayDate(),
        learnedCount: 10,
        reviewedCount: 5,
        masteredCount: 0,
        todayWords: [],
        wordTypes: {},
      })

      // 设置 3 个到期词
      for (let i = 0; i < 3; i++) {
        progressRepo.set(dictId, `word${i}`, createTestProgress(dictId, `word${i}`, {
          masteryLevel: 1,
          nextReviewTime: now - 1000,
        }))
      }

      const result = service.getTodayWords(dictId, longWordList, 20)

      expect(result.words.length).toBe(5)
      expect(result.words.slice(0, 3)).toEqual(['word0', 'word1', 'word2'])
      expect(result.learningType).toBe('review')
    })
  })

  /**
   * 场景 4：完成单词
   * 期望：升级等级、更新记录、判断是否完成
   */
  describe('场景 4：完成单词', () => {
    it('完成新词，masteryLevel 从 0 变为 1', () => {
      const result = service.completeWord(dictId, 'apple', wordList, 20, ['apple'])

      expect(result.progress.masteryLevel).toBe(1)
      expect(result.progress.nextReviewTime).toBeGreaterThan(0)
      expect(result.dailyRecord.learnedCount).toBe(1)
      expect(result.dailyRecord.reviewedCount).toBe(0)
      expect(result.sessionComplete).toBe(false)
    })

    it('完成复习词，masteryLevel 升级', () => {
      // 设置已有进度
      progressRepo.set(dictId, 'apple', createTestProgress(dictId, 'apple', {
        masteryLevel: 2,
        nextReviewTime: Date.now() - 1000,
      }))

      const result = service.completeWord(dictId, 'apple', wordList, 20, ['apple'])

      expect(result.progress.masteryLevel).toBe(3)
      expect(result.dailyRecord.reviewedCount).toBe(1)
      expect(result.dailyRecord.learnedCount).toBe(0)
    })

    it('达到上限后，sessionComplete 为 true', () => {
      // 今日已学 19 个
      dailyRecordRepo.set(dictId, getTodayDate(), {
        dictId,
        date: getTodayDate(),
        learnedCount: 19,
        reviewedCount: 0,
        masteredCount: 0,
        todayWords: [],
        wordTypes: {},
      })

      const result = service.completeWord(dictId, 'apple', wordList, 20, ['apple'])

      expect(result.sessionComplete).toBe(true)
    })

    it('达到 masteryLevel 7 时，masteredCount 增加', () => {
      // 设置 masteryLevel=6
      progressRepo.set(dictId, 'apple', createTestProgress(dictId, 'apple', {
        masteryLevel: 6,
        nextReviewTime: Date.now() - 1000,
      }))

      const result = service.completeWord(dictId, 'apple', wordList, 20, ['apple'])

      expect(result.progress.masteryLevel).toBe(7)
      expect(result.dailyRecord.masteredCount).toBe(1)
    })
  })

  /**
   * 场景 5：统计数据
   */
  describe('场景 5：统计数据', () => {
    it('正确计算各种统计', () => {
      const now = Date.now()

      // 设置不同状态的单词
      progressRepo.set(dictId, 'apple', createTestProgress(dictId, 'apple', { masteryLevel: 7 })) // 已掌握
      progressRepo.set(dictId, 'banana', createTestProgress(dictId, 'banana', { masteryLevel: 1, nextReviewTime: now - 1000 })) // 到期
      progressRepo.set(dictId, 'cherry', createTestProgress(dictId, 'cherry', { masteryLevel: 2, nextReviewTime: now + 10000 })) // 未到期
      progressRepo.set(dictId, 'dog', createTestProgress(dictId, 'dog', { masteryLevel: 0 })) // 新词（有记录）

      // 设置今日记录
      dailyRecordRepo.set(dictId, getTodayDate(), {
        dictId,
        date: getTodayDate(),
        learnedCount: 5,
        reviewedCount: 3,
        masteredCount: 0,
        todayWords: [],
        wordTypes: {},
      })

      const stats = service.getStats(dictId, wordList)

      expect(stats.todayLearned).toBe(5)
      expect(stats.todayReviewed).toBe(3)
      expect(stats.masteredCount).toBe(1) // apple
      expect(stats.dueCount).toBe(1) // banana
      // newCount = wordList.length - learnedCount (masteryLevel > 0)
      // learned: apple(7), banana(1), cherry(2) = 3
      // newCount = 10 - 3 = 7
      expect(stats.newCount).toBe(7)
    })
  })
})

/**
 * 获取今日日期字符串
 */
function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
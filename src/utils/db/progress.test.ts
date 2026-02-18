import { describe, expect, it } from 'vitest'
import { DailyRecord, getNextReviewTime, LEARNING_CONFIG, MASTERY_LEVELS, updateMasteryLevel, WordProgress } from '@/utils/db/progress'

describe('WordProgress', () => {
  it('should create a new word progress with default values', () => {
    const progress = new WordProgress('apple', 'dict-1')
    
    expect(progress.word).toBe('apple')
    expect(progress.dict).toBe('dict-1')
    expect(progress.masteryLevel).toBe(MASTERY_LEVELS.NEW)
    expect(progress.correctCount).toBe(0)
    expect(progress.wrongCount).toBe(0)
    expect(progress.streak).toBe(0)
    expect(progress.easeFactor).toBe(2.5)
    expect(progress.reps).toBe(0)
  })

  it('should calculate accuracy correctly', () => {
    const progress = new WordProgress('apple', 'dict-1')
    expect(progress.accuracy).toBe(0)
    
    progress.correctCount = 8
    progress.wrongCount = 2
    expect(progress.accuracy).toBe(80)
  })

  it('should return correct mastery label', () => {
    const progress = new WordProgress('apple', 'dict-1')
    
    progress.masteryLevel = MASTERY_LEVELS.NEW
    expect(progress.masteryLabel).toBe('新词')
    
    progress.masteryLevel = MASTERY_LEVELS.MASTERED
    expect(progress.masteryLabel).toBe('已掌握')
  })

  it('should check if word is due for review', () => {
    const progress = new WordProgress('apple', 'dict-1')
    progress.nextReviewTime = Date.now() - 1000
    expect(progress.isDue).toBe(true)
    
    progress.nextReviewTime = Date.now() + 10000
    expect(progress.isDue).toBe(false)
  })
})

describe('DailyRecord', () => {
  it('should create a daily record with default values', () => {
    const record = new DailyRecord('dict-1', '2026-02-17')
    
    expect(record.dict).toBe('dict-1')
    expect(record.date).toBe('2026-02-17')
    expect(record.reviewedCount).toBe(0)
    expect(record.learnedCount).toBe(0)
  })

  it('should calculate totalToday correctly', () => {
    const record = new DailyRecord('dict-1', '2026-02-17')
    expect(record.totalToday).toBe(0)
    
    record.reviewedCount = 10
    record.learnedCount = 5
    expect(record.totalToday).toBe(15)
  })

  describe('getNewWordQuota - Fixed Limit Model', () => {
    it('should return DAILY_LIMIT when no activity', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT)
    })

    it('should subtract reviewed words from quota', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 5
      expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT - 5)
    })

    it('should subtract learned words from quota', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.learnedCount = 5
      expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT - 5)
    })

    it('should subtract both reviewed and learned words from quota', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 8
      record.learnedCount = 7
      expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT - 8 - 7)
    })

    it('should return 0 when quota is exhausted', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 10
      record.learnedCount = 10
      expect(record.getNewWordQuota()).toBe(0)
    })

    it('should return 0 when reviewedCount reaches DAILY_LIMIT', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 20
      expect(record.getNewWordQuota()).toBe(0)
    })

    it('should not return negative values', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 25
      expect(record.getNewWordQuota()).toBe(0)
      
      record.reviewedCount = 15
      record.learnedCount = 10
      expect(record.getNewWordQuota()).toBe(0)
    })
  })

  describe('remainingForTarget', () => {
    it('should return DAILY_LIMIT when no activity', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      expect(record.remainingForTarget).toBe(LEARNING_CONFIG.DAILY_LIMIT)
    })

    it('should calculate remaining correctly', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 5
      record.learnedCount = 10
      expect(record.remainingForTarget).toBe(5)
    })

    it('should return 0 when target is reached', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 10
      record.learnedCount = 15
      expect(record.remainingForTarget).toBe(0)
    })
  })

  describe('hasReachedTarget', () => {
    it('should return false when target not reached', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      expect(record.hasReachedTarget).toBe(false)
    })

    it('should return true when target reached', () => {
      const record = new DailyRecord('dict-1', '2026-02-17')
      record.reviewedCount = 10
      record.learnedCount = 10
      expect(record.hasReachedTarget).toBe(true)
    })
  })
})

describe('updateMasteryLevel', () => {
  it('should increase level when correct with no wrongs', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
    expect(result.newEaseFactor).toBe(2.6)
  })

  it('should not increase level when correct but with wrongs', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 2, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.NEW)
    expect(result.newEaseFactor).toBe(2.4)
  })

  it('should decrease level when wrong', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.FAMILIAR, false, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
    expect(result.newEaseFactor).toBe(2.3)
  })

  it('should not decrease below NEW level', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, false, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.NEW)
  })

  it('should not increase above MASTERED level', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.MASTERED, true, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.MASTERED)
  })

  it('should cap ease factor at 3.0', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 0, 2.95)
    expect(result.newEaseFactor).toBe(3.0)
  })

  it('should not decrease ease factor below 1.3', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, false, 0, 1.4)
    expect(result.newEaseFactor).toBe(1.3)
  })
})

describe('getNextReviewTime', () => {
  it('should return current time for NEW level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.NEW)
    expect(reviewTime).toBeGreaterThanOrEqual(now)
  })

  it('should return 1 hour later for LEARNED level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.LEARNED)
    const expectedMin = now + (1 / 24) * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 1 day later for FAMILIAR level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.FAMILIAR)
    const expectedMin = now + 1 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should apply ease factor', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.FAMILIAR, 2.0)
    const expectedMin = now + 2 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })
})

describe('LEARNING_CONFIG - Fixed Limit Model', () => {
  it('should have correct default values', () => {
    expect(LEARNING_CONFIG.DAILY_LIMIT).toBe(20)
  })
})

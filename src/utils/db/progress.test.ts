import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_DAILY_LIMIT, DailyRecord, LEARNING_CONFIG, MASTERY_LEVELS, WordProgress, getDailyLimit, getNextReviewTime, setDailyLimit, updateMasteryLevel } from '@/utils/db/progress'

describe('WordProgress', () => {
  it('should create a new word progress with default values', () => {
    const progress = new WordProgress('apple', 'dict-1')
    
    expect(progress.word).toBe('apple')
    expect(progress.dict).toBe('dict-1')
    expect(progress.masteryLevel).toBe(MASTERY_LEVELS.NEW)
    expect(progress.correctCount).toBe(0)
    expect(progress.wrongCount).toBe(0)
    expect(progress.streak).toBe(0)
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
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 0)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
  })

  it('should advance from NEW when correct but with wrongs', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 2)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
  })

  it('should decrease level when wrong', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.FAMILIAR, false, 0)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
  })

  it('should not decrease below NEW level', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, false, 0)
    expect(result.newLevel).toBe(MASTERY_LEVELS.NEW)
  })

  it('should not increase above EXPERT level (6)', () => {
    const result = updateMasteryLevel(6, true, 0)
    expect(result.newLevel).toBe(6)
  })

  it('should stay at current level when correct with wrongs', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.FAMILIAR, true, 2)
    expect(result.newLevel).toBe(MASTERY_LEVELS.FAMILIAR)
  })

  it('should not go below LEARNED when correct with wrongs', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.LEARNED, true, 2)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
  })
})

describe('getNextReviewTime', () => {
  it('should return 0 days later for NEW level (immediate upgrade, no review needed)', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.NEW)
    expect(reviewTime).toBeGreaterThanOrEqual(now - 1000)
  })

  it('should return 1 day later for LEARNED level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.LEARNED)
    const expectedMin = now + 1 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 2 days later for FAMILIAR level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.FAMILIAR)
    const expectedMin = now + 2 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 4 days later for KNOWN level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.KNOWN)
    const expectedMin = now + 4 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 7 days later for PROFICIENT level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.PROFICIENT)
    const expectedMin = now + 7 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 15 days later for ADVANCED level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.ADVANCED)
    const expectedMin = now + 15 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 21 days later for EXPERT level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.EXPERT)
    const expectedMin = now + 21 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })

  it('should return 30 days later for MASTERED level', () => {
    const now = Date.now()
    const reviewTime = getNextReviewTime(MASTERY_LEVELS.MASTERED)
    const expectedMin = now + 30 * 24 * 60 * 60 * 1000
    expect(reviewTime).toBeGreaterThanOrEqual(expectedMin - 1000)
  })
})

describe('LEARNING_CONFIG - Fixed Limit Model', () => {
  it('should have correct default values', () => {
    expect(LEARNING_CONFIG.DAILY_LIMIT).toBe(20)
  })
})

describe('DailyRecord - Extra Review', () => {
  it('should create a daily record with extraReviewedCount default to 0', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    expect(record.extraReviewedCount).toBe(0)
  })

  it('should calculate totalReviewed correctly (reviewedCount + extraReviewedCount)', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    record.reviewedCount = 20
    record.extraReviewedCount = 5
    expect(record.totalReviewed).toBe(25)
  })

  it('should identify when in extra review quota', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    expect(record.hasExtraReviewQuota).toBe(false)
    
    record.reviewedCount = 20
    expect(record.hasExtraReviewQuota).toBe(true)
  })

  it('should not count extraReviewedCount in getNewWordQuota', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    record.reviewedCount = 10
    record.extraReviewedCount = 15
    expect(record.getNewWordQuota()).toBe(10)
  })
})

describe('Daily Limit Configuration', () => {
  beforeEach(() => {
    setDailyLimit(DEFAULT_DAILY_LIMIT)
  })

  afterEach(() => {
    setDailyLimit(DEFAULT_DAILY_LIMIT)
  })

  it('should have default daily limit of 20', () => {
    expect(getDailyLimit()).toBe(20)
    expect(DEFAULT_DAILY_LIMIT).toBe(20)
  })

  it('should allow setting custom daily limit', () => {
    setDailyLimit(30)
    expect(getDailyLimit()).toBe(30)
    expect(LEARNING_CONFIG.DAILY_LIMIT).toBe(30)
  })

  it('should affect DailyRecord calculations when limit changes', () => {
    setDailyLimit(10)
    const record = new DailyRecord('dict-1', '2026-02-18')
    expect(record.getNewWordQuota()).toBe(10)
    
    record.reviewedCount = 5
    expect(record.getNewWordQuota()).toBe(5)
    
    record.learnedCount = 3
    expect(record.getNewWordQuota()).toBe(2)
  })

  it('should correctly identify hasReachedTarget with custom limit', () => {
    setDailyLimit(15)
    const record = new DailyRecord('dict-1', '2026-02-18')
    
    record.reviewedCount = 10
    record.learnedCount = 4
    expect(record.hasReachedTarget).toBe(false)
    
    record.learnedCount = 5
    expect(record.hasReachedTarget).toBe(true)
  })

  it('should correctly identify hasExtraReviewQuota with custom limit', () => {
    setDailyLimit(15)
    const record = new DailyRecord('dict-1', '2026-02-18')
    
    record.reviewedCount = 14
    expect(record.hasExtraReviewQuota).toBe(false)
    
    record.reviewedCount = 15
    expect(record.hasExtraReviewQuota).toBe(true)
  })
})

describe('ReviewedCount Cap at DAILY_LIMIT (当日已复习数只计入前N个)', () => {
  it('should cap reviewedCount at DAILY_LIMIT for quota calculation', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    record.reviewedCount = 25
    record.learnedCount = 0
    
    expect(record.getNewWordQuota()).toBe(0)
  })

  it('should not allow negative quota when reviewedCount exceeds DAILY_LIMIT', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    record.reviewedCount = 30
    record.learnedCount = 5
    
    expect(record.getNewWordQuota()).toBe(0)
  })

  it('should correctly handle reviewedCount > DAILY_LIMIT scenario', () => {
    const record = new DailyRecord('dict-1', '2026-02-18')
    record.reviewedCount = 25
    record.learnedCount = 0
    
    expect(record.hasReachedTarget).toBe(true)
    expect(record.getNewWordQuota()).toBe(0)
    expect(record.hasExtraReviewQuota).toBe(true)
  })
})

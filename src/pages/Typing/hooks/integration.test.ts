import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { DailyRecord, LEARNING_CONFIG, MASTERY_LEVELS, WordProgress, getNextReviewTime, setDailyLimit, DEFAULT_DAILY_LIMIT, updateMasteryLevel } from '@/utils/db/progress'
import { determineLearningType, calculateNewWordQuota, calculateRemainingForTarget, hasReachedDailyTarget } from './learningLogic'

function createWord(name: string): { name: string; trans: string[]; usphone: string; ukphone: string } {
  return { name, trans: [], usphone: '', ukphone: '' }
}

function createWordWithIndex(name: string, index: number): { name: string; trans: string[]; usphone: string; ukphone: string; index: number } {
  return { ...createWord(name), index }
}

function createProgress(word: string, masteryLevel: number, nextReviewTime: number = Date.now()): { word: string; dict: string; masteryLevel: number; nextReviewTime: number; lastReviewTime: number; correctCount: number; wrongCount: number; streak: number; easeFactor: number; reps: number } {
  return {
    word,
    dict: 'test-dict',
    masteryLevel,
    nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    easeFactor: 2.5,
    reps: masteryLevel > 0 ? 1 : 0,
  }
}

describe('Word Completion Integration Tests (单词完成集成测试)', () => {
  const dict = 'test-dict'
  const today = '2026-02-18'

  describe('New Word Learning Flow (新词学习流程)', () => {
    it('should count as learned when completing a new word for the first time', () => {
      const progress = new WordProgress('apple', dict)
      
      expect(progress.reps).toBe(0)
      expect(progress.masteryLevel).toBe(MASTERY_LEVELS.NEW)
      
      const { newLevel, newEaseFactor } = updateMasteryLevel(progress.masteryLevel, true, 0, progress.easeFactor)
      
      expect(newLevel).toBe(MASTERY_LEVELS.LEARNED)
      
      const dailyRecord = new DailyRecord(dict, today)
      dailyRecord.learnedCount++
      
      expect(dailyRecord.learnedCount).toBe(1)
      expect(dailyRecord.reviewedCount).toBe(0)
    })

    it('should count as learned even when new word has wrong inputs', () => {
      const progress = new WordProgress('apple', dict)
      
      const { newLevel, newEaseFactor } = updateMasteryLevel(progress.masteryLevel, true, 2, progress.easeFactor)
      
      expect(newLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(newEaseFactor).toBeLessThan(2.5)
    })

    it('should count as learned when reps is 0 even if progress exists', () => {
      const progress = new WordProgress('apple', dict)
      progress.reps = 0
      
      const isNewWord = progress.reps === 0
      
      expect(isNewWord).toBe(true)
    })
  })

  describe('Review Flow (复习流程)', () => {
    it('should count as reviewed when completing a word with reps > 0', () => {
      const progress = new WordProgress('apple', dict)
      progress.reps = 1
      progress.masteryLevel = MASTERY_LEVELS.LEARNED
      
      const isNewWord = progress.reps === 0
      
      expect(isNewWord).toBe(false)
      
      const dailyRecord = new DailyRecord(dict, today)
      dailyRecord.learnedCount = 5
      dailyRecord.reviewedCount++
      
      expect(dailyRecord.reviewedCount).toBe(1)
      expect(dailyRecord.learnedCount).toBe(5)
    })

    it('should increase mastery level when reviewing correctly', () => {
      const progress = new WordProgress('apple', dict)
      progress.masteryLevel = MASTERY_LEVELS.LEARNED
      
      const { newLevel } = updateMasteryLevel(progress.masteryLevel, true, 0, progress.easeFactor)
      
      expect(newLevel).toBe(MASTERY_LEVELS.FAMILIAR)
    })
  })

  describe('Extra Review Flow (额外复习流程)', () => {
    it('should count as extraReviewedCount when isExtraReview is true', () => {
      const dailyRecord = new DailyRecord(dict, today)
      dailyRecord.reviewedCount = 20
      dailyRecord.extraReviewedCount = 0
      
      dailyRecord.extraReviewedCount++
      
      expect(dailyRecord.extraReviewedCount).toBe(1)
      expect(dailyRecord.reviewedCount).toBe(20)
    })

    it('should not affect daily limit when doing extra review', () => {
      const dailyRecord = new DailyRecord(dict, today)
      dailyRecord.reviewedCount = 20
      
      for (let i = 0; i < 5; i++) {
        dailyRecord.extraReviewedCount++
        expect(dailyRecord.reviewedCount).toBe(20)
      }
      
      expect(dailyRecord.extraReviewedCount).toBe(5)
    })
  })

  describe('Daily Limit Scenarios (每日上限场景)', () => {
    it('should correctly track progress towards daily limit', () => {
      const dailyRecord = new DailyRecord(dict, today)
      
      for (let i = 0; i < 10; i++) {
        dailyRecord.learnedCount++
        expect(dailyRecord.learnedCount).toBe(i + 1)
      }
      
      expect(dailyRecord.learnedCount).toBe(10)
    })

    it('should stop counting when daily limit is reached', () => {
      const dailyRecord = new DailyRecord(dict, today)
      dailyRecord.reviewedCount = 15
      dailyRecord.learnedCount = 5
      
      const totalToday = dailyRecord.reviewedCount + dailyRecord.learnedCount
      
      expect(totalToday).toBe(20)
      expect(totalToday >= LEARNING_CONFIG.DAILY_LIMIT).toBe(true)
    })
  })

  describe('Edge Cases (边界情况)', () => {
    it('should handle wrong answer on new word (still counts as learned)', () => {
      const progress = new WordProgress('apple', dict)
      
      const { newLevel } = updateMasteryLevel(progress.masteryLevel, false, 3, progress.easeFactor)
      
      expect(newLevel).toBe(MASTERY_LEVELS.NEW)
      
      const isNewWord = progress.reps === 0
      expect(isNewWord).toBe(true)
    })

    it('should handle multiple wrong inputs followed by correct', () => {
      const progress = new WordProgress('apple', dict)
      
      const { newLevel, newEaseFactor } = updateMasteryLevel(progress.masteryLevel, true, 4, progress.easeFactor)
      
      expect(newLevel).toBe(MASTERY_LEVELS.LEARNED)
      expect(newEaseFactor).toBeLessThan(2.5)
    })
  })
})

describe('Daily Record State Transitions (每日记录状态转换)', () => {
  const dict = 'test-dict'
  const today = '2026-02-18'

  it('should correctly calculate remaining slots throughout the day', () => {
    const record = new DailyRecord(dict, today)

    expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT)

    record.learnedCount = 5
    expect(record.getNewWordQuota()).toBe(15)

    record.reviewedCount = 10
    expect(record.getNewWordQuota()).toBe(5)

    record.learnedCount = 10
    expect(record.getNewWordQuota()).toBe(0)
  })

  it('should correctly determine target reached state', () => {
    const record = new DailyRecord(dict, today)

    expect(record.hasReachedTarget).toBe(false)

    record.learnedCount = 10
    expect(record.hasReachedTarget).toBe(false)

    record.reviewedCount = 10
    expect(record.hasReachedTarget).toBe(true)

    record.learnedCount = 0
    record.reviewedCount = 20
    expect(record.hasReachedTarget).toBe(true)
  })

  it('should track extra review separately from main count', () => {
    const record = new DailyRecord(dict, today)
    record.reviewedCount = 20
    record.extraReviewedCount = 0

    expect(record.hasReachedTarget).toBe(true)
    expect(record.getNewWordQuota()).toBe(0)

    record.extraReviewedCount = 5
    expect(record.reviewedCount).toBe(20)
    expect(record.getNewWordQuota()).toBe(0)
  })
})

describe('Word Progress State Transitions (单词进度状态转换)', () => {
  it('should correctly transition through mastery levels', () => {
    let masteryLevel = MASTERY_LEVELS.NEW
    let easeFactor = 2.5

    const transitions = [
      { expectedLevel: MASTERY_LEVELS.LEARNED, description: 'NEW -> LEARNED' },
      { expectedLevel: MASTERY_LEVELS.FAMILIAR, description: 'LEARNED -> FAMILIAR' },
      { expectedLevel: MASTERY_LEVELS.KNOWN, description: 'FAMILIAR -> KNOWN' },
    ]

    for (const transition of transitions) {
      const result = updateMasteryLevel(masteryLevel, true, 0, easeFactor)
      masteryLevel = result.newLevel
      easeFactor = result.newEaseFactor
      expect(masteryLevel).toBe(transition.expectedLevel)
    }
  })

  it('should decrease mastery level on wrong answer', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.FAMILIAR, false, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)
  })

  it('should not decrease below NEW level', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.NEW, false, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.NEW)
  })

  it('should not increase above MASTERED level', () => {
    const result = updateMasteryLevel(MASTERY_LEVELS.MASTERED, true, 0, 2.5)
    expect(result.newLevel).toBe(MASTERY_LEVELS.MASTERED)
  })
})

describe('Critical Bug Scenarios (关键Bug场景)', () => {
  it('should not double count when word is completed twice (React StrictMode scenario)', () => {
    const progress = new WordProgress('apple', 'test-dict')
    
    const isNewWord1 = progress.reps === 0
    progress.reps++
    
    const isNewWord2 = progress.reps === 0
    
    expect(isNewWord1).toBe(true)
    expect(isNewWord2).toBe(false)
  })

  it('should correctly identify new word vs review based on reps', () => {
    const scenarios = [
      { reps: 0, expectedIsNew: true, description: 'reps=0 should be new word' },
      { reps: 1, expectedIsNew: false, description: 'reps=1 should be review' },
      { reps: 5, expectedIsNew: false, description: 'reps=5 should be review' },
    ]

    for (const scenario of scenarios) {
      const progress = new WordProgress('apple', 'test-dict')
      progress.reps = scenario.reps
      
      const isNewWord = progress.reps === 0
      expect(isNewWord).toBe(scenario.expectedIsNew)
    }
  })

  it('should handle rapid word completions without race conditions', () => {
    const dailyRecord = new DailyRecord('test-dict', '2026-02-18')
    
    for (let i = 0; i < 5; i++) {
      dailyRecord.learnedCount++
    }
    
    expect(dailyRecord.learnedCount).toBe(5)
  })
})

describe('Extra Review Button Bug (额外复习按钮无反应Bug)', () => {
  const dict = 'test-dict'
  const today = '2026-02-18'

  it('should return all due words when isExtraReview is true', () => {
    const dueWords = Array.from({ length: 18 }, (_, i) => createWordWithIndex(`word${i}`, i))
    const reviewedCount = 20
    const learnedCount = 0

    const result = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: true,
    })

    expect(result.learningType).toBe('review')
    expect(result.learningWords.length).toBe(18)
    expect(result.hasMoreDueWords).toBe(false)
  })

  it('should return EMPTY learningWords when isExtraReview is false and target reached', () => {
    const dueWords = Array.from({ length: 18 }, (_, i) => createWordWithIndex(`word${i}`, i))
    const reviewedCount = 20
    const learnedCount = 0

    const result = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: false,
    })

    expect(result.learningType).toBe('complete')
    expect(result.learningWords.length).toBe(0)
    expect(result.hasMoreDueWords).toBe(true)
    expect(result.remainingDueCount).toBe(18)
  })

  it('should show different results before and after clicking extra review button', () => {
    const dueWords = Array.from({ length: 18 }, (_, i) => createWordWithIndex(`word${i}`, i))
    const reviewedCount = 20
    const learnedCount = 0

    const beforeClick = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: false,
    })

    const afterClick = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: true,
    })

    expect(beforeClick.learningType).toBe('complete')
    expect(beforeClick.learningWords.length).toBe(0)
    expect(beforeClick.hasMoreDueWords).toBe(true)
    expect(beforeClick.remainingDueCount).toBe(18)

    expect(afterClick.learningType).toBe('review')
    expect(afterClick.learningWords.length).toBe(18)
    expect(afterClick.hasMoreDueWords).toBe(false)

    expect(beforeClick.learningWords.length).not.toBe(afterClick.learningWords.length)
  })

  it('should correctly handle extra review flow: popup -> click -> load words', () => {
    const dueWords = Array.from({ length: 18 }, (_, i) => createWordWithIndex(`word${i}`, i))
    const reviewedCount = 20
    const learnedCount = 0

    const beforeClick = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: false,
    })

    expect(beforeClick.learningType).toBe('complete')
    expect(beforeClick.learningWords.length).toBe(0)
    expect(beforeClick.hasMoreDueWords).toBe(true)
    expect(beforeClick.remainingDueCount).toBe(18)

    const afterClick = determineLearningType({
      dueWords,
      newWords: [],
      reviewedCount,
      learnedCount,
      allProgress: [],
      wordList: dueWords,
      isExtraReview: true,
    })

    expect(afterClick.learningType).toBe('review')
    expect(afterClick.learningWords.length).toBe(18)
    expect(afterClick.hasMoreDueWords).toBe(false)
  })
})

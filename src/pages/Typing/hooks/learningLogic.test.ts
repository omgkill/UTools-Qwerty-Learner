import { describe, expect, it } from 'vitest'
import type { IWordProgress, MasteryLevel } from '@/utils/db/progress'
import type { Word, WordWithIndex } from '@/typings'
import {
  calculateNewWordQuota,
  calculateRemainingForTarget,
  determineLearningType,
  hasReachedDailyTarget,
} from './learningLogic'

function createWord(name: string): Word {
  return { name, trans: [], usphone: '', ukphone: '' }
}

function createWordWithIndex(name: string, index: number): WordWithIndex {
  return { ...createWord(name), index }
}

function createProgress(word: string, masteryLevel: MasteryLevel, nextReviewTime: number = Date.now()): IWordProgress {
  return {
    word,
    dict: 'test-dict',
    masteryLevel,
    nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 0,
  }
}

describe('determineLearningType', () => {
  const wordList: Word[] = [createWord('apple'), createWord('banana'), createWord('cherry')]

  describe('review mode', () => {
    it('should return review mode when there are due words', () => {
      const dueWords = [createWordWithIndex('apple', 0)]
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords).toEqual(dueWords)
    })

    it('should limit review words by remaining slots', () => {
      const dueWords = Array.from({ length: 10 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 18,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords.length).toBe(2)
    })

    it('should return complete with hasMoreDueWords when target reached but there are due words (extra review scenario)', () => {
      const dueWords = [createWordWithIndex('apple', 0)]
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 20,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('complete')
      expect(result.learningWords.length).toBe(0)
      expect(result.hasMoreDueWords).toBe(true)
      expect(result.remainingDueCount).toBe(1)
    })

    it('should prioritize review over new words', () => {
      const dueWords = [createWordWithIndex('apple', 0)]
      const newWords = [createWordWithIndex('banana', 1)]
      const result = determineLearningType({
        dueWords,
        newWords,
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('review')
    })
  })

  describe('new word mode', () => {
    it('should return new mode when no due words and has quota', () => {
      const newWords = [createWordWithIndex('apple', 0), createWordWithIndex('banana', 1)]
      const result = determineLearningType({
        dueWords: [],
        newWords,
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('new')
      expect(result.learningWords.length).toBe(2)
    })

    it('should limit new words by quota (DAILY_LIMIT - reviewedCount - learnedCount)', () => {
      const newWords = Array.from({ length: 50 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords: [],
        newWords,
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('new')
      expect(result.learningWords.length).toBe(20)
    })

    it('should return 0 new words when quota is exhausted', () => {
      const newWords = [createWordWithIndex('apple', 0)]
      const result = determineLearningType({
        dueWords: [],
        newWords,
        reviewedCount: 15,
        learnedCount: 5,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('complete')
    })

    it('should calculate quota correctly: DAILY_LIMIT - reviewedCount - learnedCount', () => {
      const newWords = Array.from({ length: 20 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords: [],
        newWords,
        reviewedCount: 5,
        learnedCount: 3,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('new')
      expect(result.learningWords.length).toBe(12)
    })
  })

  describe('complete mode', () => {
    it('should return complete when target is reached', () => {
      const result = determineLearningType({
        dueWords: [],
        newWords: [],
        reviewedCount: 10,
        learnedCount: 10,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('complete')
      expect(result.learningWords).toEqual([])
    })

    it('should return complete when target exceeded', () => {
      const result = determineLearningType({
        dueWords: [],
        newWords: [],
        reviewedCount: 15,
        learnedCount: 10,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('complete')
    })

    it('should return complete when reviewedCount reaches DAILY_LIMIT', () => {
      const result = determineLearningType({
        dueWords: [],
        newWords: [],
        reviewedCount: 20,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('complete')
    })
  })

  describe('consolidate mode', () => {
    it('should return consolidate when no due words, no quota, but target not reached', () => {
      const progress1 = createProgress('apple', 3)
      const progress2 = createProgress('banana', 2)
      const wordListWithProgress: Word[] = [createWord('apple'), createWord('banana')]

      const result = determineLearningType({
        dueWords: [],
        newWords: [],
        reviewedCount: 5,
        learnedCount: 10,
        allProgress: [progress1, progress2],
        wordList: wordListWithProgress,
      })

      expect(result.learningType).toBe('consolidate')
    })

    it('should only include words with masteryLevel between 1 and 6', () => {
      const progress1 = createProgress('apple', 1)
      const progress2 = createProgress('banana', 6)
      const progress3 = createProgress('cherry', 0)
      const progress4 = createProgress('date', 7)
      const wordListWithProgress: Word[] = [
        createWord('apple'),
        createWord('banana'),
        createWord('cherry'),
        createWord('date'),
      ]

      const result = determineLearningType({
        dueWords: [],
        newWords: [],
        reviewedCount: 5,
        learnedCount: 10,
        allProgress: [progress1, progress2, progress3, progress4],
        wordList: wordListWithProgress,
      })

      expect(result.learningType).toBe('consolidate')
      const wordNames = result.learningWords.map((w) => w.name)
      expect(wordNames).toContain('apple')
      expect(wordNames).toContain('banana')
      expect(wordNames).not.toContain('cherry')
      expect(wordNames).not.toContain('date')
    })
  })
})

describe('calculateNewWordQuota - Fixed Limit Model', () => {
  it('should return DAILY_LIMIT when no activity', () => {
    expect(calculateNewWordQuota(0, 0)).toBe(20)
  })

  it('should calculate quota as DAILY_LIMIT - reviewedCount - learnedCount', () => {
    expect(calculateNewWordQuota(5, 0)).toBe(15)
    expect(calculateNewWordQuota(10, 5)).toBe(5)
    expect(calculateNewWordQuota(15, 3)).toBe(2)
  })

  it('should return 0 when exhausted', () => {
    expect(calculateNewWordQuota(10, 10)).toBe(0)
    expect(calculateNewWordQuota(20, 0)).toBe(0)
    expect(calculateNewWordQuota(0, 20)).toBe(0)
    expect(calculateNewWordQuota(15, 10)).toBe(0)
  })

  it('should not return negative values', () => {
    expect(calculateNewWordQuota(25, 0)).toBe(0)
    expect(calculateNewWordQuota(0, 25)).toBe(0)
    expect(calculateNewWordQuota(15, 15)).toBe(0)
  })
})

describe('calculateRemainingForTarget', () => {
  it('should return DAILY_LIMIT when no activity', () => {
    expect(calculateRemainingForTarget(0, 0)).toBe(20)
  })

  it('should calculate remaining correctly', () => {
    expect(calculateRemainingForTarget(5, 10)).toBe(5)
    expect(calculateRemainingForTarget(10, 5)).toBe(5)
    expect(calculateRemainingForTarget(15, 3)).toBe(2)
  })

  it('should return 0 when target reached', () => {
    expect(calculateRemainingForTarget(10, 10)).toBe(0)
    expect(calculateRemainingForTarget(15, 10)).toBe(0)
    expect(calculateRemainingForTarget(20, 0)).toBe(0)
  })
})

describe('hasReachedDailyTarget', () => {
  it('should return false when target not reached', () => {
    expect(hasReachedDailyTarget(0, 0)).toBe(false)
    expect(hasReachedDailyTarget(10, 5)).toBe(false)
    expect(hasReachedDailyTarget(15, 4)).toBe(false)
  })

  it('should return true when target reached', () => {
    expect(hasReachedDailyTarget(10, 10)).toBe(true)
    expect(hasReachedDailyTarget(15, 10)).toBe(true)
    expect(hasReachedDailyTarget(20, 0)).toBe(true)
    expect(hasReachedDailyTarget(0, 20)).toBe(true)
  })
})

describe('Extra Review Mode', () => {
  const wordList: Word[] = [createWord('apple'), createWord('banana'), createWord('cherry'), createWord('date')]

  describe('hasMoreDueWords detection', () => {
    it('should set hasMoreDueWords=true when due words exceed remaining slots', () => {
      const dueWords = Array.from({ length: 25 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords.length).toBe(20)
      expect(result.hasMoreDueWords).toBe(true)
      expect(result.remainingDueCount).toBe(5)
    })

    it('should set hasMoreDueWords=false when due words fit in remaining slots', () => {
      const dueWords = Array.from({ length: 10 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords.length).toBe(10)
      expect(result.hasMoreDueWords).toBe(false)
      expect(result.remainingDueCount).toBe(0)
    })

    it('should correctly calculate remainingDueCount', () => {
      const dueWords = Array.from({ length: 30 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 5,
        learnedCount: 0,
        allProgress: [],
        wordList,
      })

      expect(result.learningWords.length).toBe(15)
      expect(result.remainingDueCount).toBe(15)
    })
  })

  describe('isExtraReview flag', () => {
    it('should return all due words when isExtraReview=true', () => {
      const dueWords = Array.from({ length: 30 }, (_, i) => createWordWithIndex(`word${i}`, i))
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 20,
        learnedCount: 0,
        allProgress: [],
        wordList,
        isExtraReview: true,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords.length).toBe(30)
      expect(result.hasMoreDueWords).toBe(false)
    })

    it('should ignore daily limit when isExtraReview=true', () => {
      const dueWords = [createWordWithIndex('apple', 0), createWordWithIndex('banana', 1)]
      const result = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 50,
        learnedCount: 50,
        allProgress: [],
        wordList,
        isExtraReview: true,
      })

      expect(result.learningType).toBe('review')
      expect(result.learningWords.length).toBe(2)
    })
  })

  describe('extra review scenario flow', () => {
    it('should trigger extra review when target reached with remaining due words', () => {
      const dueWords = Array.from({ length: 25 }, (_, i) => createWordWithIndex(`word${i}`, i))
      
      const normalResult = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 20,
        learnedCount: 0,
        allProgress: [],
        wordList,
        isExtraReview: false,
      })

      expect(normalResult.learningType).toBe('complete')
      expect(normalResult.learningWords.length).toBe(0)
      expect(normalResult.hasMoreDueWords).toBe(true)
      expect(normalResult.remainingDueCount).toBe(25)

      const extraResult = determineLearningType({
        dueWords,
        newWords: [],
        reviewedCount: 20,
        learnedCount: 0,
        allProgress: [],
        wordList,
        isExtraReview: true,
      })

      expect(extraResult.learningType).toBe('review')
      expect(extraResult.learningWords.length).toBe(25)
      expect(extraResult.hasMoreDueWords).toBe(false)
    })
  })
})

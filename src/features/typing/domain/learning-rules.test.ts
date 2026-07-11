import { describe, expect, it } from 'vitest'
import { filterDueWords, isWordDue, isWordNew } from './learning-rules'
import { MASTERY_LEVELS } from './learning-config'
import type { TypingWordProgress } from './types'

function createProgress(
  word: string,
  masteryLevel: number,
  nextReviewTime: number,
  reps = 1,
): TypingWordProgress {
  return {
    word,
    dict: 'test-dict',
    masteryLevel,
    nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps,
  }
}

describe('isWordDue', () => {
  it('should return true when word is due (nextReviewTime <= currentTime)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.LEARNED, currentTime - 1000)
    expect(isWordDue(progress, currentTime)).toBe(true)
  })

  it('should return false when word is not due (nextReviewTime > currentTime)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.LEARNED, currentTime + 10000)
    expect(isWordDue(progress, currentTime)).toBe(false)
  })

  it('should return false when word has never been learned (reps = 0)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.LEARNED, currentTime - 1000, 0)
    expect(isWordDue(progress, currentTime)).toBe(false)
  })

  it('should return false when word is mastered (masteryLevel >= 7)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.MASTERED, currentTime - 1000)
    expect(isWordDue(progress, currentTime)).toBe(false)
  })

  it('should return true for LEARNED level word (level 1)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.LEARNED, currentTime - 1000)
    expect(isWordDue(progress, currentTime)).toBe(true)
  })

  it('should return true for FAMILIAR level word (level 2)', () => {
    const currentTime = Date.now()
    const progress = createProgress('test-word', MASTERY_LEVELS.FAMILIAR, currentTime - 1000)
    expect(isWordDue(progress, currentTime)).toBe(true)
  })
})

describe('filterDueWords', () => {
  it('should return empty array when no words are due', () => {
    const currentTime = Date.now()
    const allProgress = [
      createProgress('word1', MASTERY_LEVELS.LEARNED, currentTime + 10000),
      createProgress('word2', MASTERY_LEVELS.FAMILIAR, currentTime + 20000),
    ]
    expect(filterDueWords(allProgress, currentTime)).toHaveLength(0)
  })

  it('should return only due words', () => {
    const currentTime = Date.now()
    const allProgress = [
      createProgress('word1', MASTERY_LEVELS.LEARNED, currentTime - 1000), // due
      createProgress('word2', MASTERY_LEVELS.LEARNED, currentTime + 10000), // not due
      createProgress('word3', MASTERY_LEVELS.FAMILIAR, currentTime - 500), // due
    ]
    const dueWords = filterDueWords(allProgress, currentTime)
    expect(dueWords).toHaveLength(2)
    expect(dueWords.map((p) => p.word)).toEqual(['word1', 'word3'])
  })

  it('should filter out mastered words even if they are due', () => {
    const currentTime = Date.now()
    const allProgress = [
      createProgress('word1', MASTERY_LEVELS.MASTERED, currentTime - 1000), // mastered, not due
      createProgress('word2', MASTERY_LEVELS.LEARNED, currentTime - 500), // due
    ]
    const dueWords = filterDueWords(allProgress, currentTime)
    expect(dueWords).toHaveLength(1)
    expect(dueWords[0].word).toBe('word2')
  })

  it('should filter out words with reps = 0', () => {
    const currentTime = Date.now()
    const allProgress = [
      createProgress('word1', MASTERY_LEVELS.LEARNED, currentTime - 1000, 0), // new word, not due
      createProgress('word2', MASTERY_LEVELS.LEARNED, currentTime - 500, 1), // due
    ]
    const dueWords = filterDueWords(allProgress, currentTime)
    expect(dueWords).toHaveLength(1)
    expect(dueWords[0].word).toBe('word2')
  })
})

describe('isWordNew', () => {
  it('should return true when progress is undefined', () => {
    expect(isWordNew(undefined)).toBe(true)
  })

  it('should return true when masteryLevel is NEW (0)', () => {
    const progress = createProgress('test-word', MASTERY_LEVELS.NEW, Date.now())
    expect(isWordNew(progress)).toBe(true)
  })

  it('should return false when masteryLevel is LEARNED (1)', () => {
    const progress = createProgress('test-word', MASTERY_LEVELS.LEARNED, Date.now())
    expect(isWordNew(progress)).toBe(false)
  })

  it('should return false when masteryLevel is FAMILIAR (2)', () => {
    const progress = createProgress('test-word', MASTERY_LEVELS.FAMILIAR, Date.now())
    expect(isWordNew(progress)).toBe(false)
  })

  it('should return false for any masteryLevel > 0', () => {
    for (let level = 1; level <= 7; level++) {
      const progress = createProgress('test-word', level, Date.now())
      expect(isWordNew(progress)).toBe(false)
    }
  })
})
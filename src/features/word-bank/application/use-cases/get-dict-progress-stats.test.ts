import { describe, expect, it } from 'vitest'
import { calculatePendingLearnWords } from './get-dict-progress-stats'

describe('calculatePendingLearnWords', () => {
  it('should fill remaining daily quota with due words first and then new words', () => {
    expect(
      calculatePendingLearnWords({
        dueWords: 12,
        availableNewWords: 50,
        reviewedCount: 0,
        learnedCount: 0,
      }),
    ).toBe(20)
  })

  it('should cap pending words by daily limit when due words exceed the limit', () => {
    expect(
      calculatePendingLearnWords({
        dueWords: 35,
        availableNewWords: 50,
        reviewedCount: 0,
        learnedCount: 0,
      }),
    ).toBe(20)
  })

  it('should subtract words already learned or reviewed today', () => {
    expect(
      calculatePendingLearnWords({
        dueWords: 3,
        availableNewWords: 50,
        reviewedCount: 8,
        learnedCount: 4,
      }),
    ).toBe(8)
  })

  it('should return 0 after the daily limit is reached', () => {
    expect(
      calculatePendingLearnWords({
        dueWords: 10,
        availableNewWords: 50,
        reviewedCount: 20,
        learnedCount: 0,
      }),
    ).toBe(0)
  })
})

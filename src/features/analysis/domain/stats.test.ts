import { describe, expect, it } from 'vitest'
import { buildWordDetails } from './stats'
import { DailyRecord } from '@/utils/db/progress'

describe('buildWordDetails', () => {
  it('prefers persisted daily word details to avoid historical drift', () => {
    const dailyRecord = new DailyRecord('dict-1', '2026-07-12')
    dailyRecord.wordDetails = [
      { word: 'banana', type: 'review', wrongCount: 1, timeStamp: 200 },
      { word: 'apple', type: 'new', wrongCount: 0, timeStamp: 100 },
    ]

    const result = buildWordDetails(dailyRecord, [], '2026-07-12')

    expect(result).toEqual([
      { word: 'apple', type: 'new', wrongCount: 0, timeStamp: 100 },
      { word: 'banana', type: 'review', wrongCount: 1, timeStamp: 200 },
    ])
  })

  it('falls back to word progress for legacy records without persisted details', () => {
    const result = buildWordDetails(undefined, [{ word: 'apple', lastReviewTime: new Date('2026-07-12T10:00:00Z').getTime(), wrongCount: 2, reps: 1, masteryLevel: 0, id: 1, dict: 'dict-1', nextReviewTime: 0, correctCount: 0, streak: 0 }], '2026-07-12')

    expect(result).toEqual([{ word: 'apple', timeStamp: new Date('2026-07-12T10:00:00Z').getTime(), wrongCount: 2, type: 'new' }])
  })
})

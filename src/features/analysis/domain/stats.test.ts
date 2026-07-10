import { buildDayStats, buildDictStats, buildWordDetails } from './stats'
import type { AnalysisDailyRecord, AnalysisWordProgress, AnalysisWordRecord } from './types'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import { describe, expect, it } from 'vitest'

function createWordRecord(word: string, dict: string, timeStamp: number, wrongCount = 0, timing: number[] = [100]): AnalysisWordRecord {
  return {
    word,
    dict,
    timeStamp,
    timing,
    wrongCount,
    mistakes: {},
  }
}

function createDailyRecord(date: string, patch: Partial<AnalysisDailyRecord>): AnalysisDailyRecord {
  return {
    dict: 'dict-1',
    date,
    learnedCount: 0,
    reviewedCount: 0,
    extraReviewedCount: 0,
    masteredCount: 0,
    lastUpdateTime: 0,
    totalToday: 0,
    totalReviewed: 0,
    getNewWordQuota: () => 0,
    remainingForTarget: 0,
    hasReachedTarget: false,
    hasExtraReviewQuota: false,
    ...patch,
  }
}

function createWordProgress(word: string, dict: string, lastReviewTime: number): AnalysisWordProgress {
  return {
    word,
    dict,
    masteryLevel: MASTERY_LEVELS.MASTERED,
    nextReviewTime: lastReviewTime,
    lastReviewTime,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 1,
  }
}

describe('analysis stats domain', () => {
  it('builds dict stats from word records without React or Dexie', () => {
    const wordRecords = [
      createWordRecord('apple', 'dict-1', new Date('2026-02-25T10:00:00').valueOf()),
      createWordRecord('banana', 'dict-1', new Date('2026-02-26T10:00:00').valueOf()),
      createWordRecord('cat', 'dict-2', new Date('2026-02-24T10:00:00').valueOf()),
    ]

    const result = buildDictStats(wordRecords, [
      { id: 'dict-1', name: 'Dict One' },
      { id: 'dict-2', name: 'Dict Two' },
    ])

    expect(result).toEqual([
      {
        dictId: 'dict-1',
        dictName: 'Dict One',
        totalDays: 2,
        totalWords: 2,
        lastStudyDate: '2026-02-26',
      },
      {
        dictId: 'dict-2',
        dictName: 'Dict Two',
        totalDays: 1,
        totalWords: 1,
        lastStudyDate: '2026-02-24',
      },
    ])
  })

  it('keeps mastered-only daily records visible', () => {
    const result = buildDayStats([
      createDailyRecord('2026-02-26', { masteredCount: 5 }),
      createDailyRecord('2026-02-25', {}),
      createDailyRecord('2026-02-24', { learnedCount: 2, reviewedCount: 3 }),
    ])

    expect(result).toEqual([
      {
        date: '2026-02-26',
        learnedCount: 0,
        reviewedCount: 0,
        masteredCount: 5,
        totalWords: 5,
      },
      {
        date: '2026-02-24',
        learnedCount: 2,
        reviewedCount: 3,
        masteredCount: 0,
        totalWords: 5,
      },
    ])
  })

  it('builds word details from records and mastered progress', () => {
    const firstDay = new Date('2026-02-25T10:00:00').valueOf()
    const targetDay = new Date('2026-02-26T10:00:00').valueOf()
    const wordRecords = [
      createWordRecord('reviewed', 'dict-1', firstDay),
      createWordRecord('reviewed', 'dict-1', targetDay, 1),
      createWordRecord('learned', 'dict-1', targetDay, 0),
      createWordRecord('mastered-record', 'dict-1', targetDay, 0, []),
    ]
    const wordProgressList = [
      createWordProgress('mastered-progress', 'dict-1', targetDay),
      createWordProgress('mastered-record', 'dict-1', targetDay),
    ]

    const result = buildWordDetails(wordRecords, wordProgressList, '2026-02-26')

    expect(result).toEqual([
      {
        word: 'learned',
        timeStamp: targetDay,
        wrongCount: 0,
        type: 'new',
      },
      {
        word: 'mastered-progress',
        timeStamp: targetDay,
        wrongCount: 0,
        type: 'mastered',
      },
      {
        word: 'mastered-record',
        timeStamp: targetDay,
        wrongCount: 0,
        type: 'mastered',
      },
      {
        word: 'reviewed',
        timeStamp: targetDay,
        wrongCount: 1,
        type: 'review',
      },
    ])
  })
})

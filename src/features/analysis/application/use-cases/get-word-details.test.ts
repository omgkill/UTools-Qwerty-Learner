import type { AnalysisRepository } from '../ports'
import { getWordDetails } from './get-word-details'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import { describe, expect, it, vi } from 'vitest'

describe('getWordDetails use case', () => {
  it('loads records and progress through the repository', async () => {
    const timeStamp = new Date('2026-02-26T10:00:00').valueOf()
    const repository: AnalysisRepository = {
      getAllWordRecords: vi.fn(),
      getDailyRecordsByDict: vi.fn(),
      getWordRecordsByDict: vi.fn().mockResolvedValue([]),
      getWordProgressByDict: vi.fn().mockResolvedValue([
        {
          word: 'mastered',
          dict: 'dict-1',
          masteryLevel: MASTERY_LEVELS.MASTERED,
          nextReviewTime: timeStamp,
          lastReviewTime: timeStamp,
          correctCount: 0,
          wrongCount: 0,
          streak: 0,
          reps: 1,
        },
      ]),
    }

    const result = await getWordDetails(repository, 'dict-1', '2026-02-26')

    expect(repository.getWordRecordsByDict).toHaveBeenCalledWith('dict-1')
    expect(repository.getWordProgressByDict).toHaveBeenCalledWith('dict-1')
    expect(result).toEqual([
      {
        word: 'mastered',
        timeStamp,
        wrongCount: 0,
        type: 'mastered',
      },
    ])
  })
})

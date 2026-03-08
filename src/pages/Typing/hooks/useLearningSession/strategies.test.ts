import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalStrategy, repeatStrategy, consolidateStrategy } from './strategies'
import { createMockUtoolsDB, mockUtools, createTestProgress, createTestDailyRecord } from '@/test/testUtils'
import { setTimeTo, resetTimeDiff } from '@/utils/timeService'

describe('strategies', () => {
  let mockDB: ReturnType<typeof createMockUtoolsDB>
  let cleanup: () => void

  beforeEach(() => {
    mockDB = createMockUtoolsDB()
    cleanup = mockUtools(mockDB)
    setTimeTo('2024-06-15T12:00:00')
  })

  afterEach(() => {
    cleanup()
    mockDB.clear()
    resetTimeDiff()
    vi.clearAllMocks()
  })

  describe('normalStrategy', () => {
    const dictId = 'test-dict'
    const wordList = ['word1', 'word2', 'word3', 'word4', 'word5']

    describe('getWordNames', () => {
      it('应该优先返回到期复习的单词', () => {
        // 设置到期复习单词
        mockDB.setProgress(
          dictId,
          'word1',
          createTestProgress(dictId, 'word1', {
            masteryLevel: 1,
            nextReviewTime: Date.now() - 1000, // 已到期
          })
        )
        mockDB.setProgress(
          dictId,
          'word2',
          createTestProgress(dictId, 'word2', {
            masteryLevel: 2,
            nextReviewTime: Date.now() + 10000, // 未到期
          })
        )

        const result = normalStrategy.getWordNames(dictId, wordList)
        expect(result).toEqual(['word1'])
      })

      it('应该在没有到期单词时返回新单词', () => {
        // 所有单词都是新词
        const result = normalStrategy.getWordNames(dictId, wordList)
        expect(result).toEqual(['word1', 'word2', 'word3', 'word4', 'word5'])
      })

      it('应该限制返回数量为20个', () => {
        const manyWords = Array.from({ length: 30 }, (_, i) => `word${i}`)
        const result = normalStrategy.getWordNames(dictId, manyWords)
        expect(result).toHaveLength(20)
      })

      it('应该不返回已掌握的单词（masteryLevel=7）', () => {
        mockDB.setProgress(
          dictId,
          'word1',
          createTestProgress(dictId, 'word1', {
            masteryLevel: 7,
            nextReviewTime: 0,
          })
        )

        const result = normalStrategy.getWordNames(dictId, wordList)
        expect(result).not.toContain('word1')
      })

      it('应该不返回新词（masteryLevel=0）作为复习单词', () => {
        // word1 有进度但未学习
        mockDB.setProgress(
          dictId,
          'word1',
          createTestProgress(dictId, 'word1', {
            masteryLevel: 0,
            nextReviewTime: 0,
          })
        )

        // 当所有单词都是新词时，应该返回新词
        const result = normalStrategy.getWordNames(dictId, wordList)
        expect(result).toContain('word1')
      })
    })

    describe('getStats', () => {
      it('应该返回正确的统计数据', () => {
        // 设置进度
        mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 7 }))
        mockDB.setProgress(dictId, 'word2', createTestProgress(dictId, 'word2', { masteryLevel: 1 }))
        mockDB.setProgress(dictId, 'word3', createTestProgress(dictId, 'word3', { masteryLevel: 2 }))

        // 设置今日记录
        mockDB.setDailyRecord(
          dictId,
          '2024-06-15',
          createTestDailyRecord(dictId, '2024-06-15', {
            learnedCount: 5,
            reviewedCount: 3,
            masteredCount: 1,
          })
        )

        const stats = normalStrategy.getStats(dictId, wordList)

        expect(stats.todayLearned).toBe(5)
        expect(stats.todayReviewed).toBe(3)
        expect(stats.todayMastered).toBe(1)
        expect(stats.masteredCount).toBe(1) // masteryLevel = 7
        expect(stats.dueCount).toBe(2) // masteryLevel 1-6 中到期的
      })

      it('应该在没有记录时返回默认值', () => {
        const stats = normalStrategy.getStats(dictId, wordList)

        expect(stats.todayLearned).toBe(0)
        expect(stats.todayReviewed).toBe(0)
        expect(stats.todayMastered).toBe(0)
      })
    })

    it('needsSessionPersist 应该为 false', () => {
      expect(normalStrategy.needsSessionPersist).toBe(false)
    })
  })

  describe('repeatStrategy', () => {
    const dictId = 'test-dict'

    describe('getWordNames', () => {
      it('应该返回今日学习的单词', () => {
        mockDB.setDailyRecord(
          dictId,
          '2024-06-15',
          createTestDailyRecord(dictId, '2024-06-15', {
            todayWords: ['word1', 'word2', 'word3'],
          })
        )

        const result = repeatStrategy.getWordNames(dictId, [])
        expect(result).toEqual(['word1', 'word2', 'word3'])
      })

      it('应该在没有今日单词时返回空数组', () => {
        const result = repeatStrategy.getWordNames(dictId, [])
        expect(result).toEqual([])
      })
    })

    describe('getStats', () => {
      it('应该返回默认统计数据', () => {
        const stats = repeatStrategy.getStats(dictId, [])
        expect(stats).toEqual({
          todayLearned: 0,
          todayReviewed: 0,
          todayMastered: 0,
          dueCount: 0,
          newCount: 0,
          masteredCount: 0,
        })
      })
    })

    it('needsSessionPersist 应该为 true', () => {
      expect(repeatStrategy.needsSessionPersist).toBe(true)
    })
  })

  describe('consolidateStrategy', () => {
    const dictId = 'test-dict'

    describe('getWordNames', () => {
      it('应该返回所有未掌握但已学习的单词', () => {
        mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 1 }))
        mockDB.setProgress(dictId, 'word2', createTestProgress(dictId, 'word2', { masteryLevel: 3 }))
        mockDB.setProgress(dictId, 'word3', createTestProgress(dictId, 'word3', { masteryLevel: 7 })) // 已掌握
        mockDB.setProgress(dictId, 'word4', createTestProgress(dictId, 'word4', { masteryLevel: 0 })) // 新词

        const result = consolidateStrategy.getWordNames(dictId, [])
        expect(result).toEqual(['word1', 'word2'])
      })

      it('应该在没有进度时返回空数组', () => {
        const result = consolidateStrategy.getWordNames(dictId, [])
        expect(result).toEqual([])
      })
    })

    describe('getStats', () => {
      it('应该返回默认统计数据', () => {
        const stats = consolidateStrategy.getStats(dictId, [])
        expect(stats).toEqual({
          todayLearned: 0,
          todayReviewed: 0,
          todayMastered: 0,
          dueCount: 0,
          newCount: 0,
          masteredCount: 0,
        })
      })
    })

    it('needsSessionPersist 应该为 true', () => {
      expect(consolidateStrategy.needsSessionPersist).toBe(true)
    })
  })
})
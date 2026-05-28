import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getProgress, setProgress, getOrCreateProgress, updateProgress, getAllProgress, getDueWords, getNewWords, getProgressStats } from './progress'
import { createMockUtoolsDB, mockUtools, createTestProgress } from '@/test/testUtils'
import { setTimeTo, resetTimeDiff } from '@/utils/timeService'

describe('storage/progress', () => {
  let mockDB: ReturnType<typeof createMockUtoolsDB>
  let cleanup: () => void
  const dictId = 'test-dict'

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

  describe('getProgress', () => {
    it('应该返回存储的进度', () => {
      const progress = createTestProgress(dictId, 'word1', { masteryLevel: 2 })
      mockDB.setProgress(dictId, 'word1', progress)

      const result = getProgress(dictId, 'word1')

      expect(result).toEqual(progress)
    })

    it('应该在不存在时返回 null', () => {
      const result = getProgress(dictId, 'nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('setProgress', () => {
    it('应该存储进度数据', () => {
      const progress = createTestProgress(dictId, 'word1', { masteryLevel: 1 })

      setProgress(progress)

      const stored = mockDB.store.get(`progress:${dictId}:word1`)
      expect(stored).toBeDefined()
      expect(stored?.data).toEqual(progress)
    })

    it('应该更新已存在的进度', () => {
      const progress1 = createTestProgress(dictId, 'word1', { masteryLevel: 1 })
      setProgress(progress1)

      const progress2 = createTestProgress(dictId, 'word1', { masteryLevel: 2 })
      setProgress(progress2)

      const result = getProgress(dictId, 'word1')
      expect(result?.masteryLevel).toBe(2)
    })
  })

  describe('getOrCreateProgress', () => {
    it('应该返回已存在的进度', () => {
      const existing = createTestProgress(dictId, 'word1', { masteryLevel: 3 })
      mockDB.setProgress(dictId, 'word1', existing)

      const result = getOrCreateProgress(dictId, 'word1')

      expect(result).toEqual(existing)
    })

    it('应该在不存在时创建新进度', () => {
      const result = getOrCreateProgress(dictId, 'newWord')

      expect(result).toEqual({
        word: 'newWord',
        dict: dictId,
        masteryLevel: 0,
        nextReviewTime: 0,
      })
    })
  })

  describe('updateProgress', () => {
    it('应该提升掌握等级', () => {
      const progress = createTestProgress(dictId, 'word1', { masteryLevel: 1, nextReviewTime: 0 })
      mockDB.setProgress(dictId, 'word1', progress)

      const result = updateProgress(dictId, 'word1')

      expect(result.masteryLevel).toBe(2)
      expect(result.wasNew).toBe(false)
    })

    it('应该设置下次复习时间', () => {
      const progress = createTestProgress(dictId, 'word1', { masteryLevel: 1, nextReviewTime: 0 })
      mockDB.setProgress(dictId, 'word1', progress)

      const result = updateProgress(dictId, 'word1')

      // masteryLevel 2 → 2天后复习
      // 使用 getTodayStartTime 而不是 Date.now()
      const todayStart = new Date(2024, 5, 15).getTime()
      const expectedReviewTime = todayStart + 2 * 24 * 60 * 60 * 1000
      expect(result.nextReviewTime).toBe(expectedReviewTime)
    })

    it('应该标记新词', () => {
      const result = updateProgress(dictId, 'newWord')

      expect(result.wasNew).toBe(true)
      expect(result.masteryLevel).toBe(1)
    })

    it('应该不超过最大等级 7', () => {
      const progress = createTestProgress(dictId, 'word1', { masteryLevel: 7 })
      mockDB.setProgress(dictId, 'word1', progress)

      const result = updateProgress(dictId, 'word1')

      expect(result.masteryLevel).toBe(7)
    })
  })

  describe('getAllProgress', () => {
    it('应该返回所有进度', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 1 }))
      mockDB.setProgress(dictId, 'word2', createTestProgress(dictId, 'word2', { masteryLevel: 2 }))
      mockDB.setProgress(dictId, 'word3', createTestProgress(dictId, 'word3', { masteryLevel: 3 }))

      const result = getAllProgress(dictId)

      expect(result).toHaveLength(3)
      expect(result.map((p) => p.word).sort()).toEqual(['word1', 'word2', 'word3'])
    })

    it('应该只返回指定词库的进度', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1'))
      mockDB.setProgress('other-dict', 'word2', createTestProgress('other-dict', 'word2'))

      const result = getAllProgress(dictId)

      expect(result).toHaveLength(1)
      expect(result[0].word).toBe('word1')
    })

    it('应该在无进度时返回空数组', () => {
      const result = getAllProgress(dictId)
      expect(result).toEqual([])
    })
  })

  describe('getDueWords', () => {
    it('应该返回到期的单词', () => {
      mockDB.setProgress(
        dictId,
        'word1',
        createTestProgress(dictId, 'word1', {
          masteryLevel: 1,
          nextReviewTime: Date.now() - 1000,
        })
      )
      mockDB.setProgress(
        dictId,
        'word2',
        createTestProgress(dictId, 'word2', {
          masteryLevel: 2,
          nextReviewTime: Date.now() + 10000,
        })
      )

      const wordList = ['word1', 'word2']
      const result = getDueWords(dictId, wordList, 20)

      expect(result).toEqual(['word1'])
    })

    it('应该限制返回数量', () => {
      for (let i = 0; i < 30; i++) {
        mockDB.setProgress(
          dictId,
          `word${i}`,
          createTestProgress(dictId, `word${i}`, {
            masteryLevel: 1,
            nextReviewTime: Date.now() - 1000,
          })
        )
      }

      const wordList = Array.from({ length: 30 }, (_, i) => `word${i}`)
      const result = getDueWords(dictId, wordList, 20)

      expect(result).toHaveLength(20)
    })

    it('应该不返回新词（masteryLevel=0）', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 0 }))

      const result = getDueWords(dictId, ['word1'], 20)
      expect(result).toEqual([])
    })

    it('应该不返回已掌握的单词（masteryLevel=7）', () => {
      mockDB.setProgress(
        dictId,
        'word1',
        createTestProgress(dictId, 'word1', {
          masteryLevel: 7,
          nextReviewTime: Date.now() - 1000,
        })
      )

      const result = getDueWords(dictId, ['word1'], 20)
      expect(result).toEqual([])
    })
  })

  describe('getNewWords', () => {
    it('应该返回新词', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 1 }))

      const wordList = ['word1', 'word2', 'word3']
      const result = getNewWords(dictId, wordList, 20)

      expect(result).toEqual(['word2', 'word3'])
    })

    it('应该限制返回数量', () => {
      const wordList = Array.from({ length: 30 }, (_, i) => `word${i}`)
      const result = getNewWords(dictId, wordList, 20)

      expect(result).toHaveLength(20)
    })

    it('应该包含 masteryLevel=0 的单词', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 0 }))

      const result = getNewWords(dictId, ['word1'], 20)
      expect(result).toEqual(['word1'])
    })
  })

  describe('getProgressStats', () => {
    it('应该返回正确的统计', () => {
      mockDB.setProgress(dictId, 'word1', createTestProgress(dictId, 'word1', { masteryLevel: 7 }))
      mockDB.setProgress(dictId, 'word2', createTestProgress(dictId, 'word2', { masteryLevel: 1, nextReviewTime: Date.now() - 1000 }))
      mockDB.setProgress(
        dictId,
        'word3',
        createTestProgress(dictId, 'word3', {
          masteryLevel: 2,
          nextReviewTime: Date.now() - 1000,
        })
      )
      mockDB.setProgress(dictId, 'word4', createTestProgress(dictId, 'word4', { masteryLevel: 0 }))

      const stats = getProgressStats(dictId)

      expect(stats.total).toBe(4)
      expect(stats.learned).toBe(3) // masteryLevel > 0
      expect(stats.mastered).toBe(1) // masteryLevel = 7
      expect(stats.due).toBe(2) // word2 和 word3 都是到期的
    })

    it('应该在没有进度时返回零值', () => {
      const stats = getProgressStats(dictId)

      expect(stats).toEqual({
        total: 0,
        learned: 0,
        mastered: 0,
        due: 0,
      })
    })
  })
})
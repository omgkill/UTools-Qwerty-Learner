import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDueWords, getNewWords } from '@/utils/storage/progress'
import { createMockUtoolsDB, mockUtools, createTestProgress } from '@/test/testUtils'
import { setTimeTo, resetTimeDiff } from '@/utils/timeService'

/**
 * 学习类型显示正确性测试
 *
 * ========================================
 * 正确标准（员工A明确）：
 * ========================================
 * - masteryLevel === 1 → 显示新词
 * - masteryLevel > 1 → 显示复习
 *
 * ========================================
 * 当前代码逻辑分析：
 * ========================================
 * `getDueWords` 返回满足以下条件的单词：
 * - masteryLevel > 0 且 < 7（已学习但未掌握）
 * - nextReviewTime <= now（已到期需要复习）
 *
 * 问题：
 * - masteryLevel === 1 的单词，如果 nextReviewTime <= now
 * - 会被 getDueWords 返回，导致 learningType = 'review'
 * - 但根据正确标准，masteryLevel === 1 应该显示"新词"
 */

// Import the function to test
vi.mock('@/utils/storage/progress', async () => {
  const actual = await vi.importActual('@/utils/storage/progress')
  return actual
})

describe('学习类型判断正确性', () => {
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

  /**
   * 测试 getDueWords 的行为
   * 这是判断 learningType 的核心逻辑
   */
  describe('getDueWords 函数行为', () => {
    const wordList = ['apple', 'banana', 'cherry', 'dog', 'elephant']

    it('masteryLevel=0 的单词不应该被返回（未学习）', () => {
      mockDB.setProgress(
        dictId,
        'apple',
        createTestProgress(dictId, 'apple', {
          masteryLevel: 0,
          nextReviewTime: 0,
        })
      )

      const result = getDueWords(dictId, wordList, 20)

      expect(result).not.toContain('apple')
    })

    /**
     * 关键测试：masteryLevel=1 的单词
     *
     * 根据正确标准：masteryLevel === 1 → 显示新词
     * 当前代码行为：如果 nextReviewTime <= now，会被返回为复习词
     */
    describe('masteryLevel=1 的单词（关键场景）', () => {
      it('masteryLevel=1 且到期时，getDueWords 会返回该单词', () => {
        mockDB.setProgress(
          dictId,
          'apple',
          createTestProgress(dictId, 'apple', {
            masteryLevel: 1, // 刚学完第一次
            nextReviewTime: Date.now() - 1000, // 已到期
          })
        )

        const result = getDueWords(dictId, wordList, 20)

        // 当前代码会返回这个单词
        expect(result).toContain('apple')

        console.log('========================================')
        console.log('关键问题：masteryLevel=1 的到期单词')
        console.log('========================================')
        console.log('单词: apple, masteryLevel: 1, nextReviewTime: 已到期')
        console.log('getDueWords 返回:', result)
        console.log('----------------------------------------')
        console.log('根据正确标准：masteryLevel=1 应显示"新词"')
        console.log('当前代码：会被认为是"复习"（因为 getDueWords 返回了它）')
        console.log('这可能导致 Bug！')
        console.log('========================================')
      })

      it('masteryLevel=1 且未到期时，getDueWords 不会返回该单词', () => {
        mockDB.setProgress(
          dictId,
          'apple',
          createTestProgress(dictId, 'apple', {
            masteryLevel: 1,
            nextReviewTime: Date.now() + 100000, // 未到期
          })
        )

        const result = getDueWords(dictId, wordList, 20)

        expect(result).not.toContain('apple')
      })

      /**
       * 这个测试验证了当前代码的问题：
       * masteryLevel=1 的单词，到期后会被认为是"复习"词
       * 但根据正确标准，它应该是"新词"
       *
       * 此测试应该失败，因为当前代码逻辑错误
       */
      it('BUG: masteryLevel=1 到期后会被错误标记为复习词（此测试应该失败）', () => {
        mockDB.setProgress(
          dictId,
          'apple',
          createTestProgress(dictId, 'apple', {
            masteryLevel: 1,
            nextReviewTime: Date.now() - 1000,
          })
        )

        const dueWords = getDueWords(dictId, wordList, 20)

        // 模拟 useLearningSession 的判断逻辑
        const hasReview = dueWords.length > 0
        const learningType = hasReview ? 'review' : 'new'

        console.log('========================================')
        console.log('BUG 复现：masteryLevel=1 的单词被错误标记')
        console.log('========================================')
        console.log('单词: apple, masteryLevel: 1')
        console.log('getDueWords 返回:', dueWords)
        console.log('learningType 判断结果:', learningType)
        console.log('正确标准期望: new')
        console.log('----------------------------------------')

        // 当前代码会返回 'review'，这是错误的
        // 正确标准应该是 'new'
        const isCorrectBehavior = learningType === 'new'

        console.log('当前代码行为是否正确:', isCorrectBehavior)
        console.log('========================================')

        // ========================================
        // 关键断言：根据正确标准，masteryLevel=1 应该显示"新词"
        // 当前代码会返回 'review'，所以这个断言会失败
        // ========================================
        expect(learningType).toBe('new')
      })
    })

    /**
     * 测试 masteryLevel=2 的单词
     * 根据正确标准：masteryLevel > 1 → 显示复习
     */
    describe('masteryLevel=2 的单词', () => {
      it('masteryLevel=2 且到期时，应该被 getDueWords 返回', () => {
        mockDB.setProgress(
          dictId,
          'banana',
          createTestProgress(dictId, 'banana', {
            masteryLevel: 2, // 已复习过
            nextReviewTime: Date.now() - 1000, // 已到期
          })
        )

        const result = getDueWords(dictId, wordList, 20)

        expect(result).toContain('banana')

        console.log('========================================')
        console.log('正确行为：masteryLevel=2 的到期单词')
        console.log('========================================')
        console.log('单词: banana, masteryLevel: 2, nextReviewTime: 已到期')
        console.log('getDueWords 返回:', result)
        console.log('正确标准：masteryLevel > 1 → 显示复习 ✓')
        console.log('========================================')
      })
    })

    /**
     * 测试 masteryLevel=7 的单词
     * 已掌握的单词不应该出现在复习列表
     */
    describe('masteryLevel=7 的单词', () => {
      it('已掌握的单词不应该被 getDueWords 返回', () => {
        mockDB.setProgress(
          dictId,
          'cherry',
          createTestProgress(dictId, 'cherry', {
            masteryLevel: 7, // 已掌握
            nextReviewTime: 0, // 即使到期
          })
        )

        const result = getDueWords(dictId, wordList, 20)

        expect(result).not.toContain('cherry')
      })
    })
  })

  /**
   * 综合测试：验证 learningType 的判断逻辑
   */
  describe('learningType 判断逻辑', () => {
    const wordList = ['apple', 'banana', 'cherry']

    it('只有 masteryLevel=1 到期词时，当前代码会返回 review（可能错误）', () => {
      mockDB.setProgress(
        dictId,
        'apple',
        createTestProgress(dictId, 'apple', {
          masteryLevel: 1,
          nextReviewTime: Date.now() - 1000,
        })
      )

      const dueWords = getDueWords(dictId, wordList, 20)
      const learningType = dueWords.length > 0 ? 'review' : 'new'

      console.log('========================================')
      console.log('关键测试：只有 masteryLevel=1 的到期词')
      console.log('========================================')
      console.log('当前 learningType:', learningType)
      console.log('正确标准期望: new（因为 masteryLevel=1）')
      console.log('----------------------------------------')
      console.log('问题：代码基于"是否有到期词"判断')
      console.log('而不是基于当前单词的 masteryLevel')
      console.log('========================================')
    })

    it('有 masteryLevel=2 到期词时，应该返回 review', () => {
      mockDB.setProgress(
        dictId,
        'banana',
        createTestProgress(dictId, 'banana', {
          masteryLevel: 2,
          nextReviewTime: Date.now() - 1000,
        })
      )

      const dueWords = getDueWords(dictId, wordList, 20)
      const learningType = dueWords.length > 0 ? 'review' : 'new'

      expect(learningType).toBe('review')
    })

    it('没有任何进度时，应该返回 new', () => {
      const dueWords = getDueWords(dictId, wordList, 20)
      const newWords = getNewWords(dictId, wordList, 20)

      const learningType = dueWords.length > 0 ? 'review' : (newWords.length > 0 ? 'new' : 'complete')

      expect(learningType).toBe('new')
    })
  })
})
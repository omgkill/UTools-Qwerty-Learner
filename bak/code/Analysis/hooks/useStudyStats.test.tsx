// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'
import { useStudyStats, useDayStats, useWordDetails } from './useStudyStats'
import { getDailyRecords, getAllProgress } from '@/utils/storage'
import { wordBanksAtom } from '@/store'
import type { DailyRecord, WordProgress, WordBank } from '@/types'

// Mock storage functions
vi.mock('@/utils/storage', () => ({
  getDailyRecords: vi.fn(),
  getAllProgress: vi.fn(),
}))

const testWordBanks: WordBank[] = [
  { id: 'test-dict', name: 'Test Dictionary', file: 'test.json', language: 'en' },
  { id: 'other-dict', name: 'Other Dictionary', file: 'other.json', language: 'en' },
]

const mockDailyRecords: DailyRecord[] = [
  {
    dict: 'test-dict',
    date: '2026-03-18',
    learnedCount: 2,
    reviewedCount: 3,
    masteredCount: 1,
    todayWords: ['apple', 'banana', 'cherry', 'dog', 'elephant', 'mastered'],
    wordTypes: {
      apple: 'new',
      banana: 'new',
      cherry: 'review',
      dog: 'review',
      elephant: 'review',
      mastered: 'review',
    },
  },
  {
    dict: 'test-dict',
    date: '2026-03-17',
    learnedCount: 1,
    reviewedCount: 0,
    masteredCount: 0,
    todayWords: ['old-word'],
    wordTypes: {
      'old-word': 'new',
    },
  },
]

const mockProgress: WordProgress[] = [
  { word: 'apple', dict: 'test-dict', masteryLevel: 1, nextReviewTime: Date.now() },
  { word: 'banana', dict: 'test-dict', masteryLevel: 2, nextReviewTime: Date.now() },
  { word: 'cherry', dict: 'test-dict', masteryLevel: 3, nextReviewTime: Date.now() },
  { word: 'dog', dict: 'test-dict', masteryLevel: 1, nextReviewTime: Date.now() }, // masteryLevel=1 但是复习词
  { word: 'elephant', dict: 'test-dict', masteryLevel: 2, nextReviewTime: Date.now() },
  { word: 'mastered', dict: 'test-dict', masteryLevel: 7, nextReviewTime: Date.now() },
  { word: 'old-word', dict: 'test-dict', masteryLevel: 1, nextReviewTime: Date.now() },
  { word: 'legacy-word', dict: 'test-dict', masteryLevel: 1, nextReviewTime: Date.now() },
]

describe('useStudyStats', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    store.set(wordBanksAtom, testWordBanks)
    vi.mocked(getDailyRecords).mockReturnValue(mockDailyRecords)
    vi.mocked(getAllProgress).mockReturnValue(mockProgress)
  })

  afterEach(() => {
    cleanup()
  })

  // Helper to create wrapper with Jotai store
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={store}>{children}</Provider>
    }
  }

  describe('useWordDetails', () => {
    it('应该返回指定日期的单词详情', () => {
      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.words.length).toBe(6)
    })

    it('应该根据 wordTypes 正确识别新词', () => {
      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      const apple = result.current.words.find((w) => w.word === 'apple')
      expect(apple?.type).toBe('new')
    })

    it('应该根据 wordTypes 正确识别复习词', () => {
      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      const cherry = result.current.words.find((w) => w.word === 'cherry')
      expect(cherry?.type).toBe('review')
    })

    it('应该正确识别已掌握单词', () => {
      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      const mastered = result.current.words.find((w) => w.word === 'mastered')
      expect(mastered?.type).toBe('mastered')
    })

    /**
     * Bug 复现测试：学习类型不一致问题
     *
     * 场景：
     * - 单词 "dog" 的 masteryLevel = 1
     * - 用户复习这个单词（isNew = false）
     * - wordTypes 存储为 'review'
     *
     * 修复前：
     * - useWordDetails 根据 masteryLevel === 1 判断为 'new'
     * - 统计显示"新词"，与界面"复习"不一致
     *
     * 修复后：
     * - useWordDetails 优先使用 wordTypes
     * - 统计显示"复习"，与界面一致
     */
    it('BUG 复现：masteryLevel=1 的复习词应显示为 review（不是 new）', () => {
      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      // dog 的 masteryLevel=1，但 wordTypes 存储为 'review'
      // 修复前会返回 'new'，修复后应返回 'review'
      const dog = result.current.words.find((w) => w.word === 'dog')

      // 关键断言：应该使用 wordTypes 而非 masteryLevel
      expect(dog?.type).toBe('review')
    })

    it('当 wordTypes 缺失时应回退到 masteryLevel 判断', () => {
      // 模拟旧数据格式（没有 wordTypes）
      const oldRecord: DailyRecord = {
        dict: 'test-dict',
        date: '2026-03-16',
        learnedCount: 1,
        reviewedCount: 0,
        masteredCount: 0,
        todayWords: ['legacy-word'],
        // 没有 wordTypes 字段
      }

      vi.mocked(getDailyRecords).mockReturnValue([oldRecord])

      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-16'), {
        wrapper: createWrapper(),
      })

      // 没有存储的类型时，使用 masteryLevel 推断
      const legacyWord = result.current.words.find((w) => w.word === 'legacy-word')
      expect(legacyWord?.type).toBe('new') // masteryLevel=1 推断为新词
    })

    it('dictId 或 date 为空时应返回空数组', () => {
      const { result: result1 } = renderHook(() => useWordDetails(null, '2026-03-18'), {
        wrapper: createWrapper(),
      })
      expect(result1.current.words).toEqual([])

      const { result: result2 } = renderHook(() => useWordDetails('test-dict', null), {
        wrapper: createWrapper(),
      })
      expect(result2.current.words).toEqual([])
    })

    it('找不到记录时应返回空数组', () => {
      vi.mocked(getDailyRecords).mockReturnValue([])

      const { result } = renderHook(() => useWordDetails('test-dict', '2026-03-18'), {
        wrapper: createWrapper(),
      })

      expect(result.current.words).toEqual([])
    })
  })

  describe('useDayStats', () => {
    it('应该返回指定词典的每日统计', () => {
      const { result } = renderHook(() => useDayStats('test-dict'), {
        wrapper: createWrapper(),
      })

      expect(result.current.days.length).toBe(2)
      expect(result.current.days[0].date).toBe('2026-03-18')
      expect(result.current.days[0].learnedCount).toBe(2)
      expect(result.current.days[0].reviewedCount).toBe(3)
    })

    it('dictId 为空时应返回空数组', () => {
      const { result } = renderHook(() => useDayStats(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.days).toEqual([])
    })

    it('应该过滤掉没有学习记录的日期', () => {
      const emptyRecord: DailyRecord = {
        dict: 'test-dict',
        date: '2026-03-15',
        learnedCount: 0,
        reviewedCount: 0,
        masteredCount: 0,
        todayWords: [],
        wordTypes: {},
      }

      vi.mocked(getDailyRecords).mockReturnValue([...mockDailyRecords, emptyRecord])

      const { result } = renderHook(() => useDayStats('test-dict'), {
        wrapper: createWrapper(),
      })

      // 不应包含空记录的日期
      expect(result.current.days.find((d) => d.date === '2026-03-15')).toBeUndefined()
    })
  })

  describe('useStudyStats', () => {
    it('应该返回所有词典的统计信息', () => {
      const { result } = renderHook(() => useStudyStats(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.dictStats.length).toBeGreaterThan(0)
    })
  })
})
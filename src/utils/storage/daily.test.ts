import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDailyRecord,
  setDailyRecord,
  getOrCreateDailyRecord,
  addLearnedWord,
  addMasteredWord,
  getTodayWords,
  hasLearnedToday,
} from './daily'
import type { DailyRecord } from '@/types'

// Mock timeService
vi.mock('@/utils/timeService', () => ({
  getTodayDate: () => '2026-03-18',
}))

describe('daily storage', () => {
  const mockDb = {
    storage: new Map<string, { _id: string; _rev?: string; data: unknown }>(),
    get: vi.fn((key: string) => mockDb.storage.get(key)),
    put: vi.fn((doc: { _id: string; data: unknown }) => {
      mockDb.storage.set(doc._id, { _id: doc._id, _rev: '1', data: doc.data })
    }),
    allDocs: vi.fn(() => Array.from(mockDb.storage.values())),
  }

  beforeEach(() => {
    mockDb.storage.clear()
    vi.stubGlobal('window', {
      utools: { db: mockDb },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getOrCreateDailyRecord', () => {
    it('应该创建新的空记录', () => {
      const record = getOrCreateDailyRecord('test-dict', '2026-03-18')

      expect(record).toEqual({
        dict: 'test-dict',
        date: '2026-03-18',
        learnedCount: 0,
        reviewedCount: 0,
        masteredCount: 0,
        todayWords: [],
        wordTypes: {},
      })
    })

    it('应该返回已存在的记录', () => {
      const existing: DailyRecord = {
        dict: 'test-dict',
        date: '2026-03-18',
        learnedCount: 5,
        reviewedCount: 3,
        masteredCount: 1,
        todayWords: ['apple', 'banana'],
        wordTypes: { apple: 'new', banana: 'review' },
      }
      mockDb.storage.set('daily:test-dict:2026-03-18', { _id: 'daily:test-dict:2026-03-18', data: existing })

      const record = getOrCreateDailyRecord('test-dict', '2026-03-18')

      expect(record).toEqual(existing)
    })
  })

  describe('addLearnedWord', () => {
    it('应该添加新词并标记为 new', () => {
      const record = addLearnedWord('test-dict', 'apple', true)

      expect(record.todayWords).toContain('apple')
      expect(record.wordTypes['apple']).toBe('new')
      expect(record.learnedCount).toBe(1)
      expect(record.reviewedCount).toBe(0)
    })

    it('应该添加复习词并标记为 review', () => {
      const record = addLearnedWord('test-dict', 'banana', false)

      expect(record.todayWords).toContain('banana')
      expect(record.wordTypes['banana']).toBe('review')
      expect(record.learnedCount).toBe(0)
      expect(record.reviewedCount).toBe(1)
    })

    it('同一个单词不应重复添加到 todayWords', () => {
      addLearnedWord('test-dict', 'apple', true)
      const record = addLearnedWord('test-dict', 'apple', false)

      expect(record.todayWords.filter((w) => w === 'apple')).toHaveLength(1)
    })

    it('同一个单词重复学习应更新 wordTypes', () => {
      addLearnedWord('test-dict', 'apple', true)
      const record = addLearnedWord('test-dict', 'apple', false)

      // 最后一次学习类型应该覆盖
      expect(record.wordTypes['apple']).toBe('review')
    })
  })

  describe('addMasteredWord', () => {
    it('应该增加掌握数量', () => {
      const record = addMasteredWord('test-dict')

      expect(record.masteredCount).toBe(1)
    })
  })

  describe('getTodayWords', () => {
    it('应该返回今日学习的单词列表', () => {
      addLearnedWord('test-dict', 'apple', true)
      addLearnedWord('test-dict', 'banana', false)

      const words = getTodayWords('test-dict')

      expect(words).toEqual(['apple', 'banana'])
    })
  })

  describe('hasLearnedToday', () => {
    it('应该返回 true 如果已学习', () => {
      addLearnedWord('test-dict', 'apple', true)

      expect(hasLearnedToday('test-dict', 'apple')).toBe(true)
    })

    it('应该返回 false 如果未学习', () => {
      expect(hasLearnedToday('test-dict', 'apple')).toBe(false)
    })
  })

  /**
   * Bug 复现测试：学习类型不一致问题
   *
   * 问题描述：
   * - 用户学习一个复习单词（界面显示"复习"）
   * - 但统计页面显示"新词"，因为之前是根据 masteryLevel 判断
   *
   * 修复验证：
   * - wordTypes 字段正确存储每个单词的学习类型
   * - 统计时使用 wordTypes 而非 masteryLevel
   */
  describe('学习类型一致性（Bug 复现）', () => {
    it('应该正确存储复习单词的类型为 review（不是 new）', () => {
      // 模拟：用户复习一个 masteryLevel=1 的单词
      // 修复前：会被错误地标记为新词（因为 masteryLevel === 1）
      // 修复后：正确标记为 review（因为 isNew=false）
      const record = addLearnedWord('test-dict', 'existing-word', false)

      expect(record.wordTypes['existing-word']).toBe('review')
      expect(record.reviewedCount).toBe(1)
      expect(record.learnedCount).toBe(0)
    })

    it('应该正确存储新词的类型为 new', () => {
      // 模拟：用户学习一个全新的单词
      const record = addLearnedWord('test-dict', 'brand-new-word', true)

      expect(record.wordTypes['brand-new-word']).toBe('new')
      expect(record.learnedCount).toBe(1)
    })

    it('混合学习场景：新词和复习词应该分别正确记录', () => {
      // 模拟：用户学习 2 个新词和 3 个复习词
      addLearnedWord('test-dict', 'new1', true)
      addLearnedWord('test-dict', 'new2', true)
      addLearnedWord('test-dict', 'review1', false)
      addLearnedWord('test-dict', 'review2', false)
      addLearnedWord('test-dict', 'review3', false)

      const record = getDailyRecord('test-dict', '2026-03-18')

      expect(record?.learnedCount).toBe(2)
      expect(record?.reviewedCount).toBe(3)
      expect(record?.wordTypes).toEqual({
        new1: 'new',
        new2: 'new',
        review1: 'review',
        review2: 'review',
        review3: 'review',
      })
    })
  })
})
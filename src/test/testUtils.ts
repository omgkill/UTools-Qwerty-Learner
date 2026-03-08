import { vi } from 'vitest'
import type { WordProgress, DailyRecord } from '@/types'

/**
 * Mock uTools DB
 */
export function createMockUtoolsDB() {
  const store = new Map<string, { _id: string; _rev?: string; data: unknown }>()

  return {
    store,
    db: {
      get: vi.fn((_id: string) => {
        return store.get(_id)
      }),
      put: vi.fn((doc: { _id: string; data: unknown; _rev?: string }) => {
        const existing = store.get(doc._id)
        store.set(doc._id, {
          _id: doc._id,
          _rev: doc._rev || `${Date.now()}`,
          data: doc.data,
        })
        return { ok: true, id: doc._id, rev: doc._rev || `${Date.now()}` }
      }),
      allDocs: vi.fn(() => {
        return Array.from(store.values())
      }),
    },
    clear: () => store.clear(),
    setProgress: (dictId: string, word: string, progress: WordProgress) => {
      const _id = `progress:${dictId}:${word}`
      store.set(_id, { _id, data: progress, _rev: '1' })
    },
    setDailyRecord: (dictId: string, date: string, record: DailyRecord) => {
      const _id = `daily:${dictId}:${date}`
      store.set(_id, { _id, data: record, _rev: '1' })
    },
    setSession: (key: string, dictId: string, data: { index: number; wordNames: string[] }) => {
      const _id = `session:${key}:${dictId}`
      store.set(_id, { _id, data: { ...data, dictId }, _rev: '1' })
    },
  }
}

/**
 * Mock window.utools
 */
export function mockUtools(mockDB: ReturnType<typeof createMockUtoolsDB>) {
  // 在 Node 环境中创建全局 window 对象
  if (typeof globalThis.window === 'undefined') {
    ;(globalThis as Record<string, unknown>).window = {}
  }

  const originalUtools = (globalThis.window as Record<string, unknown>).utools

  Object.defineProperty(globalThis.window, 'utools', {
    value: {
      db: mockDB.db,
      getPath: vi.fn(() => '/mock/path'),
      onPluginEnter: vi.fn(),
      onPluginOut: vi.fn(),
    },
    writable: true,
    configurable: true,
  })

  return () => {
    if (originalUtools) {
      Object.defineProperty(globalThis.window, 'utools', { value: originalUtools })
    } else {
      delete (globalThis.window as Record<string, unknown>).utools
    }
  }
}

/**
 * 创建测试用的单词列表
 */
export function createTestWords(count: number): Array<{ name: string; trans: string[] }> {
  return Array.from({ length: count }, (_, i) => ({
    name: `word${i + 1}`,
    trans: [`翻译${i + 1}`],
  }))
}

/**
 * 创建测试用的词库配置
 */
export function createTestWordBank(overrides: Partial<{ id: string; url: string; languageCategory: string }> = {}) {
  return {
    id: 'test-dict',
    name: 'Test Dictionary',
    url: '/test-words.json',
    languageCategory: 'en',
    ...overrides,
  }
}

/**
 * 创建测试用的进度数据
 */
export function createTestProgress(
  dictId: string,
  word: string,
  overrides: Partial<WordProgress> = {}
): WordProgress {
  return {
    word,
    dict: dictId,
    masteryLevel: 0,
    nextReviewTime: 0,
    ...overrides,
  }
}

/**
 * 创建测试用的每日记录
 */
export function createTestDailyRecord(
  dictId: string,
  date: string,
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    dict: dictId,
    date,
    learnedCount: 0,
    reviewedCount: 0,
    masteredCount: 0,
    todayWords: [],
    ...overrides,
  }
}
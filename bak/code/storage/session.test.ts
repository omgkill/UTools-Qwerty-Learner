import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSessionProgress, saveSessionProgress } from '@/utils/storage/session'
import { createMockUtoolsDB, mockUtools } from '@/test/testUtils'

describe('session storage', () => {
  let mockDB: ReturnType<typeof createMockUtoolsDB>
  let cleanup: () => void

  beforeEach(() => {
    mockDB = createMockUtoolsDB()
    cleanup = mockUtools(mockDB)
  })

  afterEach(() => {
    cleanup()
    mockDB.clear()
    vi.clearAllMocks()
  })

  describe('saveSessionProgress', () => {
    it('应该保存会话进度数据', () => {
      const key = 'normal-learning'
      const dictId = 'test-dict'
      const index = 5
      const wordNames = ['apple', 'banana', 'cherry']

      saveSessionProgress(key, dictId, index, wordNames)

      expect(mockDB.db.put).toHaveBeenCalled()
      const savedDoc = mockDB.store.get(`session:${key}:${dictId}`)
      expect(savedDoc?.data).toEqual({ index, wordNames, dictId })
    })

    it('应该更新已存在的会话进度', () => {
      const key = 'repeat-learning'
      const dictId = 'test-dict'

      // 第一次保存
      saveSessionProgress(key, dictId, 3, ['word1', 'word2'])

      // 第二次保存（更新）
      saveSessionProgress(key, dictId, 5, ['word1', 'word2', 'word3'])

      const savedDoc = mockDB.store.get(`session:${key}:${dictId}`)
      expect(savedDoc?.data).toEqual({
        index: 5,
        wordNames: ['word1', 'word2', 'word3'],
        dictId,
      })
    })

    it('在没有 utools.db 时不应执行操作', () => {
      delete (window as Record<string, unknown>).utools

      saveSessionProgress('test-key', 'test-dict', 0, [])

      expect(mockDB.db.put).not.toHaveBeenCalled()
    })
  })

  describe('loadSessionProgress', () => {
    it('应该加载已保存的会话进度', () => {
      const key = 'normal-learning'
      const dictId = 'test-dict'

      mockDB.setSession(key, dictId, { index: 10, wordNames: ['apple', 'banana'] })

      const result = loadSessionProgress(key, dictId)

      expect(result).toEqual({
        index: 10,
        wordNames: ['apple', 'banana'],
        dictId,
      })
    })

    it('应该在不存在进度时返回默认值', () => {
      const result = loadSessionProgress('new-key', 'new-dict')

      expect(result).toEqual({
        index: 0,
        wordNames: [],
        dictId: 'new-dict',
      })
    })

    it('在没有 utools.db 时返回默认值', () => {
      delete (window as Record<string, unknown>).utools

      const result = loadSessionProgress('test-key', 'test-dict')

      expect(result).toEqual({
        index: 0,
        wordNames: [],
        dictId: 'test-dict',
      })
    })

    it('应该正确处理空 wordNames', () => {
      const key = 'consolidate-learning'
      const dictId = 'test-dict'

      mockDB.setSession(key, dictId, { index: 0, wordNames: [] })

      const result = loadSessionProgress(key, dictId)

      expect(result.wordNames).toEqual([])
      expect(result.index).toBe(0)
    })
  })

  describe('会话恢复流程', () => {
    it('完整流程：保存后加载应返回相同数据', () => {
      const key = 'repeat-learning'
      const dictId = 'test-dict'
      const originalData = {
        index: 15,
        wordNames: ['word1', 'word2', 'word3', 'word4', 'word5'],
      }

      saveSessionProgress(key, dictId, originalData.index, originalData.wordNames)

      const loaded = loadSessionProgress(key, dictId)

      expect(loaded.index).toBe(originalData.index)
      expect(loaded.wordNames).toEqual(originalData.wordNames)
      expect(loaded.dictId).toBe(dictId)
    })

    it('不同词典的会话进度应独立存储', () => {
      const key = 'normal-learning'
      const dict1 = 'dict-1'
      const dict2 = 'dict-2'

      saveSessionProgress(key, dict1, 5, ['a', 'b', 'c'])
      saveSessionProgress(key, dict2, 10, ['x', 'y', 'z'])

      const result1 = loadSessionProgress(key, dict1)
      const result2 = loadSessionProgress(key, dict2)

      expect(result1.index).toBe(5)
      expect(result1.wordNames).toEqual(['a', 'b', 'c'])
      expect(result2.index).toBe(10)
      expect(result2.wordNames).toEqual(['x', 'y', 'z'])
    })

    it('不同学习模式的会话进度应独立存储', () => {
      const dictId = 'test-dict'
      const key1 = 'repeat-learning'
      const key2 = 'consolidate-learning'

      saveSessionProgress(key1, dictId, 3, ['repeat1', 'repeat2'])
      saveSessionProgress(key2, dictId, 7, ['consolidate1', 'consolidate2'])

      const result1 = loadSessionProgress(key1, dictId)
      const result2 = loadSessionProgress(key2, dictId)

      expect(result1.wordNames).toEqual(['repeat1', 'repeat2'])
      expect(result2.wordNames).toEqual(['consolidate1', 'consolidate2'])
    })
  })

  describe('边界情况', () => {
    it('应该处理大量单词列表', () => {
      const key = 'normal-learning'
      const dictId = 'large-dict'
      const largeWordNames = Array.from({ length: 1000 }, (_, i) => `word${i}`)

      saveSessionProgress(key, dictId, 500, largeWordNames)

      const result = loadSessionProgress(key, dictId)

      expect(result.wordNames.length).toBe(1000)
      expect(result.index).toBe(500)
    })

    it('应该处理 index 大于 wordNames 长度的情况', () => {
      const key = 'test-key'
      const dictId = 'test-dict'

      // 保存的 index 可能比实际单词数大（如果单词列表被裁剪）
      saveSessionProgress(key, dictId, 100, ['word1', 'word2', 'word3'])

      const result = loadSessionProgress(key, dictId)

      // 加载后返回原始数据，使用者需要处理 index 校验
      expect(result.index).toBe(100)
      expect(result.wordNames.length).toBe(3)
    })
  })
})
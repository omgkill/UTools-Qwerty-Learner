import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider, createStore, useAtomValue, useSetAtom } from 'jotai'
import type { ReactNode } from 'react'
import {
  wordsAtom,
  currentIndexAtom,
  currentWordAtom,
  setWordsAtom,
  setCurrentIndexAtom,
  resetProgressAtom,
} from './wordListAtoms'
import {
  isLoadingAtom,
  hasWordsAtom,
  learningTypeAtom,
  sessionStatsAtom,
  resetSessionAtom,
  setLearningTypeAtom,
} from './sessionAtoms'
import {
  isTypingAtom,
  isFinishedAtom,
  resetUIStateAtom,
  isRepeatLearningAtom,
  isShowSkipAtom,
  isCurrentWordMasteredAtom,
  setIsRepeatLearningAtom,
} from './uiAtoms'
import {
  correctCountAtom,
  wrongCountAtom,
  timerDataAtom,
  resetStatsAtom,
} from './statsAtoms'
import { useResetAll } from '../hooks/useResetAll'

describe('词典切换数据验证', () => {
  let store: ReturnType<typeof createStore>

  function createWrapper(s: ReturnType<typeof createStore>) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={s}>{children}</Provider>
    }
  }

  beforeEach(() => {
    store = createStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('atoms 状态管理', () => {
    it('单词列表可以被正确设置', () => {
      const testWords = [
        { name: 'apple', trans: ['苹果'], index: 0 },
        { name: 'banana', trans: ['香蕉'], index: 1 },
      ]

      store.set(setWordsAtom, testWords)

      expect(store.get(wordsAtom)).toHaveLength(2)
      expect(store.get(currentIndexAtom)).toBe(0)
    })

    it('当前单词可以被正确获取', () => {
      store.set(wordsAtom, [
        { name: 'test', trans: ['测试'], index: 0 },
      ])
      store.set(currentIndexAtom, 0)

      const currentWord = store.get(currentWordAtom)

      expect(currentWord?.name).toBe('test')
    })
  })

  describe('useResetAll Hook', () => {
    it('应该重置所有状态', () => {
      // 设置初始状态
      store.set(wordsAtom, [{ name: 'word1', trans: ['词1'], index: 0 }])
      store.set(currentIndexAtom, 5)
      store.set(learningTypeAtom, 'review')
      store.set(sessionStatsAtom, {
        todayLearned: 10,
        todayReviewed: 5,
        todayMastered: 2,
        dueCount: 3,
        newCount: 20,
        masteredCount: 5,
      })
      store.set(correctCountAtom, 100)
      store.set(wrongCountAtom, 20)
      store.set(timerDataAtom, { time: 60, accuracy: 80, wpm: 30 })
      store.set(isTypingAtom, true)
      store.set(isFinishedAtom, true)

      // 使用 useResetAll
      const { result } = renderHook(() => useResetAll(), {
        wrapper: createWrapper(store),
      })

      act(() => {
        result.current()
      })

      // 验证重置后的状态
      expect(store.get(currentIndexAtom)).toBe(0)
      expect(store.get(correctCountAtom)).toBe(0)
      expect(store.get(wrongCountAtom)).toBe(0)
      expect(store.get(timerDataAtom)).toEqual({ time: 0, accuracy: 0, wpm: 0 })
      expect(store.get(isTypingAtom)).toBe(true)
      expect(store.get(isFinishedAtom)).toBe(false)
    })

    it('resetSessionAtom 应该重置会话状态', () => {
      store.set(isLoadingAtom, false)
      store.set(hasWordsAtom, false)
      store.set(learningTypeAtom, 'new')
      store.set(sessionStatsAtom, {
        todayLearned: 5,
        todayReviewed: 3,
        todayMastered: 1,
        dueCount: 10,
        newCount: 50,
        masteredCount: 3,
      })

      store.set(resetSessionAtom)

      expect(store.get(isLoadingAtom)).toBe(true)
      expect(store.get(hasWordsAtom)).toBe(true)
      expect(store.get(learningTypeAtom)).toBe('review')
      expect(store.get(sessionStatsAtom)).toEqual({
        todayLearned: 0,
        todayReviewed: 0,
        todayMastered: 0,
        dueCount: 0,
        newCount: 0,
        masteredCount: 0,
      })
    })

    it('resetStatsAtom 应该重置统计状态', () => {
      store.set(correctCountAtom, 50)
      store.set(wrongCountAtom, 10)
      store.set(timerDataAtom, { time: 120, accuracy: 83, wpm: 25 })

      store.set(resetStatsAtom)

      expect(store.get(correctCountAtom)).toBe(0)
      expect(store.get(wrongCountAtom)).toBe(0)
      expect(store.get(timerDataAtom)).toEqual({ time: 0, accuracy: 0, wpm: 0 })
    })

    it('resetUIStateAtom 应该重置 UI 状态', () => {
      store.set(isTypingAtom, false)
      store.set(isFinishedAtom, true)
      store.set(isShowSkipAtom, true)
      store.set(isCurrentWordMasteredAtom, true)

      store.set(resetUIStateAtom)

      expect(store.get(isTypingAtom)).toBe(true)
      expect(store.get(isFinishedAtom)).toBe(false)
      expect(store.get(isShowSkipAtom)).toBe(false)
      expect(store.get(isCurrentWordMasteredAtom)).toBe(false)
    })

    it('resetProgressAtom 应该重置进度索引', () => {
      store.set(currentIndexAtom, 10)

      store.set(resetProgressAtom)

      expect(store.get(currentIndexAtom)).toBe(0)
    })
  })

  describe('词典切换场景', () => {
    it('切换词典时旧单词列表应该被清空', () => {
      // 设置词典A的数据
      const wordsA = [
        { name: 'dictA-word1', trans: ['词A1'], index: 0 },
        { name: 'dictA-word2', trans: ['词A2'], index: 1 },
      ]
      store.set(setWordsAtom, wordsA)
      store.set(currentIndexAtom, 1)

      // 模拟切换词典：设置新词典B的数据
      const wordsB = [
        { name: 'dictB-word1', trans: ['词B1'], index: 0 },
        { name: 'dictB-word2', trans: ['词B2'], index: 1 },
      ]
      store.set(setWordsAtom, wordsB)

      // 验证新数据正确
      expect(store.get(wordsAtom)).toHaveLength(2)
      expect(store.get(wordsAtom)[0].name).toBe('dictB-word1')
      expect(store.get(currentIndexAtom)).toBe(0)
    })

    it('切换词典时统计数据应该重置', () => {
      // 设置词典A的学习统计
      store.set(correctCountAtom, 50)
      store.set(wrongCountAtom, 10)
      store.set(timerDataAtom, { time: 120, accuracy: 83, wpm: 25 })

      // 模拟切换词典：重置统计
      store.set(resetStatsAtom)

      // 验证统计已重置
      expect(store.get(correctCountAtom)).toBe(0)
      expect(store.get(wrongCountAtom)).toBe(0)
      expect(store.get(timerDataAtom)).toEqual({ time: 0, accuracy: 0, wpm: 0 })
    })

    it('切换词典时学习类型应该重置为默认值', () => {
      store.set(learningTypeAtom, 'new')
      store.set(isRepeatLearningAtom, true)

      // 模拟切换词典：重置会话状态和repeatLearning标记
      store.set(resetSessionAtom)
      store.set(setIsRepeatLearningAtom, false)

      expect(store.get(learningTypeAtom)).toBe('review')
      expect(store.get(isRepeatLearningAtom)).toBe(false)
    })

    it('切换词典完整流程验证', () => {
      // 1. 设置词典A的完整状态
      store.set(setWordsAtom, [
        { name: 'apple', trans: ['苹果'], index: 0 },
        { name: 'banana', trans: ['香蕉'], index: 1 },
      ])
      store.set(currentIndexAtom, 1)
      store.set(learningTypeAtom, 'review')
      store.set(correctCountAtom, 15)
      store.set(wrongCountAtom, 3)
      store.set(timerDataAtom, { time: 30, accuracy: 83, wpm: 30 })
      store.set(isTypingAtom, true)
      store.set(isFinishedAtom, false)

      // 2. 切换词典：重置所有状态
      store.set(resetSessionAtom)
      store.set(resetStatsAtom)
      store.set(resetUIStateAtom)
      store.set(resetProgressAtom)

      // 3. 加载词典B的数据
      store.set(setWordsAtom, [
        { name: 'cat', trans: ['猫'], index: 0 },
        { name: 'dog', trans: ['狗'], index: 1 },
      ])
      store.set(setLearningTypeAtom, 'new')

      // 4. 验证最终状态
      expect(store.get(wordsAtom)[0].name).toBe('cat')
      expect(store.get(currentIndexAtom)).toBe(0)
      expect(store.get(learningTypeAtom)).toBe('new')
      expect(store.get(correctCountAtom)).toBe(0)
      expect(store.get(timerDataAtom)).toEqual({ time: 0, accuracy: 0, wpm: 0 })
      expect(store.get(isTypingAtom)).toBe(true)
      expect(store.get(isFinishedAtom)).toBe(false)
    })
  })

  describe('数据独立性验证', () => {
    it('不同词典的进度存储应该独立', () => {
      // 词典A的单词
      store.set(setWordsAtom, [{ name: 'wordA', trans: ['词A'], index: 0 }])
      const wordsA = store.get(wordsAtom)

      // 切换到词典B
      store.set(setWordsAtom, [{ name: 'wordB', trans: ['词B'], index: 0 }])
      const wordsB = store.get(wordsAtom)

      // 验证两个词典的单词不同
      expect(wordsA[0].name).toBe('wordA')
      expect(wordsB[0].name).toBe('wordB')
    })
  })
})
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'
import {
  wordsAtom,
  currentIndexAtom,
} from '../store/atoms/wordListAtoms'
import {
  isTypingAtom,
  isImmersiveModeAtom,
  isTransVisibleAtom,
  isExtraReviewAtom,
  isRepeatLearningAtom,
} from '../store/atoms/uiAtoms'
import { timerDataAtom } from '../store/atoms/statsAtoms'
import { wordDisplayInfoMapAtom } from '../store/atoms/wordDisplayInfoAtoms'
import { useWordPanelState } from './useWordPanelState'
import { atom } from 'jotai'

// Mock global store atoms with real atoms
vi.mock('@/store', () => {
  const { atom } = require('jotai')
  return {
    phoneticConfigAtom: atom({ isOpen: true, type: 'uk' }),
    isShowPrevAndNextWordAtom: atom(true),
  }
})

// Create test word
function createTestWord(name: string, index: number) {
  return {
    name,
    trans: [`translation for ${name}`],
    usphone: 'ˈwɜːrd',
    ukphone: 'ˈwɜːd',
    index,
  }
}

describe('useWordPanelState', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper to create wrapper with Jotai store
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={store}>{children}</Provider>
    }
  }

  describe('基础状态', () => {
    it('应该返回正确的默认值', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.currentWord).toBeNull()
      expect(result.current.prevWord).toBeNull()
      expect(result.current.nextWord).toBeNull()
      expect(result.current.isTyping).toBe(false)
      expect(result.current.isImmersiveMode).toBe(false)
      expect(result.current.isTransVisible).toBe(true)
    })

    it('应该正确返回单词列表中的当前单词', () => {
      const testWords = [createTestWord('apple', 0), createTestWord('banana', 1)]
      store.set(wordsAtom, testWords)
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.currentWord).toEqual(testWords[0])
      expect(result.current.prevWord).toBeNull()
      expect(result.current.nextWord).toEqual(testWords[1])
    })

    it('应该正确返回前一个和下一个单词', () => {
      const testWords = [createTestWord('apple', 0), createTestWord('banana', 1), createTestWord('cherry', 2)]
      store.set(wordsAtom, testWords)
      store.set(currentIndexAtom, 1)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.currentWord).toEqual(testWords[1])
      expect(result.current.prevWord).toEqual(testWords[0])
      expect(result.current.nextWord).toEqual(testWords[2])
    })

    it('应该在最后一个单词时 nextWord 为 null', () => {
      const testWords = [createTestWord('apple', 0), createTestWord('banana', 1)]
      store.set(wordsAtom, testWords)
      store.set(currentIndexAtom, 1)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.currentWord).toEqual(testWords[1])
      expect(result.current.nextWord).toBeNull()
    })
  })

  describe('UI 状态', () => {
    it('应该正确反映 isTyping 状态', () => {
      store.set(isTypingAtom, true)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.isTyping).toBe(true)
    })

    it('应该正确反映 isImmersiveMode 状态', () => {
      store.set(isImmersiveModeAtom, true)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.isImmersiveMode).toBe(true)
    })

    it('应该正确反映 isTransVisible 状态', () => {
      store.set(isTransVisibleAtom, false)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.isTransVisible).toBe(false)
    })

    it('应该正确返回 timerData', () => {
      const timerData = { time: 60, accuracy: 95, wpm: 45 }
      store.set(timerDataAtom, timerData)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.timerData).toEqual(timerData)
    })
  })

  describe('学习模式状态', () => {
    it('应该正确反映 isExtraReview 状态', () => {
      store.set(isExtraReviewAtom, true)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.isExtraReview).toBe(true)
    })

    it('应该正确反映 isRepeatLearning 状态', () => {
      store.set(isRepeatLearningAtom, true)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.isRepeatLearning).toBe(true)
    })
  })

  describe('单词显示信息', () => {
    it('应该使用 wordDisplayInfoMap 中的数据覆盖默认数据', () => {
      const testWord = createTestWord('apple', 0)
      const displayInfo = {
        trans: ['custom translation'],
        ukphone: 'custom-phone',
        tense: 'past tense',
      }
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(wordDisplayInfoMapAtom, { apple: displayInfo })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.displayTrans).toEqual(displayInfo.trans)
      expect(result.current.displayTense).toBe(displayInfo.tense)
      expect(result.current.wordWithInfo?.trans).toEqual(displayInfo.trans)
      expect(result.current.wordWithInfo?.ukphone).toBe(displayInfo.ukphone)
      expect(result.current.wordWithInfo?.tense).toBe(displayInfo.tense)
    })

    it('应该在无 displayInfo 时使用默认数据', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordPanelState(), { wrapper })

      expect(result.current.displayTrans).toEqual(testWord.trans)
      expect(result.current.wordWithInfo?.trans).toEqual(testWord.trans)
    })
  })

  describe('onFinish action', () => {
    it('应该在不是最后一个单词时前进到下一个单词', () => {
      const testWords = [createTestWord('apple', 0), createTestWord('banana', 1)]
      store.set(wordsAtom, testWords)
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)

      const wrapper = createWrapper()
      const { result, rerender } = renderHook(() => useWordPanelState(), { wrapper })

      act(() => {
        result.current.onFinish()
      })

      rerender()

      // currentIndex 应该更新到 1
      expect(store.get(currentIndexAtom)).toBe(1)
    })

    it('应该在最后一个单词时完成学习', () => {
      const testWords = [createTestWord('apple', 0)]
      store.set(wordsAtom, testWords)
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)

      const wrapper = createWrapper()
      const { result, rerender } = renderHook(() => useWordPanelState(), { wrapper })

      act(() => {
        result.current.onFinish()
      })

      rerender()

      // 应该调用 finishLearning
      expect(store.get(isTypingAtom)).toBe(false)
    })
  })
})
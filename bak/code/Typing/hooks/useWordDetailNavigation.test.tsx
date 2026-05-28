import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'
import { useWordDetailNavigation } from './useWordDetailNavigation'
import { wordsAtom, currentIndexAtom } from '../store/atoms/wordListAtoms'
import { atom } from 'jotai'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}))

// Mock global store atoms with real atoms
vi.mock('@/store', () => {
  const { atom } = require('jotai')
  return {
    hotkeyConfigAtom: atom({ viewDetail: 'ctrl+1', goBack: 'ctrl+2' }),
  }
})

import { useHotkeys } from 'react-hotkeys-hook'

// Create test word
function createTestWord(name: string, index: number = 0) {
  return {
    name,
    trans: [`translation for ${name}`],
    usphone: 'ˈwɜːrd',
    ukphone: 'ˈwɜːd',
    index,
  }
}

describe('useWordDetailNavigation', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    vi.clearAllMocks()
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

  describe('handleViewDetail', () => {
    it('当存在当前单词时应该导航到详情页', () => {
      const testWord = createTestWord('apple')
      // currentWordAtom 是 derived atom，需要设置 wordsAtom 和 currentIndexAtom
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordDetailNavigation(), { wrapper })

      result.current.handleViewDetail()

      expect(mockNavigate).toHaveBeenCalledWith('/query/apple')
    })

    it('当当前单词名包含特殊字符时应该正确编码', () => {
      const testWord = createTestWord('test-word')
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordDetailNavigation(), { wrapper })

      result.current.handleViewDetail()

      expect(mockNavigate).toHaveBeenCalledWith('/query/test-word')
    })

    it('当不存在当前单词时不应该导航', () => {
      // wordsAtom 默认为空数组，currentWordAtom 为 null

      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordDetailNavigation(), { wrapper })

      result.current.handleViewDetail()

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('快捷键注册', () => {
    it('应该使用正确的快捷键配置注册 useHotkeys', () => {
      const testWord = createTestWord('apple')
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      renderHook(() => useWordDetailNavigation(), { wrapper })

      expect(useHotkeys).toHaveBeenCalledWith(
        'ctrl+1',
        expect.any(Function),
        { preventDefault: true },
        expect.any(Array),
      )
    })

    it('快捷键回调应该调用 handleViewDetail', () => {
      const testWord = createTestWord('apple')
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)

      const wrapper = createWrapper()
      renderHook(() => useWordDetailNavigation(), { wrapper })

      // 获取传递给 useHotkeys 的回调函数
      const hotkeyCall = vi.mocked(useHotkeys).mock.calls[0]
      const callback = hotkeyCall[1] as () => void

      // 清除之前的调用记录
      mockNavigate.mockClear()

      // 执行回调
      callback()

      expect(mockNavigate).toHaveBeenCalledWith('/query/apple')
    })
  })

  describe('返回值', () => {
    it('应该返回 handleViewDetail 函数', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordDetailNavigation(), { wrapper })

      expect(typeof result.current.handleViewDetail).toBe('function')
    })

    it('应该返回 hotkeyConfig', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useWordDetailNavigation(), { wrapper })

      expect(result.current.hotkeyConfig).toEqual({ viewDetail: 'ctrl+1', goBack: 'ctrl+2' })
    })
  })
})
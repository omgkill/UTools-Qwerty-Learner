import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'jotai'
import type { ReactNode } from 'react'
import { useTypingPageSetup } from './useTypingPageSetup'
import { isAppInitializedAtom } from '../store/atoms/sessionAtoms'
import {
  wordsAtom,
  currentIndexAtom,
  currentWordAtom,
} from '../store/atoms/wordListAtoms'
import { isTypingAtom, isImmersiveModeAtom } from '../store/atoms/uiAtoms'
import { currentWordBankIdAtom, wordBanksAtom } from '@/store'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock useTypingInitializer (the actual hook)
vi.mock('./useTypingInitializer', () => ({
  useTypingInitializer: vi.fn(() => ({
    isInitialized: true,
    currentWordBank: { id: 'test-dict', name: 'Test Dictionary' },
  })),
}))

// Mock useTypingPageBase
vi.mock('./useTypingPageBase', () => ({
  useTypingPageBase: vi.fn(() => ({
    isTyping: false,
    isImmersiveMode: false,
  })),
}))

// Helper to create wrapper with Jotai Provider
function createWrapper(initialValues: Array<[any, any]> = []) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider initialValues={initialValues}>{children}</Provider>
  }
}

// Create test word bank
function createTestWordBank(id: string, name: string) {
  return {
    id,
    name,
    url: `/path/to/${id}.json`,
    languageCategory: 'en' as const,
  }
}

describe('useTypingPageSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('返回值', () => {
    it('应该返回 isInitialized', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useTypingPageSetup(), { wrapper })

      expect(result.current.isInitialized).toBe(true)
    })

    it('应该返回 currentWordBank', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useTypingPageSetup(), { wrapper })

      expect(result.current.currentWordBank).toEqual({
        id: 'test-dict',
        name: 'Test Dictionary',
      })
    })

    it('应该返回 useTypingPageBase 的结果', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useTypingPageSetup(), { wrapper })

      expect(result.current.isTyping).toBe(false)
      expect(result.current.isImmersiveMode).toBe(false)
    })
  })

  describe('类型安全', () => {
    it('返回类型应该包含所有必需属性', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useTypingPageSetup(), { wrapper })

      // 验证所有属性存在
      expect(result.current).toHaveProperty('isInitialized')
      expect(result.current).toHaveProperty('currentWordBank')
      expect(result.current).toHaveProperty('isTyping')
      expect(result.current).toHaveProperty('isImmersiveMode')
    })
  })
})
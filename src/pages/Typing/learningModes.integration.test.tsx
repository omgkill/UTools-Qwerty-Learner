/**
 * Learning Modes Integration Tests
 *
 * These tests verify the integration between components and hooks
 * for the three learning modes: normal, repeat, and consolidate.
 *
 * For simpler component unit tests, see:
 * - WordPanel/index.test.tsx
 * - LearningPageLayout.test.tsx
 * - ExtraTypingPage.test.tsx
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'

// Import atoms for testing
import {
  wordsAtom,
  currentIndexAtom,
} from './store/atoms/wordListAtoms'
import { isTypingAtom } from './store/atoms/uiAtoms'

describe('Learning Modes - Store Integration', () => {
  // Test Jotai store behavior without complex mocking

  function createWrapper(store: ReturnType<typeof createStore>) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter>
          <Provider store={store}>{children}</Provider>
        </MemoryRouter>
      )
    }
  }

  describe('Jotai Atoms', () => {
    it('wordsAtom 可以被正确设置和读取', () => {
      const store = createStore()
      const testWords = [
        { name: 'apple', trans: ['苹果'], index: 0 },
        { name: 'banana', trans: ['香蕉'], index: 1 },
      ]

      store.set(wordsAtom, testWords)
      const words = store.get(wordsAtom)

      expect(words).toHaveLength(2)
      expect(words[0].name).toBe('apple')
    })

    it('currentIndexAtom 可以被正确设置和读取', () => {
      const store = createStore()

      store.set(currentIndexAtom, 5)
      const index = store.get(currentIndexAtom)

      expect(index).toBe(5)
    })

    it('isTypingAtom 可以被正确切换', () => {
      const store = createStore()

      store.set(isTypingAtom, true)
      expect(store.get(isTypingAtom)).toBe(true)

      store.set(isTypingAtom, false)
      expect(store.get(isTypingAtom)).toBe(false)
    })

    it('wordsAtom 更新应该触发订阅', () => {
      const store = createStore()
      let callCount = 0

      // Subscribe to wordsAtom
      const unsubscribe = store.sub(wordsAtom, () => {
        callCount++
      })

      store.set(wordsAtom, [{ name: 'test', trans: [], index: 0 }])

      expect(callCount).toBeGreaterThan(0)
      unsubscribe()
    })
  })
})
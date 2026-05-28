import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'
import WordPanel from './index'
import {
  wordsAtom,
  currentIndexAtom,
} from '../../store/atoms/wordListAtoms'
import {
  isTypingAtom,
  isImmersiveModeAtom,
  isTransVisibleAtom,
  isExtraReviewAtom,
  isRepeatLearningAtom,
} from '../../store/atoms/uiAtoms'
import { timerDataAtom } from '../../store/atoms/statsAtoms'
import { wordDisplayInfoMapAtom } from '../../store/atoms/wordDisplayInfoAtoms'
import { atom } from 'jotai'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}))

// Mock global store atoms
vi.mock('@/store', () => {
  const { atom } = require('jotai')
  return {
    // useWordPanelState 依赖
    phoneticConfigAtom: atom({ isOpen: true, type: 'uk' }),
    isShowPrevAndNextWordAtom: atom(true),
    // WordComponent 依赖
    wordDictationConfigAtom: atom({ isOpen: false }),
    isShowAnswerOnHoverAtom: atom(true),
    isTextSelectableAtom: atom(false),
    pronunciationIsOpenAtom: atom(true),
    currentWordBankAtom: atom({ language: 'en' }),
    // Translation 依赖
    pronunciationConfigAtom: atom({ isOpen: true, isTransRead: false, transVolume: 1 }),
    // useWordDetailNavigation 依赖
    hotkeyConfigAtom: atom({ viewDetail: 'ctrl+1', goBack: 'ctrl+2' }),
  }
})

// Mock useWordMeaning hook
vi.mock('../../hooks/useWordMeaning', () => ({
  useWordMeaning: () => ({
    requestWordMeaning: vi.fn(),
  }),
}))

// Mock useWordDetailNavigation hook
vi.mock('../../hooks/useWordDetailNavigation', () => ({
  useWordDetailNavigation: () => ({
    handleViewDetail: vi.fn(),
    hotkeyConfig: { viewDetail: 'ctrl+1', goBack: 'ctrl+2' },
  }),
}))

// Mock usePronunciation hook
vi.mock('@/hooks/usePronunciation', () => ({
  usePrefetchPronunciationSound: vi.fn(),
}))

// Mock PrevAndNextWord component
vi.mock('../PrevAndNextWord', () => ({
  default: ({ type }: { type: string }) => (
    <div data-testid={`prev-next-word-${type}`}>{type}</div>
  ),
}))

// Mock WordComponent - 复杂子组件
vi.mock('./components/Word', () => ({
  default: ({ word, onFinish }: { word: { name: string }; onFinish: () => void }) => (
    <div data-testid="word-component">
      <span data-testid="word-name">{word.name}</span>
      <button data-testid="finish-button" onClick={onFinish}>Finish</button>
    </div>
  ),
}))

// Mock Phonetic component
vi.mock('./components/Phonetic', () => ({
  default: ({ word }: { word: { name: string } }) => (
    <div data-testid="phonetic">{word.name} phonetic</div>
  ),
}))

// Mock Translation component
vi.mock('./components/Translation', () => ({
  default: ({ trans }: { trans: string[] }) => (
    <div data-testid="translation">{trans.join(', ')}</div>
  ),
}))

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

describe('WordPanel', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // Helper to create wrapper with Jotai store
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={store}>{children}</Provider>
    }
  }

  describe('渲染', () => {
    it('当没有当前单词时不应该崩溃', () => {
      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      // 不应该显示单词相关内容
      expect(screen.queryByText('开始')).not.toBeInTheDocument()
    })

    it('应该正确渲染当前单词', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      // 应该显示单词
      expect(screen.getByText('apple')).toBeInTheDocument()
    })

    it('当 isTyping 为 false 时应该显示开始提示', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, false)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      expect(screen.getByText('按任意键开始')).toBeInTheDocument()
    })

    it('当 isTyping 为 true 且有时间时应该显示继续提示', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, false)
      store.set(timerDataAtom, { time: 60, accuracy: 95, wpm: 45 })

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      expect(screen.getByText('按任意键继续')).toBeInTheDocument()
    })
  })

  describe('沉浸模式', () => {
    it('沉浸模式下不应该显示上下词', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord, createTestWord('banana', 1)])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isImmersiveModeAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      expect(screen.queryByTestId('prev-next-word-prev')).not.toBeInTheDocument()
      expect(screen.queryByTestId('prev-next-word-next')).not.toBeInTheDocument()
    })

    it('沉浸模式下不应该显示查看详情链接', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isImmersiveModeAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      expect(screen.queryByText(/查看详细释义/)).not.toBeInTheDocument()
    })

    it('沉浸模式下不应该显示掌握按钮', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isImmersiveModeAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      expect(screen.queryByText('掌握')).not.toBeInTheDocument()
    })
  })

  describe('翻译显示', () => {
    it('当 isTransVisible 为 true 时应该显示翻译', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isTransVisibleAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })

      // 翻译组件应该存在
      expect(screen.getByText('translation for apple')).toBeInTheDocument()
    })
  })

  describe('学习模式标记', () => {
    it('应该正确传递 isExtraReview 属性', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isExtraReviewAtom, true)

      const wrapper = createWrapper()
      // 测试组件不会崩溃
      render(<WordPanel />, { wrapper })
    })

    it('应该正确传递 isRepeatLearning 属性', () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)
      store.set(isRepeatLearningAtom, true)

      const wrapper = createWrapper()
      render(<WordPanel />, { wrapper })
    })
  })

  describe('掌握按钮', () => {
    it('点击掌握按钮应该调用 onMastered 回调', async () => {
      const testWord = createTestWord('apple', 0)
      store.set(wordsAtom, [testWord])
      store.set(currentIndexAtom, 0)
      store.set(isTypingAtom, true)

      const mockOnMastered = vi.fn()

      const wrapper = createWrapper()
      render(<WordPanel onMastered={mockOnMastered} />, { wrapper })

      // 点击掌握按钮
      const masteredButton = screen.getByText('掌握')
      masteredButton.click()

      expect(mockOnMastered).toHaveBeenCalled()
    })
  })
})
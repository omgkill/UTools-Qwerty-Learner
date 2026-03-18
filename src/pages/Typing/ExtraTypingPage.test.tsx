import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider, createStore } from 'jotai'
import type { ReactNode } from 'react'
import { RepeatTypingApp, ConsolidateTypingApp } from './ExtraTypingPage'
import { wordsAtom, currentIndexAtom } from './store/atoms/wordListAtoms'
import { isTypingAtom, isImmersiveModeAtom } from './store/atoms/uiAtoms'
import type { WordBank } from '@/types'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}))

// Mock global store atoms
vi.mock('@/store', () => {
  const { atom } = require('jotai')
  return {
    phoneticConfigAtom: atom({ isOpen: true, type: 'uk' }),
    isShowPrevAndNextWordAtom: atom(true),
    hotkeyConfigAtom: atom({ viewDetail: 'ctrl+1', goBack: 'ctrl+2' }),
    wordDictationConfigAtom: atom({ isOpen: false }),
    isShowAnswerOnHoverAtom: atom(true),
    isTextSelectableAtom: atom(false),
    pronunciationIsOpenAtom: atom(true),
    currentWordBankAtom: atom({ language: 'en' }),
    pronunciationConfigAtom: atom({ isOpen: true, isTransRead: false, transVolume: 1 }),
  }
})

// Mock useTypingPageBase hook
vi.mock('./hooks/useTypingPageBase', () => ({
  useTypingPageBase: () => ({
    isTyping: true,
    isImmersiveMode: false,
  }),
}))

// Mock useLearningSession hook
const mockHandleExit = vi.fn()
let mockSessionState = {
  words: [],
  isLoading: false,
  hasWords: false,
  displayIndex: 0,
  handleExit: mockHandleExit,
}

vi.mock('./hooks/useLearningSession', () => ({
  useLearningSession: () => mockSessionState,
}))

// Mock WordPanel component
vi.mock('./components/WordPanel', () => ({
  default: () => <div data-testid="word-panel">WordPanel</div>,
}))

// Mock LearningPageLayout component
vi.mock('./components/LearningPageLayout', () => ({
  LearningPageLayout: ({
    wordBankName,
    headerExtra,
    showExitButton,
    exitButtonText,
    onExit,
    children,
  }: {
    wordBankName: string
    headerExtra?: ReactNode
    showExitButton?: boolean
    exitButtonText?: string
    onExit?: () => void
    children: ReactNode
  }) => (
    <div data-testid="learning-page-layout">
      <span data-testid="word-bank-name">{wordBankName}</span>
      {headerExtra && <div data-testid="header-extra">{headerExtra}</div>}
      {showExitButton && exitButtonText && (
        <button data-testid="exit-button" onClick={onExit}>
          {exitButtonText}
        </button>
      )}
      {children}
    </div>
  ),
}))

// Mock TypingPageStates
vi.mock('./components/TypingPageStates', () => ({
  TypingPageLoading: () => <div data-testid="loading-state">Loading...</div>,
  TypingPageEmptyState: ({
    icon,
    title,
    description,
    buttonText,
    onButtonClick,
  }: {
    icon: string
    title: string
    description: string
    buttonText: string
    onButtonClick: () => void
  }) => (
    <div data-testid="empty-state">
      <span data-testid="empty-icon">{icon}</span>
      <span data-testid="empty-title">{title}</span>
      <span data-testid="empty-description">{description}</span>
      <button data-testid="empty-button" onClick={onButtonClick}>
        {buttonText}
      </button>
    </div>
  ),
}))

// Test word bank
const testWordBank: WordBank = {
  id: 'test-dict',
  name: 'Test Dictionary',
  file: 'test.json',
  language: 'en',
}

describe('ExtraTypingPage', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    mockNavigate.mockClear()
    mockHandleExit.mockClear()
    // Reset session state
    mockSessionState = {
      words: [],
      isLoading: false,
      hasWords: false,
      displayIndex: 0,
      handleExit: mockHandleExit,
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // Helper to create wrapper with Jotai store
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter>
          <Provider store={store}>{children}</Provider>
        </MemoryRouter>
      )
    }
  }

  describe('RepeatTypingApp', () => {
    it('应该显示加载状态', () => {
      mockSessionState = {
        ...mockSessionState,
        isLoading: true,
      }

      const wrapper = createWrapper()
      render(<RepeatTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    })

    it('应该显示空状态当没有单词时', () => {
      mockSessionState = {
        ...mockSessionState,
        hasWords: false,
      }

      const wrapper = createWrapper()
      render(<RepeatTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('empty-title')).toHaveTextContent('暂无可重复学习的单词')
    })

    it('应该显示内容当有单词时', () => {
      mockSessionState = {
        ...mockSessionState,
        words: [{ name: 'apple', trans: ['苹果'] }],
        hasWords: true,
        displayIndex: 0,
      }

      const wrapper = createWrapper()
      render(<RepeatTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('learning-page-layout')).toBeInTheDocument()
      expect(screen.getByTestId('word-panel')).toBeInTheDocument()
      expect(screen.getByText('🔄 重复学习')).toBeInTheDocument()
    })

    it('点击退出按钮应该调用 handleExit 并导航', () => {
      mockSessionState = {
        ...mockSessionState,
        words: [{ name: 'apple', trans: ['苹果'] }],
        hasWords: true,
        displayIndex: 0,
      }

      const wrapper = createWrapper()
      render(<RepeatTypingApp currentWordBank={testWordBank} />, { wrapper })

      const exitButton = screen.getByTestId('exit-button')
      exitButton.click()

      expect(mockHandleExit).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('点击空状态按钮应该导航到首页', () => {
      mockSessionState = {
        ...mockSessionState,
        hasWords: false,
      }

      const wrapper = createWrapper()
      render(<RepeatTypingApp currentWordBank={testWordBank} />, { wrapper })

      const emptyButton = screen.getByTestId('empty-button')
      emptyButton.click()

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('ConsolidateTypingApp', () => {
    it('应该显示加载状态', () => {
      mockSessionState = {
        ...mockSessionState,
        isLoading: true,
      }

      const wrapper = createWrapper()
      render(<ConsolidateTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    })

    it('应该显示空状态当没有单词时', () => {
      mockSessionState = {
        ...mockSessionState,
        hasWords: false,
      }

      const wrapper = createWrapper()
      render(<ConsolidateTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('empty-title')).toHaveTextContent('暂无可巩固的单词')
    })

    it('应该显示内容当有单词时', () => {
      mockSessionState = {
        ...mockSessionState,
        words: [{ name: 'apple', trans: ['苹果'] }],
        hasWords: true,
        displayIndex: 0,
      }

      const wrapper = createWrapper()
      render(<ConsolidateTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('learning-page-layout')).toBeInTheDocument()
      expect(screen.getByTestId('word-panel')).toBeInTheDocument()
      expect(screen.getByText('🔁 巩固学习')).toBeInTheDocument()
    })

    it('应该显示正确的词库名称', () => {
      mockSessionState = {
        ...mockSessionState,
        words: [{ name: 'apple', trans: ['苹果'] }],
        hasWords: true,
        displayIndex: 0,
      }

      const wrapper = createWrapper()
      render(<ConsolidateTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByTestId('word-bank-name')).toHaveTextContent('Test Dictionary')
    })

    it('应该显示正确的进度', () => {
      mockSessionState = {
        ...mockSessionState,
        words: [{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }],
        hasWords: true,
        displayIndex: 1,
      }

      const wrapper = createWrapper()
      render(<ConsolidateTypingApp currentWordBank={testWordBank} />, { wrapper })

      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })
  })
})
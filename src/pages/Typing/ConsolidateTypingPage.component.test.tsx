// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsolidateTypingAppInner } from './ConsolidateTypingPage'
import { TypingContext } from './store'
import type { TypingState } from './store'

const advanceCurrentWord = vi.fn()
const navigate = vi.fn()
const useConsolidateTypingSessionMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('./components/PronunciationSwitcher', () => ({
  default: () => <div data-testid="pronunciation-switcher" />,
}))

vi.mock('./components/Speed', () => ({
  default: () => <div data-testid="speed" />,
}))

vi.mock('./components/StartButton', () => ({
  default: () => <button type="button">start</button>,
}))

vi.mock('./components/Switcher', () => ({
  default: () => <div data-testid="switcher" />,
}))

vi.mock('./components/WordPanel', () => ({
  default: (props: { onWordFinished: () => Promise<void> | void }) => (
    <div data-testid="word-panel">
      <button type="button" onClick={() => props.onWordFinished()}>
        finish
      </button>
    </div>
  ),
}))

vi.mock('./components/WordList', () => ({
  default: () => <div data-testid="word-list" />,
}))

vi.mock('./hooks/useTypingPageShellEffects', () => ({
  useTypingPageShellEffects: vi.fn(),
}))

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/Header', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/typing/presentation/hooks/useConsolidateTypingSession', () => ({
  useConsolidateTypingSession: () => useConsolidateTypingSessionMock(),
}))

function createState(): TypingState {
  return {
    wordListData: { words: [], index: 0 },
    statsData: {
      wordCount: 0,
      correctCount: 0,
      wrongCount: 0,
      wrongWordIndexes: [],
      correctWordIndexes: [],
      wordRecordIds: [],
      timerData: { time: 0, accuracy: 0, wpm: 0 },
    },
    wordInfoMap: {},
    uiState: {
      isTyping: true,
      isFinished: false,
      isShowSkip: false,
      isExtraReview: false,
      isRepeatLearning: true,
      isCurrentWordMastered: false,
      isSavingRecord: false,
    },
    isTransVisible: true,
    isImmersiveMode: false,
  }
}

function renderInner(dispatch = vi.fn()) {
  const state = createState()
  const currentWordBank = {
    id: 'dict-a',
    name: 'Consolidate Dict',
    description: '',
    category: 'custom',
    tags: [],
    url: '',
    length: 3,
    language: 'en' as const,
    languageCategory: 'custom' as const,
    chapterCount: 1,
  }

  render(
    <MemoryRouter>
      <TypingContext.Provider value={{ state, dispatch }}>
        <ConsolidateTypingAppInner currentWordBank={currentWordBank} />
      </TypingContext.Provider>
    </MemoryRouter>,
  )
}

describe('ConsolidateTypingAppInner', () => {
  beforeEach(() => {
    advanceCurrentWord.mockReset()
    navigate.mockReset()
    useConsolidateTypingSessionMock.mockReset()
    useConsolidateTypingSessionMock.mockReturnValue({
      words: [
        { name: 'alpha', index: 0, trans: [], usphone: '', ukphone: '' },
        { name: 'beta', index: 1, trans: [], usphone: '', ukphone: '' },
      ],
      currentIndex: 0,
      isLoading: false,
      hasWords: true,
      advanceCurrentWord,
    })
  })

  it('advances the queued consolidate session when a word is finished', async () => {
    renderInner()

    screen.getByText('finish').click()

    await waitFor(() => {
      expect(advanceCurrentWord).toHaveBeenCalledTimes(1)
    })
  })

  it('navigates home on exit', async () => {
    renderInner()

    screen.getByText('退出巩固学习').click()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('renders the empty-state message when there are no consolidate words', () => {
    useConsolidateTypingSessionMock.mockReturnValue({
      words: [],
      currentIndex: 0,
      isLoading: false,
      hasWords: false,
      advanceCurrentWord,
    })

    renderInner()

    expect(screen.getByText('暂无可巩固的单词')).toBeInTheDocument()
  })
})

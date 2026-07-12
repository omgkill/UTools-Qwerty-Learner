// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NormalTypingAppInner } from './NormalTypingPage'
import { TypingContext } from './store'
import { TypingStateActionType } from './store'
import type { TypingState } from './store'
import type { TypingSession } from '@/features/typing/domain'

const completeSessionWord = vi.fn()
const markSessionWordMastered = vi.fn()
const useNormalTypingSessionMock = vi.fn()

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
  default: (props: {
    onMastered?: () => void
    onWordFinished: (params: { isCorrect: boolean; wrongCount: number }) => Promise<void> | void
    words?: Array<{ name: string }>
    currentIndex?: number
    disableWordJump?: boolean
  }) => {
    const currentWord = props.words?.[props.currentIndex ?? 0]?.name ?? ''
    const prevWord = props.currentIndex != null && props.currentIndex > 0 ? props.words?.[props.currentIndex - 1]?.name ?? '' : ''
    const nextWord = props.currentIndex != null ? props.words?.[props.currentIndex + 1]?.name ?? '' : ''

    return (
      <div
        data-testid="word-panel"
        data-current-word={currentWord}
        data-prev-word={prevWord}
        data-next-word={nextWord}
        data-disable-word-jump={String(props.disableWordJump)}
      >
        <button type="button" onClick={() => props.onWordFinished({ isCorrect: true, wrongCount: 2 })}>
          finish
        </button>
        <button type="button" onClick={() => props.onMastered?.()}>
          master
        </button>
      </div>
    )
  },
}))

vi.mock('./components/WordList', () => ({
  default: (props: { words?: Array<{ name: string }>; currentIndex?: number }) => (
    <div data-testid="word-list" data-word-count={String(props.words?.length ?? 0)} data-active-index={String(props.currentIndex ?? -1)} />
  ),
}))

vi.mock('./hooks/useConfetti', () => ({
  useConfetti: vi.fn(),
}))

vi.mock('./hooks/useKeyboardStartListener', () => ({
  useKeyboardStartListener: vi.fn(),
}))

vi.mock('./hooks/useLearningRecordSaver', () => ({
  useLearningRecordSaver: vi.fn(),
}))

vi.mock('./hooks/useTypingHotkeys', () => ({
  useTypingHotkeys: vi.fn(),
}))

vi.mock('./hooks/useTypingTimer', () => ({
  useTypingTimer: vi.fn(),
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

vi.mock('@/features/typing/presentation/hooks/useNormalTypingSession', () => ({
  useNormalTypingSession: () => useNormalTypingSessionMock(),
}))

vi.mock('@/platform/utools', () => ({
  getMode: () => 'normal',
  onModeChange: () => () => undefined,
}))

function createState(): TypingState {
  return {
    wordListData: {
      words: [
        {
          name: 'legacy-word',
          index: 99,
          trans: [],
          usphone: '',
          ukphone: '',
        },
      ],
      index: 0,
    },
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
      isRepeatLearning: false,
      isCurrentWordMastered: false,
      isSavingRecord: false,
    },
    isTransVisible: true,
    isImmersiveMode: false,
  }
}

function createSession(overrides: Partial<TypingSession> = {}): TypingSession {
  const queueWords = [
    { word: { name: 'alpha', index: 0, trans: [], usphone: '', ukphone: '' }, kind: 'new' as const },
    { word: { name: 'beta', index: 1, trans: [], usphone: '', ukphone: '' }, kind: 'new' as const },
    { word: { name: 'gamma', index: 2, trans: [], usphone: '', ukphone: '' }, kind: 'new' as const },
  ]

  return {
    dictId: 'dict-a',
    mode: 'normal',
    learningType: 'new',
    queueWords,
    currentIndex: 1,
    currentWord: queueWords[1]?.word,
    currentWordKind: 'new',
    todayCounts: {
      learned: 1,
      reviewed: 0,
      extraReviewed: 0,
      mastered: 0,
    },
    dueCount: 0,
    newCount: 3,
    masteredCount: 0,
    isFinished: false,
    ...overrides,
  }
}

function renderInner(dispatch = vi.fn()) {
  const state = createState()
  const currentWordBank = {
    id: 'dict-a',
    name: 'Session Dict',
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
        <NormalTypingAppInner currentWordBank={currentWordBank} />
      </TypingContext.Provider>
    </MemoryRouter>,
  )

  return { dispatch }
}

describe('NormalTypingAppInner', () => {
  beforeEach(() => {
    completeSessionWord.mockReset()
    markSessionWordMastered.mockReset()
    useNormalTypingSessionMock.mockReset()
    useNormalTypingSessionMock.mockReturnValue({
      session: createSession(),
      learningType: 'new',
      dueCount: 0,
      newCount: 3,
      todayLearned: 1,
      todayReviewed: 0,
      todayMastered: 0,
      completeSessionWord,
      markSessionWordMastered,
      isLoading: false,
    })
  })

  it('renders the current normal typing word from the session snapshot instead of reducer wordListData', async () => {
    const { dispatch } = renderInner()

    expect(screen.getByTestId('word-panel')).toHaveAttribute('data-current-word', 'beta')
    expect(screen.getByTestId('word-panel')).toHaveAttribute('data-prev-word', 'alpha')
    expect(screen.getByTestId('word-panel')).toHaveAttribute('data-next-word', 'gamma')
    expect(screen.getByTestId('word-panel')).toHaveAttribute('data-disable-word-jump', 'true')
    expect(screen.getByTestId('word-list')).toHaveAttribute('data-word-count', '3')
    expect(screen.getByTestId('word-list')).toHaveAttribute('data-active-index', '1')

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: TypingStateActionType.SYNC_SESSION_STATUS,
        payload: {
          isFinished: false,
          autoStart: true,
        },
      })
    })
  })

  it('submits completion and mastered actions through the unified session handlers', async () => {
    renderInner()

    screen.getByText('finish').click()
    screen.getByText('master').click()

    await waitFor(() => {
      expect(completeSessionWord).toHaveBeenCalledWith({ isCorrect: true, wrongCount: 2 })
      expect(markSessionWordMastered).toHaveBeenCalledTimes(1)
    })
  })

  it('refreshes the displayed word when the session current index changes', async () => {
    useNormalTypingSessionMock
      .mockReturnValueOnce({
        session: createSession({ currentIndex: 1, currentWord: createSession().queueWords[1]?.word }),
        learningType: 'new',
        dueCount: 0,
        newCount: 3,
        todayLearned: 1,
        todayReviewed: 0,
        todayMastered: 0,
        completeSessionWord,
        markSessionWordMastered,
        isLoading: false,
      })
      .mockReturnValueOnce({
        session: createSession({ currentIndex: 2, currentWord: createSession().queueWords[2]?.word }),
        learningType: 'new',
        dueCount: 0,
        newCount: 3,
        todayLearned: 2,
        todayReviewed: 0,
        todayMastered: 0,
        completeSessionWord,
        markSessionWordMastered,
        isLoading: false,
      })

    const state = createState()
    const dispatch = vi.fn()
    const currentWordBank = {
      id: 'dict-a',
      name: 'Session Dict',
      description: '',
      category: 'custom',
      tags: [],
      url: '',
      length: 3,
      language: 'en' as const,
      languageCategory: 'custom' as const,
      chapterCount: 1,
    }

    const { rerender } = render(
      <MemoryRouter>
        <TypingContext.Provider value={{ state, dispatch }}>
          <NormalTypingAppInner currentWordBank={currentWordBank} />
        </TypingContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('word-panel')).toHaveAttribute('data-current-word', 'beta')

    rerender(
      <MemoryRouter>
        <TypingContext.Provider value={{ state, dispatch }}>
          <NormalTypingAppInner currentWordBank={currentWordBank} />
        </TypingContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('word-panel')).toHaveAttribute('data-current-word', 'gamma')
      expect(screen.getByTestId('word-list')).toHaveAttribute('data-active-index', '2')
    })
  })

  it('renders the restored session snapshot after refresh', async () => {
    useNormalTypingSessionMock.mockReturnValue({
      session: createSession({
        currentIndex: 2,
        currentWord: createSession().queueWords[2]?.word,
        todayCounts: {
          learned: 2,
          reviewed: 1,
          extraReviewed: 0,
          mastered: 0,
        },
      }),
      learningType: 'new',
      dueCount: 1,
      newCount: 2,
      todayLearned: 2,
      todayReviewed: 1,
      todayMastered: 0,
      completeSessionWord,
      markSessionWordMastered,
      isLoading: false,
    })

    renderInner()

    await waitFor(() => {
      expect(screen.getByTestId('word-panel')).toHaveAttribute('data-current-word', 'gamma')
      expect(screen.getByTestId('word-panel')).toHaveAttribute('data-prev-word', 'beta')
      expect(screen.getByTestId('word-list')).toHaveAttribute('data-active-index', '2')
    })
  })
})

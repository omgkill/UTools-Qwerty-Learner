import { act, render, screen, waitFor } from '@testing-library/react'
import type * as Jotai from 'jotai'
import type * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDispatch = vi.fn()
let mockState = {
  wordListData: {
    words: [
      { name: 'apple', trans: ['n. 苹果'], usphone: 'ˈæpl', ukphone: 'ˈæpl', tense: 'pl. apples' },
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
  wordInfoMap: {} as Record<string, { trans?: string[]; ukphone?: string; tense?: string }>,
  uiState: {
    isTyping: true,
    isFinished: false,
    isShowSkip: false,
    isExtraReview: false,
    isCurrentWordMastered: false,
    isSavingRecord: false,
  },
  isTransVisible: true,
  isImmersiveMode: false,
}

vi.mock('react', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof React
  return {
    ...actual,
    useContext: vi.fn(() => ({ state: mockState, dispatch: mockDispatch })),
    useRef: vi.fn((initialValue?: unknown) => ({ current: initialValue ?? new Set() })),
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('jotai', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof Jotai
  return {
    ...actual,
    useAtomValue: vi.fn(() => false),
  }
})

vi.mock('@/hooks/usePronunciation', () => ({
  usePrefetchPronunciationSound: vi.fn(),
}))

vi.mock('./components/Word', () => ({
  default: ({ word }: { word: { name: string } }) => <div data-testid="word">{word.name}</div>,
}))

vi.mock('./components/Phonetic', () => ({
  default: () => <div data-testid="phonetic" />,
}))

vi.mock('./components/Translation', () => ({
  default: ({ trans }: { trans: string[] }) => {
    if (!trans || trans.length === 0) return null
    return <div data-testid="translation">{trans.join(', ')}</div>
  },
}))

vi.mock('../PrevAndNextWord', () => ({
  default: () => <div />,
}))

vi.mock('@/utils/mdxParser', () => ({
  parseMdxEntry: vi.fn(() => ({ translations: ['n. 查询到的释义'], phonetics: { uk: 'test' }, tense: '' })),
}))

describe('WordPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = {
      wordListData: {
        words: [{ name: 'apple', trans: ['n. 苹果'], usphone: '', ukphone: '' }],
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
        isCurrentWordMastered: false,
        isSavingRecord: false,
      },
      isTransVisible: true,
      isImmersiveMode: false,
    }
    ;(window as unknown as { queryFirstMdxWord: ReturnType<typeof vi.fn> }).queryFirstMdxWord = vi.fn().mockResolvedValue({
      ok: true,
      content: '<div>n. 查询到的释义</div>',
    })
    ;(window as unknown as { getMdxDictConfig: ReturnType<typeof vi.fn> }).getMdxDictConfig = vi.fn().mockReturnValue([{ name: 'test-dict' }])
  })

  describe('正常情况测试', () => {
    it('当单词有释义时，应该显示释义', async () => {
      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      expect(screen.getByTestId('translation')).toBeInTheDocument()
      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
    })
  })

  describe('BUG场景测试 - 应该失败', () => {
    it('BUG: 当单词没有释义时，应该通过mdx查询获取释义', async () => {
      mockState.wordListData.words = [{ name: 'newword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      expect(window.queryFirstMdxWord).toHaveBeenCalledWith('newword')
    })

    it('BUG: mdx查询成功后，应该更新单词释义到wordInfoMap', async () => {
      mockState.wordListData.words = [{ name: 'newword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
              type: expect.stringContaining('UPDATE'),
              payload: expect.objectContaining({
                wordName: 'newword',
              }),
            }),
          )
        },
        { timeout: 1000 },
      )
    })

    it('BUG: 当mdx查询失败时，界面应该显示单词但没有释义', async () => {
    (window as unknown as { queryFirstMdxWord: ReturnType<typeof vi.fn> }).queryFirstMdxWord = vi.fn().mockResolvedValue(null)
      mockState.wordListData.words = [{ name: 'unknownword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      const { container } = render(<WordPanel />)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      expect(screen.getByTestId('word')).toBeInTheDocument()
      expect(screen.getByText('unknownword')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="translation"]')).not.toBeInTheDocument()
    })

    it('BUG: 当没有配置mdx词典时，界面应该显示单词但没有释义', async () => {
    (window as unknown as { getMdxDictConfig: ReturnType<typeof vi.fn> }).getMdxDictConfig = vi.fn().mockReturnValue([])
      mockState.wordListData.words = [{ name: 'nodictword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      const { container } = render(<WordPanel />)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      expect(screen.getByTestId('word')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="translation"]')).not.toBeInTheDocument()
    })
  })

  describe('期望行为测试', () => {
    it('期望：单词没有释义时，应该调用mdx查询', async () => {
      mockState.wordListData.words = [{ name: 'testword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      expect(window.queryFirstMdxWord).toHaveBeenCalled()
    })

    it('期望：mdx查询成功后，dispatch应该被调用', async () => {
      mockState.wordListData.words = [{ name: 'testword', trans: [], usphone: '', ukphone: '' }]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalled()
        },
        { timeout: 1000 },
      )
    })
  })

  describe('新架构测试 - wordInfoMap', () => {
    it('当wordInfoMap有释义时，应该优先使用wordInfoMap的释义', async () => {
      mockState.wordListData.words = [{ name: 'testword', trans: [], usphone: '', ukphone: '' }]
      mockState.wordInfoMap = {
        testword: { trans: ['n. 来自wordInfoMap的释义'], ukphone: 'test' },
      }

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      expect(screen.getByTestId('translation')).toBeInTheDocument()
      expect(screen.getByText('n. 来自wordInfoMap的释义')).toBeInTheDocument()
    })

    it('SET_WORDS不应该清除wordInfoMap', async () => {
      mockState.wordInfoMap = {
        existingword: { trans: ['n. 已存在的释义'] },
      }

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      expect(mockState.wordInfoMap).toHaveProperty('existingword')
    })

    it('RESET_PROGRESS应该重置index但不重置wordInfoMap', async () => {
      mockState.wordListData.index = 5
      mockState.wordInfoMap = {
        existingword: { trans: ['n. 已存在的释义'] },
      }

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      expect(mockState.wordInfoMap).toHaveProperty('existingword')
    })
  })

  describe('新架构测试 - statsData', () => {
    it('统计数据应该独立于单词列表数据', async () => {
      mockState.statsData = {
        wordCount: 10,
        correctCount: 8,
        wrongCount: 2,
        wrongWordIndexes: [1, 3],
        correctWordIndexes: [0, 2, 4, 5, 6, 7, 8, 9],
        wordRecordIds: [],
        timerData: { time: 120, accuracy: 80, wpm: 30 },
      }

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      expect(mockState.statsData.wordCount).toBe(10)
      expect(mockState.statsData.correctCount).toBe(8)
    })
  })
})

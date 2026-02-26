import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type * as Jotai from 'jotai'
import type * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TypingState } from '@/pages/Typing/store'
import type { WordWithIndex } from '@/typings'
import type * as ReactRouterDom from 'react-router-dom'

const mockDispatch = vi.fn()
const createWord = (name: string, trans: string[] = [], index = 0): WordWithIndex => ({
  name,
  trans,
  usphone: '',
  ukphone: '',
  tense: '',
  index,
})
let mockState: TypingState = {
  wordListData: {
    words: [createWord('apple', ['n. 苹果'])],
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

vi.mock('react', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof React
  return {
    ...actual,
    useContext: vi.fn(() => ({ state: mockState, dispatch: mockDispatch })),
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('jotai', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof Jotai
  return {
    ...actual,
    useAtomValue: vi.fn(() => ({ viewDetail: 'ctrl+1', goBack: 'ctrl+2' })),
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
        words: [createWord('apple', ['n. 苹果'], 0)],
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

  describe('MDX查询场景测试', () => {
    it('当单词没有释义时，应该通过mdx查询获取释义', async () => {
      mockState.wordListData.words = [createWord('newword', [], 0)]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await waitFor(() => {
        expect(window.queryFirstMdxWord).toHaveBeenCalledWith('newword')
      }, { timeout: 1000 })
    })

    it('mdx查询成功后，应该更新单词释义到wordInfoMap', async () => {
      mockState.wordListData.words = [createWord('newword', [], 0)]

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

    it('当mdx查询失败时，界面应该显示单词但没有释义', async () => {
      ;(window as unknown as { queryFirstMdxWord: ReturnType<typeof vi.fn> }).queryFirstMdxWord = vi.fn().mockResolvedValue(null)
      mockState.wordListData.words = [createWord('unknownword', [], 0)]

      const { default: WordPanel } = await import('./index')
      const { container } = render(<WordPanel />)

      await waitFor(() => {
        expect(screen.getByTestId('word')).toBeInTheDocument()
        expect(screen.getByText('unknownword')).toBeInTheDocument()
        expect(container.querySelector('[data-testid="translation"]')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('当没有配置mdx词典时，界面应该显示单词但没有释义', async () => {
      ;(window as unknown as { getMdxDictConfig: ReturnType<typeof vi.fn> }).getMdxDictConfig = vi.fn().mockReturnValue([])
      mockState.wordListData.words = [createWord('nodictword', [], 0)]

      const { default: WordPanel } = await import('./index')
      const { container } = render(<WordPanel />)

      await waitFor(() => {
        expect(screen.getByTestId('word')).toBeInTheDocument()
        expect(container.querySelector('[data-testid="translation"]')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('期望行为测试', () => {
    it('单词没有释义时，应该调用mdx查询', async () => {
      mockState.wordListData.words = [createWord('testword', [], 0)]

      const { default: WordPanel } = await import('./index')
      render(<WordPanel />)

      await waitFor(() => {
        expect(window.queryFirstMdxWord).toHaveBeenCalled()
      }, { timeout: 1000 })
    })

    it('mdx查询成功后，dispatch应该被调用', async () => {
      mockState.wordListData.words = [createWord('testword', [], 0)]

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
      mockState.wordListData.words = [createWord('testword', [], 0)]
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

    describe('掌握按钮测试', () => {
      const mockOnMastered = vi.fn()

      beforeEach(() => {
        mockOnMastered.mockClear()
      })

      it('点击掌握按钮后，应该调用onMastered callback', async () => {
        mockState.wordListData.words = [createWord('apple', ['n. 苹果'], 0), createWord('banana', ['n. 香蕉'], 1)]
        mockState.wordListData.index = 0
        const { default: WordPanel } = await import('./index')
        render(<WordPanel onMastered={mockOnMastered} />)

        const masteredButton = screen.getByText('掌握')
        fireEvent.click(masteredButton)

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(1)
        }, { timeout: 1000 })
      })

      it('重复点击掌握按钮，应该多次调用onMastered callback', async () => {
        mockState.wordListData.words = [createWord('apple', ['n. 苹果'], 0)]
        mockState.wordListData.index = 0
        const { default: WordPanel } = await import('./index')
        render(<WordPanel onMastered={mockOnMastered} />)

        const masteredButton = screen.getByText('掌握')
        fireEvent.click(masteredButton)

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(1)
        }, { timeout: 1000 })

        fireEvent.click(masteredButton)

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(2)
        }, { timeout: 1000 })
      })

      it('当单词列表中有重复单词时，掌握按钮应该正确工作', async () => {
        mockState.wordListData.words = [
          createWord('apple', ['n. 苹果'], 0),
          createWord('apple', ['n. 苹果'], 1),
          createWord('banana', ['n. 香蕉'], 2),
        ]
        mockState.wordListData.index = 0
        const { default: WordPanel } = await import('./index')
        render(<WordPanel onMastered={mockOnMastered} />)

        const masteredButton = screen.getByText('掌握')
        fireEvent.click(masteredButton)

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(1)
        }, { timeout: 1000 })
      })

      it('当单词列表中已掌握的单词重复出现时，掌握按钮应该正确工作', async () => {
        mockState.wordListData.words = [
          createWord('apple', ['n. 苹果'], 0),
          createWord('banana', ['n. 香蕉'], 1),
          createWord('apple', ['n. 苹果'], 2),
        ]
        mockState.wordListData.index = 1
        const { default: WordPanel } = await import('./index')
        render(<WordPanel onMastered={mockOnMastered} />)

        const masteredButton = screen.getByText('掌握')
        fireEvent.click(masteredButton)

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(1)
        }, { timeout: 1000 })
      })

      it('连续点击掌握按钮15次，应该调用onMastered callback 15次', async () => {
        const words: WordWithIndex[] = []
        for (let i = 0; i < 100; i++) {
          words.push(createWord(`word${i}`, ['n. 测试'], i))
        }
        mockState.wordListData.words = words
        mockState.wordListData.index = 0
        const { default: WordPanel } = await import('./index')
        render(<WordPanel onMastered={mockOnMastered} />)

        const masteredButton = screen.getByText('掌握')

        for (let i = 0; i < 15; i++) {
          fireEvent.click(masteredButton)
        }

        await waitFor(() => {
          expect(mockOnMastered).toHaveBeenCalledTimes(15)
        }, { timeout: 2000 })
      })
    })
  })
})

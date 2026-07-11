import { describe, expect, it } from 'vitest'
import { TypingStateActionType } from './actions'
import { typingReducer } from './reducer'
import type { TypingState } from './types'
import type { WordWithIndex } from '@/typings'

const createWord = (name: string, index: number): WordWithIndex => ({
  name,
  index,
  trans: [],
  usphone: '',
  ukphone: '',
  tense: '',
})

const createState = (words: WordWithIndex[] = [], index = 0): TypingState => ({
  wordListData: {
    words,
    index,
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
})

describe('typingReducer', () => {
  it('SYNC_SESSION should replace queue state and auto start an active session', () => {
    const state = createState()
    state.uiState.isTyping = false
    state.uiState.isFinished = true
    state.uiState.isShowSkip = true
    state.uiState.isCurrentWordMastered = true

    const words = [createWord('alpha', 0), createWord('beta', 1)]
    const next = typingReducer(state, {
      type: TypingStateActionType.SYNC_SESSION,
      payload: {
        words,
        index: 1,
        isFinished: false,
        autoStart: true,
      },
    })

    expect(next.wordListData.words).toEqual(words)
    expect(next.wordListData.index).toBe(1)
    expect(next.uiState.isTyping).toBe(true)
    expect(next.uiState.isFinished).toBe(false)
    expect(next.uiState.isShowSkip).toBe(false)
    expect(next.uiState.isCurrentWordMastered).toBe(false)
  })

  it('SYNC_SESSION should stop typing when the incoming session is finished', () => {
    const state = createState([createWord('alpha', 0)], 0)

    const next = typingReducer(state, {
      type: TypingStateActionType.SYNC_SESSION,
      payload: {
        words: [],
        index: 0,
        isFinished: true,
      },
    })

    expect(next.wordListData.words).toEqual([])
    expect(next.uiState.isFinished).toBe(true)
    expect(next.uiState.isTyping).toBe(false)
  })

  it('SKIP_2_WORD_INDEX should jump within the current queue', () => {
    const state = createState([createWord('alpha', 0), createWord('beta', 1), createWord('gamma', 2)], 1)

    const next = typingReducer(state, {
      type: TypingStateActionType.SKIP_2_WORD_INDEX,
      newIndex: 2,
    })

    expect(next.wordListData.index).toBe(2)
    expect(next.uiState.isFinished).toBe(false)
  })

  it('SKIP_2_WORD_INDEX should stop typing when jumping past the queue end', () => {
    const state = createState([createWord('alpha', 0)], 0)

    const next = typingReducer(state, {
      type: TypingStateActionType.SKIP_2_WORD_INDEX,
      newIndex: 5,
    })

    expect(next.wordListData.index).toBe(0)
    expect(next.uiState.isFinished).toBe(true)
    expect(next.uiState.isTyping).toBe(false)
  })
})

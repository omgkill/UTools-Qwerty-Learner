// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWordCompletion } from './useWordCompletion'
import type { WordState } from './useWordState'
import { WordPanelRuntimeProvider } from '../../../runtime'
import type { WordPanelRuntimeValue } from '../../../runtime'
import type { WordWithIndex } from '@/typings'

const word: WordWithIndex = {
  name: 'apple',
  index: 0,
  trans: [],
  usphone: '',
  ukphone: '',
}

function createWordState(partial: Partial<WordState>): WordState {
  return {
    wordName: word.name,
    displayWord: word.name,
    inputWord: word.name,
    letterStates: ['correct', 'correct', 'correct', 'correct', 'correct'],
    isFinished: false,
    hasWrong: false,
    hasMadeInputWrong: false,
    wrongCount: 0,
    startTime: '',
    endTime: '',
    inputCount: 0,
    correctCount: 0,
    letterTimeArray: [],
    letterMistake: {},
    ...partial,
  }
}

function createRuntimeValue(reportCorrectWord = vi.fn()): WordPanelRuntimeValue {
  return {
    words: [word],
    currentIndex: 0,
    isTyping: true,
    isImmersiveMode: false,
    isTransVisible: true,
    isRepeatLearning: false,
    timerTime: 0,
    wordInfoMap: {},
    actions: {
      updateWordInfo: vi.fn(),
      skipToIndex: vi.fn(),
      reportWrongWord: vi.fn(),
      reportCorrectWord,
      increaseCorrectCount: vi.fn(),
      increaseWrongCount: vi.fn(),
    },
  }
}

function HookHarness({
  wordState,
  onFinish,
}: {
  wordState: WordState
  onFinish: (params: { isCorrect: boolean; wrongCount: number }) => void
}) {
  useWordCompletion(word, wordState, onFinish)

  return <div />
}

describe('useWordCompletion', () => {
  it('finishes as correct with wrongCount when the word was mistyped before completion', async () => {
    const onFinish = vi.fn()
    const reportCorrectWord = vi.fn()

    render(
      <WordPanelRuntimeProvider value={createRuntimeValue(reportCorrectWord)}>
        <HookHarness
          wordState={createWordState({
            isFinished: true,
            hasWrong: true,
            hasMadeInputWrong: true,
            wrongCount: 2,
          })}
          onFinish={onFinish}
        />
      </WordPanelRuntimeProvider>,
    )

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({ isCorrect: true, wrongCount: 2 })
    })
    expect(reportCorrectWord).not.toHaveBeenCalled()
  })
})

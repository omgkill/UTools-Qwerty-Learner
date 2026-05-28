import type { LetterState } from './Letter'

export type WordInputState = {
  inputWord: string
  letterStates: LetterState[]
  isComplete: boolean
  hasError: boolean
}

/**
 * 创建初始输入状态
 */
export function createInitialInputState(word: string): WordInputState {
  const displayWord = word.replace(/ /g, '␣')
  return {
    inputWord: '',
    letterStates: new Array(displayWord.length).fill('pending'),
    isComplete: false,
    hasError: false,
  }
}

/**
 * 处理输入，返回新状态
 */
export function processInput(
  state: WordInputState,
  word: string,
  inputChar: string,
  ignoreCase: boolean = true
): WordInputState {
  const displayWord = word.replace(/ /g, '␣')
  const inputLength = state.inputWord.length

  // 已完成或已出错，不处理
  if (state.isComplete || state.hasError) {
    return state
  }

  // 检查输入是否正确
  const expectedChar = displayWord[inputLength]
  let isCorrect = false
  if (expectedChar !== undefined && inputChar !== undefined) {
    isCorrect = ignoreCase
      ? inputChar.toLowerCase() === expectedChar.toLowerCase()
      : inputChar === expectedChar
  }

  if (isCorrect) {
    // 正确输入
    const newLetterStates = [...state.letterStates]
    newLetterStates[inputLength] = 'correct'

    const newInputWord = state.inputWord + inputChar
    const isComplete = newInputWord.length === displayWord.length

    return {
      inputWord: newInputWord,
      letterStates: newLetterStates,
      isComplete,
      hasError: false,
    }
  } else {
    // 错误输入
    const newLetterStates = [...state.letterStates]
    newLetterStates[inputLength] = 'wrong'

    return {
      inputWord: state.inputWord,
      letterStates: newLetterStates,
      isComplete: false,
      hasError: true,
    }
  }
}

/**
 * 清除错误状态，准备重新输入
 */
export function clearError(state: WordInputState): WordInputState {
  const displayWordLength = state.letterStates.length
  return {
    inputWord: '',
    letterStates: new Array(displayWordLength).fill('pending'),
    isComplete: false,
    hasError: false,
  }
}
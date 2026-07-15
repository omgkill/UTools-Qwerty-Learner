import { EXPLICIT_SPACE } from '@/constants'
import { getLocalTimeString } from '@/utils/timeService'
import { useImmer } from 'use-immer'
import { useEffect, useRef } from 'react'

export type LetterState = 'normal' | 'correct' | 'wrong'

// 本地类型，仅用于 UI 显示，不持久化
export type LetterMistakes = {
  [index: number]: string[]
}

export type WordState = {
  wordName: string
  displayWord: string
  inputWord: string
  letterStates: LetterState[]
  isFinished: boolean
  hasWrong: boolean
  hasMadeInputWrong: boolean
  wrongCount: number
  startTime: string
  endTime: string
  inputCount: number
  correctCount: number
  letterTimeArray: number[]
  letterMistake: LetterMistakes
}

export const initialWordState: WordState = {
  wordName: '',
  displayWord: '',
  inputWord: '',
  letterStates: [],
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
}

function createWordState(wordName: string): WordState {
  let headword = wordName.replace(new RegExp(' ', 'g'), EXPLICIT_SPACE)
  headword = headword.replace(new RegExp('…', 'g'), '..')

  return {
    ...structuredClone(initialWordState),
    wordName,
    displayWord: headword,
    letterStates: new Array(headword.length).fill('normal'),
    startTime: getLocalTimeString(),
  }
}

export function useWordState(wordName: string) {
  const [wordState, setWordState] = useImmer<WordState>(createWordState(wordName))
  const lastWordNameRef = useRef<string | null>(null)

  useEffect(() => {
    const prevWord = lastWordNameRef.current
    if (prevWord === wordName) return
    lastWordNameRef.current = wordName
    setWordState(createWordState(wordName))
  }, [wordName, setWordState])

  return { wordState, setWordState }
}

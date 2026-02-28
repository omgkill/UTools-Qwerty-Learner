import { EXPLICIT_SPACE } from '@/constants'
import { getLocalTimeString } from '@/utils/timeService'
import type { LetterMistakes } from '@/utils/db/record'
import { useImmer } from 'use-immer'
import { useEffect, useRef } from 'react'

export type LetterState = 'normal' | 'correct' | 'wrong'

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

export function useWordState(wordName: string) {
  const [wordState, setWordState] = useImmer<WordState>(structuredClone(initialWordState))
  const lastWordNameRef = useRef<string | null>(null)

  useEffect(() => {
    const prevWord = lastWordNameRef.current
    if (prevWord === wordName) return
    lastWordNameRef.current = wordName

    let headword = wordName.replace(new RegExp(' ', 'g'), EXPLICIT_SPACE)
    headword = headword.replace(new RegExp('…', 'g'), '..')

    const newWordState = structuredClone(initialWordState)
    newWordState.wordName = wordName
    newWordState.displayWord = headword
    newWordState.letterStates = new Array(headword.length).fill('normal')
    newWordState.startTime = getLocalTimeString()
    setWordState(newWordState)
  }, [wordName, setWordState])

  return { wordState, setWordState }
}

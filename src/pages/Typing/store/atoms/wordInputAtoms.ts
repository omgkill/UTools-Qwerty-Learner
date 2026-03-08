import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import { EXPLICIT_SPACE } from '@/constants'
import { getLocalTimeString } from '@/utils/timeService'

export type LetterState = 'normal' | 'correct' | 'wrong'

export type LetterMistakes = Record<number, string[]>

export type WordInputState = {
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

export const initialWordInputState: WordInputState = {
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

export const wordInputStateAtom = atomWithImmer<WordInputState>(structuredClone(initialWordInputState))

export const resetWordInputAtom = atom(null, (_get, set, wordName: string) => {
  let headword = wordName.replace(new RegExp(' ', 'g'), EXPLICIT_SPACE)
  headword = headword.replace(new RegExp('…', 'g'), '..')

  set(wordInputStateAtom, {
    wordName,
    displayWord: headword,
    inputWord: '',
    letterStates: new Array(headword.length).fill('normal'),
    isFinished: false,
    hasWrong: false,
    hasMadeInputWrong: false,
    wrongCount: 0,
    startTime: getLocalTimeString(),
    endTime: '',
    inputCount: 0,
    correctCount: 0,
    letterTimeArray: [],
    letterMistake: {},
  })
})

export const updateInputWordAtom = atom(null, (_get, set, input: string) => {
  set(wordInputStateAtom, (draft) => {
    draft.inputWord = input
    draft.inputCount += 1
  })
})

export const markLetterCorrectAtom = atom(null, (_get, set, index: number) => {
  set(wordInputStateAtom, (draft) => {
    if (index < draft.letterStates.length) {
      draft.letterStates[index] = 'correct'
      draft.correctCount += 1
    }
  })
})

export const markLetterWrongAtom = atom(null, (_get, set, index: number, typedChar: string) => {
  set(wordInputStateAtom, (draft) => {
    if (index < draft.letterStates.length) {
      draft.letterStates[index] = 'wrong'
      draft.hasWrong = true
      draft.hasMadeInputWrong = true
      draft.wrongCount += 1
      
      if (!draft.letterMistake[index]) {
        draft.letterMistake[index] = []
      }
      draft.letterMistake[index].push(typedChar)
    }
  })
})

export const markWordFinishedAtom = atom(null, (_get, set) => {
  set(wordInputStateAtom, (draft) => {
    draft.isFinished = true
    draft.endTime = getLocalTimeString()
  })
})

export const pushLetterTimeAtom = atom(null, (_get, set, time: number) => {
  set(wordInputStateAtom, (draft) => {
    draft.letterTimeArray.push(time)
  })
})

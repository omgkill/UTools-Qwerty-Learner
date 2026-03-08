import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { TimerData } from '@/types'
import { currentIndexAtom } from './wordListAtoms'

const initialTimerData: TimerData = { time: 0, accuracy: 0, wpm: 0 }

export const wordCountAtom = atomWithImmer<number>(0)
export const correctCountAtom = atomWithImmer<number>(0)
export const wrongCountAtom = atomWithImmer<number>(0)
export const wrongWordIndexesAtom = atomWithImmer<number[]>([])
export const correctWordIndexesAtom = atomWithImmer<number[]>([])
export const wordRecordIdsAtom = atomWithImmer<number[]>([])
export const timerDataAtom = atomWithImmer<TimerData>(initialTimerData)

export const totalInputCountAtom = atom((get) => {
  return get(correctCountAtom) + get(wrongCountAtom)
})

export const accuracyAtom = atom((get) => {
  const total = get(totalInputCountAtom)
  if (total === 0) return 0
  return Math.round((get(correctCountAtom) / total) * 100)
})

export const reportWrongWordAtom = atom(null, (get, set) => {
  const wordIndex = get(currentIndexAtom)
  const wrongIndexes = get(wrongWordIndexesAtom)
  if (!wrongIndexes.includes(wordIndex)) {
    set(wrongWordIndexesAtom, (draft) => {
      draft.push(wordIndex)
    })
  }
})

export const reportCorrectWordAtom = atom(null, (get, set) => {
  const wordIndex = get(currentIndexAtom)
  const correctIndexes = get(correctWordIndexesAtom)
  const wrongIndexes = get(wrongWordIndexesAtom)
  if (!correctIndexes.includes(wordIndex) && !wrongIndexes.includes(wordIndex)) {
    set(correctWordIndexesAtom, (draft) => {
      draft.push(wordIndex)
    })
  }
})

export const increaseCorrectCountAtom = atom(null, (get, set) => {
  set(correctCountAtom, (draft) => draft + 1)
})

export const increaseWrongCountAtom = atom(null, (get, set) => {
  set(wrongCountAtom, (draft) => draft + 1)
})

export const tickTimerAtom = atom(null, (get, set, increment = 1) => {
  const newTime = get(timerDataAtom).time + increment
  const wordCount = get(wordCountAtom)
  const correctCount = get(correctCountAtom)
  const totalInput = correctCount + get(wrongCountAtom)

  set(timerDataAtom, (draft) => {
    draft.time = newTime
    draft.accuracy = totalInput === 0 ? 0 : Math.round((correctCount / totalInput) * 100)
    draft.wpm = newTime === 0 ? 0 : Math.round((wordCount / newTime) * 60)
  })
})

export const addWordRecordIdAtom = atom(null, (get, set, id: number) => {
  set(wordRecordIdsAtom, (draft) => {
    draft.push(id)
  })
})

export const incrementWordCountAtom = atom(null, (get, set) => {
  set(wordCountAtom, (draft) => draft + 1)
})

export const resetStatsAtom = atom(null, (get, set) => {
  set(wordCountAtom, 0)
  set(correctCountAtom, 0)
  set(wrongCountAtom, 0)
  set(wrongWordIndexesAtom, [])
  set(correctWordIndexesAtom, [])
  set(wordRecordIdsAtom, [])
  set(timerDataAtom, { time: 0, accuracy: 0, wpm: 0 })
})

import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { WordDisplayInfo, WordDisplayInfoMap } from '@/types'

export const wordDisplayInfoMapAtom = atomWithImmer<WordDisplayInfoMap>({})

export const getWordDisplayInfoAtom = (wordName: string) => atom((get) => get(wordDisplayInfoMapAtom)[wordName])

export const updateWordDisplayInfoAtom = atom(null, (get, set, payload: { wordName: string; data: WordDisplayInfo }) => {
  set(wordDisplayInfoMapAtom, (draft) => {
    draft[payload.wordName] = { ...draft[payload.wordName], ...payload.data }
  })
})

export const clearWordDisplayInfoMapAtom = atom(null, (get, set) => {
  set(wordDisplayInfoMapAtom, {})
})

import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { WordWithIndex } from '@/types'

export const wordsAtom = atomWithImmer<WordWithIndex[]>([])
export const currentIndexAtom = atomWithImmer<number>(0)

export const currentWordAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return words[index] ?? null
})

export const prevWordAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return index > 0 ? words[index - 1] ?? null : null
})

export const nextWordDisplayAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return index < words.length - 1 ? words[index + 1] ?? null : null
})

export const isLastWordAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return index >= words.length - 1
})

export const progressAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return words.length > 0 ? Math.round((index / words.length) * 100) : 0
})

export const setWordsAtom = atom(null, (get, set, words: WordWithIndex[]) => {
  const currentWord = get(currentWordAtom)
  const newIndex = currentWord ? words.findIndex((w) => w.name === currentWord.name) : 0
  set(wordsAtom, words)
  set(currentIndexAtom, newIndex >= 0 ? newIndex : 0)
})

export const nextWordAtom = atom(null, (get, set) => {
  const words = get(wordsAtom)
  const currentIndex = get(currentIndexAtom)
  const newIndex = currentIndex + 1
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false
  }
  return true
})

export const skipWordAtom = atom(null, (get, set) => {
  const words = get(wordsAtom)
  const currentIndex = get(currentIndexAtom)
  const newIndex = currentIndex + 1
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false
  }
  return true
})

export const skipToIndexAtom = atom(null, (get, set, newIndex: number) => {
  const words = get(wordsAtom)
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false
  }
  return true
})

export const addReplacementWordAtom = atom(null, (get, set, word: WordWithIndex) => {
  set(wordsAtom, (draft) => {
    draft.push(word)
  })
})

export const resetProgressAtom = atom(null, (get, set) => {
  set(currentIndexAtom, 0)
})

export const setCurrentIndexAtom = atom(null, (get, set, index: number) => {
  set(currentIndexAtom, index)
})

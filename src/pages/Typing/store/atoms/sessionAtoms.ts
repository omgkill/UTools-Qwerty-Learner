import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { LearningStats } from '@/types'

export type LearningType = 'review' | 'new' | 'complete'

const initialStats: LearningStats = {
  todayLearned: 0,
  todayReviewed: 0,
  todayMastered: 0,
  dueCount: 0,
  newCount: 0,
  masteredCount: 0,
}

export const isLoadingAtom = atomWithImmer<boolean>(true)
export const hasWordsAtom = atomWithImmer<boolean>(true)
export const learningTypeAtom = atomWithImmer<LearningType>('review')
export const sessionStatsAtom = atomWithImmer<LearningStats>(initialStats)
export const isAppInitializedAtom = atomWithImmer<boolean>(false)

export const setIsLoadingAtom = atom(null, (_get, set, value: boolean) => {
  set(isLoadingAtom, value)
})

export const setHasWordsAtom = atom(null, (_get, set, value: boolean) => {
  set(hasWordsAtom, value)
})

export const setLearningTypeAtom = atom(null, (_get, set, value: LearningType) => {
  set(learningTypeAtom, value)
})

export const setSessionStatsAtom = atom(null, (_get, set, value: LearningStats) => {
  set(sessionStatsAtom, value)
})

export const setIsAppInitializedAtom = atom(null, (_get, set, value: boolean) => {
  set(isAppInitializedAtom, value)
})

export const resetSessionAtom = atom(null, (_get, set) => {
  set(isLoadingAtom, true)
  set(hasWordsAtom, true)
  set(learningTypeAtom, 'review')
  set(sessionStatsAtom, initialStats)
})

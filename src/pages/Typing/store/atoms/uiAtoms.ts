import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'

export const isTypingAtom = atomWithImmer<boolean>(false)
export const isFinishedAtom = atomWithImmer<boolean>(false)
export const isShowSkipAtom = atomWithImmer<boolean>(false)
export const isExtraReviewAtom = atomWithImmer<boolean>(false)
export const isRepeatLearningAtom = atomWithImmer<boolean>(false)
export const isCurrentWordMasteredAtom = atomWithImmer<boolean>(false)
export const isSavingRecordAtom = atomWithImmer<boolean>(false)
export const isTransVisibleAtom = atomWithImmer<boolean>(true)
export const isImmersiveModeAtom = atomWithImmer<boolean>(false)

export const setIsTypingAtom = atom(null, (get, set, value: boolean) => {
  set(isTypingAtom, value)
})

export const toggleIsTypingAtom = atom(null, (get, set) => {
  set(isTypingAtom, (draft) => !draft)
})

export const setIsShowSkipAtom = atom(null, (get, set, value: boolean) => {
  set(isShowSkipAtom, value)
})

export const setIsCurrentWordMasteredAtom = atom(null, (get, set, value: boolean) => {
  set(isCurrentWordMasteredAtom, value)
})

export const setIsSavingRecordAtom = atom(null, (get, set, value: boolean) => {
  set(isSavingRecordAtom, value)
})

export const setIsRepeatLearningAtom = atom(null, (get, set, value: boolean) => {
  set(isRepeatLearningAtom, value)
})

export const finishLearningAtom = atom(null, (get, set) => {
  set(isTypingAtom, false)
  set(isFinishedAtom, true)
})

export const toggleTransVisibleAtom = atom(null, (get, set) => {
  set(isTransVisibleAtom, (draft) => !draft)
})

export const toggleImmersiveModeAtom = atom(null, (get, set, value?: boolean) => {
  if (typeof value === 'boolean') {
    set(isImmersiveModeAtom, value)
  } else {
    set(isImmersiveModeAtom, (draft) => !draft)
  }
})

export const resetUIStateAtom = atom(null, (get, set) => {
  set(isTypingAtom, true)
  set(isFinishedAtom, false)
  set(isShowSkipAtom, false)
  set(isCurrentWordMasteredAtom, false)
})

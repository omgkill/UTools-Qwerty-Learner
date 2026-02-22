import { createContext } from 'react'
import type { TypingState, TypingStateAction } from './types'

export type { TypingState, TypingStateAction, WordInfo, WordInfoMap, TimerData, WordListData, StatsData, UIState } from './types'
export { initialState, initialWordListData, initialStatsData, initialUIState, initialTimerData } from './initialState'
export { TypingStateActionType, type TypingStateAction as TypingStateActionType } from './actions'
export { typingReducer } from './reducer'

type Dispatch = (action: TypingStateAction) => void

export const TypingContext = createContext<{ state: TypingState; dispatch: Dispatch } | null>(null)

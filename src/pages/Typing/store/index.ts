import { createContext } from 'react'
import type { TypingState, TypingStateAction } from './types'

export type { TypingState, TypingStateAction, WordInfo, WordInfoMap, TimerData, WordListData, StatsData, UIState } from './types'
export { initialState, initialWordListData, initialStatsData, initialUIState, initialTimerData } from './initialState'
// 只导出枚举，移除重名的类型别名导出（原 `type TypingStateAction as TypingStateActionType` 语义混乱）
export { TypingStateActionType } from './actions'
export { typingReducer } from './reducer'

type Dispatch = (action: TypingStateAction) => void

export const TypingContext = createContext<{ state: TypingState; dispatch: Dispatch } | null>(null)

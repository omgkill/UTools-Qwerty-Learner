export type { TypingState, WordInfo, WordInfoMap, TimerData, WordListData, StatsData, UIState } from './types'
export type { TypingStateAction } from './actions'
export { initialState, initialWordListData, initialStatsData, initialUIState, initialTimerData } from './initialState'
// 只导出枚举，移除重名的类型别名导出（原 `type TypingStateAction as TypingStateActionType` 语义混乱）
export { TypingStateActionType } from './actions'
export { TypingContext } from './context'
export { TypingPageProvider, useTypingContext } from './provider'
export { typingReducer } from './reducer'

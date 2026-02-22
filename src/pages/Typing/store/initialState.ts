import type { StatsData, TimerData, UIState, TypingState, WordListData } from './types'

export const initialWordListData: WordListData = {
  words: [],
  index: 0,
}

export const initialTimerData: TimerData = {
  time: 0,
  accuracy: 0,
  wpm: 0,
}

export const initialStatsData: StatsData = {
  wordCount: 0,
  correctCount: 0,
  wrongCount: 0,
  wrongWordIndexes: [],
  correctWordIndexes: [],
  wordRecordIds: [],
  timerData: initialTimerData,
}

export const initialUIState: UIState = {
  isTyping: false,
  isFinished: false,
  isShowSkip: false,
  isExtraReview: false,
  isCurrentWordMastered: false,
  isSavingRecord: false,
}

export const initialState: TypingState = {
  wordListData: initialWordListData,
  statsData: initialStatsData,
  wordInfoMap: {},
  uiState: initialUIState,
  isTransVisible: true,
  isImmersiveMode: false,
}

import type { WordWithIndex } from '@/typings'

export type WordInfo = {
  trans?: string[]
  ukphone?: string
  tense?: string
}

export type WordInfoMap = Record<string, WordInfo>

export type TimerData = {
  time: number
  accuracy: number
  wpm: number
}

export type WordListData = {
  words: WordWithIndex[]
  index: number
}

export type StatsData = {
  wordCount: number
  correctCount: number
  wrongCount: number
  wrongWordIndexes: number[]
  correctWordIndexes: number[]
  wordRecordIds: number[]
  timerData: TimerData
}

export type UIState = {
  isTyping: boolean
  isFinished: boolean
  isShowSkip: boolean
  isExtraReview: boolean
  isRepeatLearning: boolean
  isCurrentWordMastered: boolean
  isSavingRecord: boolean
}

export type TypingState = {
  wordListData: WordListData
  statsData: StatsData
  wordInfoMap: WordInfoMap
  uiState: UIState
  isTransVisible: boolean
  isImmersiveMode: boolean
}

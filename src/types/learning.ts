import type { Word, WordBank } from './resource'

export type WordWithIndex = Word & {
  index: number
}

export type WordDisplayInfo = {
  trans?: string[]
  ukphone?: string
  tense?: string
}

export type WordDisplayInfoMap = Record<string, WordDisplayInfo>

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
  wordDisplayInfoMap: WordDisplayInfoMap
  uiState: UIState
  isTransVisible: boolean
  isImmersiveMode: boolean
}

export type LearningMode = 'normal' | 'repeat' | 'consolidate'

export interface LearningStats {
  todayLearned: number
  todayReviewed: number
  todayMastered: number
  dueCount: number
  newCount: number
  masteredCount: number
}

export interface WordSourceStrategy {
  getWordNames(dictId: string, wordList: string[]): string[]
  getStats(dictId: string, wordList: string[]): LearningStats
  needsSessionPersist: boolean
}

export interface UseLearningSessionOptions {
  mode: LearningMode
  currentWordBank: WordBank
}

export interface UseLearningSessionResult {
  isLoading: boolean
  hasWords: boolean
  isFinished: boolean
  learningType: 'review' | 'new' | 'complete'
  stats: LearningStats
  displayIndex: number
  handleMastered: (() => Promise<void>) | undefined
  handleExit: () => void
}

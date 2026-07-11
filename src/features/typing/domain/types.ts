import type { Word, WordWithIndex } from '@/typings'

export type LearningType = 'review' | 'new' | 'complete'
export type TypingStateSessionType = 'normal' | 'repeat' | 'consolidate'
export type QueuedLearningSessionType = 'repeat' | 'consolidate'

export type TypingWordKind = 'new' | 'review' | 'replacement'

export type TypingSessionQueueItem = {
  word: WordWithIndex
  kind: TypingWordKind
}

export type TypingSessionTodayCounts = {
  learned: number
  reviewed: number
  extraReviewed: number
  mastered: number
}

export type TypingSession = {
  dictId: string
  mode: 'normal'
  learningType: LearningType
  queueWords: TypingSessionQueueItem[]
  currentIndex: number
  currentWord?: WordWithIndex
  currentWordKind?: TypingWordKind
  todayCounts: TypingSessionTodayCounts
  dueCount: number
  newCount: number
  masteredCount: number
  isFinished: boolean
}

export type TypingWordProgress = {
  id?: number
  word: string
  dict: string
  masteryLevel: number
  nextReviewTime: number
  lastReviewTime: number
  correctCount: number
  wrongCount: number
  streak: number
  reps: number
}

export type TypingDailyRecord = {
  id?: number
  dict: string
  date: string
  reviewedCount: number
  learnedCount: number
  extraReviewedCount: number
  masteredCount: number
  lastUpdateTime: number
}

export type LearningState = {
  reviewedCount: number
  learnedCount: number
}

export type WordProgressInfo = {
  word: string
  masteryLevel: number
  nextReviewTime: number
}

export type DetermineLearningTypeParams = {
  dueWords: WordWithIndex[]
  newWords: WordWithIndex[]
  reviewedCount: number
  learnedCount: number
  allProgress: (TypingWordProgress | undefined)[]
  wordList: Word[]
}

export type DetermineLearningTypeResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
}

export interface TypingStateSnapshot {
  id?: number
  dict: string
  date: string
  sessionType?: TypingStateSessionType
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
  queueWords?: TypingSessionQueueItem[]
  currentWordKind?: TypingWordKind
  learningType?: LearningType
  todayCounts?: TypingSessionTodayCounts
  dueCount?: number
  newCount?: number
  masteredCount?: number
  isFinished?: boolean
}

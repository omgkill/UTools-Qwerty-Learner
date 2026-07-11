import type { Word, WordWithIndex } from '@/typings'

export type LearningType = 'review' | 'new' | 'complete'

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
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
}

import { LEARNING_CONFIG } from '@/utils/db/progress'
import type { IWordProgress } from '@/utils/db/progress'
import type { Word, WordWithIndex } from '@/typings'

export type LearningType = 'review' | 'new' | 'complete'

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
  allProgress: (IWordProgress | undefined)[]
  wordList: Word[]
}

export type DetermineLearningTypeResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
}

export function determineLearningType(params: DetermineLearningTypeParams): DetermineLearningTypeResult {
  const { dueWords, newWords, reviewedCount, learnedCount } = params

  if (dueWords.length > 0) {
    if (dueWords.length > LEARNING_CONFIG.DAILY_LIMIT) {
      return {
        learningType: 'review',
        learningWords: dueWords,
        dueCount: dueWords.length,
        newCount: newWords.length,
      }
    }

    const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)
    const newWordQuota = Math.max(0, remaining - dueWords.length)
    
    const wordsToReturn = [
      ...dueWords,
      ...newWords.slice(0, newWordQuota)
    ]

    return {
      learningType: 'review',
      learningWords: wordsToReturn,
      dueCount: dueWords.length,
      newCount: newWords.length,
    }
  }

  const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)

  if (remaining > 0 && newWords.length > 0) {
    const wordsToLearn = newWords.slice(0, remaining)
    return {
      learningType: 'new',
      learningWords: wordsToLearn,
      dueCount: 0,
      newCount: newWords.length,
    }
  }

  return {
    learningType: 'complete',
    learningWords: [],
    dueCount: 0,
    newCount: 0,
  }
}

export function calculateNewWordQuota(reviewedCount: number, learnedCount: number): number {
  return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)
}

export function calculateRemainingForTarget(reviewedCount: number, learnedCount: number): number {
  return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)
}

export function hasReachedDailyTarget(reviewedCount: number, learnedCount: number): boolean {
  return reviewedCount + learnedCount >= LEARNING_CONFIG.DAILY_LIMIT
}

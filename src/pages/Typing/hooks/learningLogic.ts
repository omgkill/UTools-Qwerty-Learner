import type { Word, WordWithIndex } from '@/types'

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
  wordList: Word[]
  dailyLimit: number
}

export type DetermineLearningTypeResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
}

export function determineLearningType(params: DetermineLearningTypeParams): DetermineLearningTypeResult {
  const { dueWords, newWords, reviewedCount, learnedCount, dailyLimit } = params

  if (dueWords.length > 0) {
    if (dueWords.length > dailyLimit) {
      return {
        learningType: 'review',
        learningWords: dueWords,
        dueCount: dueWords.length,
        newCount: newWords.length,
      }
    }

    const remaining = Math.max(0, dailyLimit - reviewedCount - learnedCount)
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

  const remaining = Math.max(0, dailyLimit - reviewedCount - learnedCount)

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

export function calculateNewWordQuota(reviewedCount: number, learnedCount: number, dailyLimit: number): number {
  return Math.max(0, dailyLimit - reviewedCount - learnedCount)
}

export function calculateRemainingForTarget(reviewedCount: number, learnedCount: number, dailyLimit: number): number {
  return Math.max(0, dailyLimit - reviewedCount - learnedCount)
}

export function hasReachedDailyTarget(reviewedCount: number, learnedCount: number, dailyLimit: number): boolean {
  return reviewedCount + learnedCount >= dailyLimit
}

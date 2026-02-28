import { LEARNING_CONFIG } from '@/utils/db/progress'
import type { IWordProgress } from '@/utils/db/progress'
import type { Word, WordWithIndex } from '@/typings'

export type LearningType = 'review' | 'new' | 'consolidate' | 'complete'

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
  isExtraReview?: boolean
}

export type DetermineLearningTypeResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  hasMoreDueWords?: boolean
  remainingDueCount?: number
}

export function determineLearningType(params: DetermineLearningTypeParams): DetermineLearningTypeResult {
  const { dueWords, newWords, reviewedCount, learnedCount, allProgress, wordList, isExtraReview = false } = params

  const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)

  if (!isExtraReview && reviewedCount + learnedCount >= LEARNING_CONFIG.DAILY_LIMIT) {
    if (dueWords.length > 0) {
      return {
        learningType: 'complete',
        learningWords: [],
        hasMoreDueWords: true,
        remainingDueCount: dueWords.length,
      }
    }
    return {
      learningType: 'complete',
      learningWords: [],
    }
  }

  if (dueWords.length > 0) {
    const wordsToReturn = isExtraReview ? dueWords : dueWords.slice(0, remaining)
    const hasMore = isExtraReview ? false : dueWords.length > remaining
    
    // 如果到期词不足剩余配额，应该补充新词
    if (!isExtraReview && dueWords.length < remaining) {
      const newWordQuota = remaining - dueWords.length
      const wordsToReturnWithNew = [
        ...wordsToReturn,
        ...newWords.slice(0, newWordQuota)
      ]
      return {
        learningType: 'review',
        learningWords: wordsToReturnWithNew,
        hasMoreDueWords: hasMore,
        remainingDueCount: hasMore ? dueWords.length - remaining : 0,
      }
    }
    
    return {
      learningType: 'review',
      learningWords: wordsToReturn,
      hasMoreDueWords: hasMore,
      remainingDueCount: hasMore ? dueWords.length - remaining : 0,
    }
  }

  const quota = remaining

  if (quota > 0 && newWords.length > 0) {
    const wordsToLearn = newWords.slice(0, quota)
    return {
      learningType: 'new',
      learningWords: wordsToLearn,
    }
  }

  const learnedWords = wordList
    .map((word, index) => ({ ...word, index }))
    .filter((word) => {
      const progress = allProgress.find((p) => p?.word === word.name)
      return progress && progress.masteryLevel > 0 && progress.masteryLevel < 7
    })

  const shuffled = [...learnedWords].sort(() => Math.random() - 0.5)

  return {
    learningType: 'consolidate',
    learningWords: shuffled.slice(0, remaining),
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

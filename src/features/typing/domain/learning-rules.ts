import { LEARNING_CONFIG, MASTERY_LEVELS } from './learning-config'
import type { DetermineLearningTypeParams, DetermineLearningTypeResult, TypingWordProgress } from './types'

export function determineLearningType(params: DetermineLearningTypeParams): DetermineLearningTypeResult {
  const { dueWords, newWords, reviewedCount, learnedCount } = params
  const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)

  if (remaining === 0) {
    return {
      learningWords: [],
      reviewWords: [],
      newWords: [],
      dueCount: dueWords.length,
      newCount: 0,
    }
  }

  if (dueWords.length > 0) {
    const reviewWords = dueWords.slice(0, remaining)
    const newWordQuota = Math.max(0, remaining - reviewWords.length)
    const newWordsToLearn = newWords.slice(0, newWordQuota)

    return {
      learningWords: [...reviewWords, ...newWordsToLearn],
      reviewWords,
      newWords: newWordsToLearn,
      dueCount: dueWords.length,
      newCount: newWordsToLearn.length,
    }
  }

  if (newWords.length > 0) {
    const newWordsToLearn = newWords.slice(0, remaining)
    return {
      learningWords: newWordsToLearn,
      reviewWords: [],
      newWords: newWordsToLearn,
      dueCount: 0,
      newCount: newWordsToLearn.length,
    }
  }

  return {
    learningWords: [],
    reviewWords: [],
    newWords: [],
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

/**
 * 判断单个单词是否到期需要复习
 * 纯函数，可独立测试
 */
export function isWordDue(progress: TypingWordProgress, currentTime: number): boolean {
  return progress.nextReviewTime <= currentTime
    && progress.reps > 0
    && progress.masteryLevel < MASTERY_LEVELS.MASTERED
}

/**
 * 筛选所有到期单词
 * 纯函数，可独立测试
 */
export function filterDueWords(allProgress: TypingWordProgress[], currentTime: number): TypingWordProgress[] {
  return allProgress
    .filter(progress => isWordDue(progress, currentTime))
    .sort((a, b) => a.nextReviewTime - b.nextReviewTime)  // 按到期时间排序（早到期在前）
}

/**
 * 判断单词是否为新词（未学习过）
 */
export function isWordNew(progress: TypingWordProgress | undefined): boolean {
  return !progress || progress.masteryLevel === MASTERY_LEVELS.NEW
}

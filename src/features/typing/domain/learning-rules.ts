import { LEARNING_CONFIG, MASTERY_LEVELS } from './learning-config'
import type { DetermineLearningTypeParams, DetermineLearningTypeResult, TypingWordProgress } from './types'

export function determineLearningType(params: DetermineLearningTypeParams): DetermineLearningTypeResult {
  const { dueWords, newWords, reviewedCount, learnedCount } = params

  if (dueWords.length > 0) {
    if (dueWords.length > LEARNING_CONFIG.DAILY_LIMIT) {
      return {
        learningType: 'review',
        learningWords: dueWords.slice(0, LEARNING_CONFIG.DAILY_LIMIT),  // 只返回前20个，确保不超过上限
        dueCount: dueWords.length,
        newCount: 0,  // 复习词超过20个时，没有新词配额
      }
    }

    const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)
    const newWordQuota = Math.max(0, remaining - dueWords.length)
    const actualNewWords = Math.min(newWordQuota, newWords.length)  // 实际可学习的新词数量

    const wordsToReturn = [...dueWords, ...newWords.slice(0, actualNewWords)]

    return {
      learningType: 'review',
      learningWords: wordsToReturn,
      dueCount: dueWords.length,
      newCount: actualNewWords,  // 返回当日可学习的新词数量
    }
  }

  const remaining = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)

  if (remaining > 0 && newWords.length > 0) {
    const wordsToLearn = newWords.slice(0, remaining)
    return {
      learningType: 'new',
      learningWords: wordsToLearn,
      dueCount: 0,
      newCount: Math.min(remaining, newWords.length),  // 返回当日可学习的新词数量
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

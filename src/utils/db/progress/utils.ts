import { MASTERY_LEVELS, REVIEW_INTERVALS } from './constants'
import type { MasteryLevel } from './types'

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getNextReviewTime(masteryLevel: MasteryLevel, easeFactor = 2.5): number {
  const baseDays = REVIEW_INTERVALS[masteryLevel] || 1
  const adjustedDays = baseDays * easeFactor
  return Date.now() + adjustedDays * 24 * 60 * 60 * 1000
}

export function updateMasteryLevel(
  currentLevel: MasteryLevel,
  isCorrect: boolean,
  wrongCount: number,
  easeFactor: number,
): { newLevel: MasteryLevel; newEaseFactor: number } {
  let newLevel = currentLevel
  let newEaseFactor = easeFactor

  if (isCorrect && wrongCount === 0) {
    newLevel = Math.min(currentLevel + 1, MASTERY_LEVELS.MASTERED) as MasteryLevel
    newEaseFactor = Math.min(easeFactor + 0.1, 3.0)
  } else if (isCorrect && wrongCount > 0) {
    newLevel = Math.max(currentLevel, MASTERY_LEVELS.LEARNED) as MasteryLevel
    newEaseFactor = Math.max(easeFactor - 0.1, 1.3)
  } else {
    newLevel = Math.max(currentLevel - 1, MASTERY_LEVELS.NEW) as MasteryLevel
    newEaseFactor = Math.max(easeFactor - 0.2, 1.3)
  }

  return { newLevel, newEaseFactor }
}

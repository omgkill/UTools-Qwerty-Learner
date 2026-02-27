import { REVIEW_INTERVALS } from './constants'
import type { MasteryLevel } from './types'
import { now, getCurrentDate } from '@/utils/timeService'

export function getTodayDate(): string {
  return new Date(now()).toISOString().split('T')[0]
}

export function getNextReviewTime(masteryLevel: MasteryLevel): number {
  const baseDays = REVIEW_INTERVALS[masteryLevel] ?? 1
  const today = getCurrentDate()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()
  return todayStart + baseDays * 24 * 60 * 60 * 1000
}

export function updateMasteryLevel(
  currentLevel: MasteryLevel,
  isCorrect: boolean,
  wrongCount: number,
): { newLevel: MasteryLevel } {
  let newLevel = currentLevel

  if (isCorrect) {
    if (wrongCount === 0) {
      newLevel = Math.min(currentLevel + 1, 6) as MasteryLevel
    } else {
      newLevel = Math.max(currentLevel, 1) as MasteryLevel
    }
  } else {
    newLevel = Math.max(currentLevel - 1, 0) as MasteryLevel
  }

  return { newLevel }
}

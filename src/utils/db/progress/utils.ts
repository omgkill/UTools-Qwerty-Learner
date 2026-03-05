import { REVIEW_INTERVALS } from './constants'
import type { MasteryLevel } from './types'
import { getCurrentDate, getTodayStartTime } from '@/utils/timeService'

export function getTodayDate(): string {
  const date = getCurrentDate()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextReviewTime(masteryLevel: MasteryLevel): number {
  const baseDays = REVIEW_INTERVALS[masteryLevel] ?? 1
  return getTodayStartTime() + baseDays * 24 * 60 * 60 * 1000
}

export function updateMasteryLevel(
  currentLevel: MasteryLevel,
  isCorrect: boolean,
  _wrongCount: number,
): { newLevel: MasteryLevel } {
  if (isCorrect) {
    return { newLevel: Math.min(currentLevel + 1, 6) as MasteryLevel }
  }
  return { newLevel: currentLevel }
}

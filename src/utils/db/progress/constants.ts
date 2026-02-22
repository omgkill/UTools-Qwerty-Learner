export const REVIEW_INTERVALS = [
  0,
  1 / 24,
  1,
  2,
  4,
  7,
  15,
  30,
]

export const MASTERY_LEVELS = {
  NEW: 0,
  LEARNED: 1,
  FAMILIAR: 2,
  KNOWN: 3,
  PROFICIENT: 4,
  ADVANCED: 5,
  EXPERT: 6,
  MASTERED: 7,
} as const

export const DEFAULT_DAILY_LIMIT = 20

let currentDailyLimit = DEFAULT_DAILY_LIMIT

export function setDailyLimit(limit: number): void {
  currentDailyLimit = limit
}

export function getDailyLimit(): number {
  return currentDailyLimit
}

export const LEARNING_CONFIG = {
  get DAILY_LIMIT(): number {
    return currentDailyLimit
  },
} as const

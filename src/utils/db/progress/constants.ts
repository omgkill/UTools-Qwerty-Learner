export const REVIEW_INTERVALS = [
  0,  // NEW (0级)：答对后升级，不停留在此级别被复习
  1,  // LEARNED (1级)：1天后
  2,  // FAMILIAR (2级)：2天后
  4,  // KNOWN (3级)：4天后
  7,  // PROFICIENT (4级)：7天后
  15, // ADVANCED (5级)：15天后
  21, // EXPERT (6级)：21天后
  30, // MASTERED (7级)：30天后
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

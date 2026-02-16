import { getUTCUnixTimestamp } from '../index'

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

export type MasteryLevel = (typeof MASTERY_LEVELS)[keyof typeof MASTERY_LEVELS]

export const LEARNING_CONFIG = {
  BASE_QUOTA: 5,
  REVIEW_TO_NEW_RATIO: 3,
  DAILY_NEW_WORD_LIMIT: 20,
  DAILY_MIN_TARGET: 20,
} as const

export interface IWordProgress {
  id?: number
  word: string
  dict: string
  masteryLevel: MasteryLevel
  nextReviewTime: number
  lastReviewTime: number
  correctCount: number
  wrongCount: number
  streak: number
  easeFactor: number
  reps: number
}

export class WordProgress implements IWordProgress {
  id?: number
  word: string
  dict: string
  masteryLevel: MasteryLevel
  nextReviewTime: number
  lastReviewTime: number
  correctCount: number
  wrongCount: number
  streak: number
  easeFactor: number
  reps: number

  constructor(word: string, dict: string) {
    this.word = word
    this.dict = dict
    this.masteryLevel = MASTERY_LEVELS.NEW
    this.nextReviewTime = Date.now()
    this.lastReviewTime = Date.now()
    this.correctCount = 0
    this.wrongCount = 0
    this.streak = 0
    this.easeFactor = 2.5
    this.reps = 0
  }

  get isDue(): boolean {
    return Date.now() >= this.nextReviewTime
  }

  get accuracy(): number {
    const total = this.correctCount + this.wrongCount
    return total === 0 ? 0 : Math.round((this.correctCount / total) * 100)
  }

  get masteryLabel(): string {
    const labels = ['新词', '初学', '熟悉', '认识', '熟练', '精通', '专家', '已掌握']
    return labels[this.masteryLevel] || '未知'
  }
}

export interface IDictProgress {
  id?: number
  dict: string
  totalWords: number
  learnedWords: number
  masteredWords: number
  lastStudyTime: number
  studyDays: number
  currentChapter: number
}

export class DictProgress implements IDictProgress {
  id?: number
  dict: string
  totalWords: number
  learnedWords: number
  masteredWords: number
  lastStudyTime: number
  studyDays: number
  currentChapter: number

  constructor(dict: string, totalWords: number = 0) {
    this.dict = dict
    this.totalWords = totalWords
    this.learnedWords = 0
    this.masteredWords = 0
    this.lastStudyTime = Date.now()
    this.studyDays = 0
    this.currentChapter = 0
  }

  get progressPercent(): number {
    return this.totalWords === 0 ? 0 : Math.round((this.masteredWords / this.totalWords) * 100)
  }

  get learningPercent(): number {
    return this.totalWords === 0 ? 0 : Math.round((this.learnedWords / this.totalWords) * 100)
  }
}

export interface IDailyRecord {
  id?: number
  dict: string
  date: string
  reviewedCount: number
  learnedCount: number
  lastUpdateTime: number
}

export class DailyRecord implements IDailyRecord {
  id?: number
  dict: string
  date: string
  reviewedCount: number
  learnedCount: number
  lastUpdateTime: number

  constructor(dict: string, date: string) {
    this.dict = dict
    this.date = date
    this.reviewedCount = 0
    this.learnedCount = 0
    this.lastUpdateTime = Date.now()
  }

  get totalToday(): number {
    return this.reviewedCount + this.learnedCount
  }

  getNewWordQuota(): number {
    const { BASE_QUOTA, REVIEW_TO_NEW_RATIO, DAILY_NEW_WORD_LIMIT } = LEARNING_CONFIG
    const bonusQuota = Math.floor(this.reviewedCount / REVIEW_TO_NEW_RATIO)
    const totalQuota = Math.min(BASE_QUOTA + bonusQuota, DAILY_NEW_WORD_LIMIT)
    return Math.max(0, totalQuota - this.learnedCount)
  }

  get remainingForTarget(): number {
    return Math.max(0, LEARNING_CONFIG.DAILY_MIN_TARGET - this.totalToday)
  }

  get hasReachedTarget(): boolean {
    return this.totalToday >= LEARNING_CONFIG.DAILY_MIN_TARGET
  }
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getNextReviewTime(masteryLevel: MasteryLevel, easeFactor: number = 2.5): number {
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
    newEaseFactor = Math.max(easeFactor - 0.1, 1.3)
  } else {
    newLevel = Math.max(currentLevel - 1, MASTERY_LEVELS.NEW) as MasteryLevel
    newEaseFactor = Math.max(easeFactor - 0.2, 1.3)
  }

  return { newLevel, newEaseFactor }
}

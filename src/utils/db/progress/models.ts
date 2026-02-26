import { LEARNING_CONFIG, MASTERY_LEVELS } from './constants'
import type { IDailyRecord, IDictProgress, IWordProgress, MasteryLevel } from './types'

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

export class DictProgress implements IDictProgress {
  id?: number
  dict: string
  totalWords: number
  learnedWords: number
  masteredWords: number
  lastStudyTime: number
  studyDays: number
  currentChapter: number

  constructor(dict: string, totalWords = 0) {
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

export class DailyRecord implements IDailyRecord {
  id?: number
  dict: string
  date: string
  reviewedCount: number
  learnedCount: number
  extraReviewedCount: number
  masteredCount: number
  lastUpdateTime: number

  constructor(dict: string, date: string) {
    this.dict = dict
    this.date = date
    this.reviewedCount = 0
    this.learnedCount = 0
    this.extraReviewedCount = 0
    this.masteredCount = 0
    this.lastUpdateTime = Date.now()
  }

  get totalToday(): number {
    return this.reviewedCount + this.learnedCount
  }

  get totalReviewed(): number {
    return this.reviewedCount + this.extraReviewedCount
  }

  getNewWordQuota(): number {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - this.reviewedCount - this.learnedCount)
  }

  get remainingForTarget(): number {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - this.totalToday)
  }

  get hasReachedTarget(): boolean {
    return this.totalToday >= LEARNING_CONFIG.DAILY_LIMIT
  }

  get hasExtraReviewQuota(): boolean {
    return this.reviewedCount >= LEARNING_CONFIG.DAILY_LIMIT
  }
}

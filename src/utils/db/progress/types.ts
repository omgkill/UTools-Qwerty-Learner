export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

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
  reps: number
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

export interface IDailyRecord {
  id?: number
  dict: string
  date: string
  reviewedCount: number
  learnedCount: number
  extraReviewedCount: number
  lastUpdateTime: number
  totalToday: number
  totalReviewed: number
  getNewWordQuota: () => number
  remainingForTarget: number
  hasReachedTarget: boolean
  hasExtraReviewQuota: boolean
}

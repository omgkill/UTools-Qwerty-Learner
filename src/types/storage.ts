export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface WordProgress {
  word: string
  dict: string
  masteryLevel: MasteryLevel
  nextReviewTime: number
}

export type WordLearnType = 'new' | 'review'

export interface DailyRecord {
  dict: string
  date: string
  learnedCount: number
  reviewedCount: number
  masteredCount: number
  todayWords: string[]
  wordTypes: Record<string, WordLearnType>
}

export const MASTERY_LABELS = ['新词', '初学', '熟悉', '认识', '熟练', '精通', '专家', '已掌握'] as const

export const REVIEW_INTERVALS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 15,
  6: 30,
  7: 0,
}

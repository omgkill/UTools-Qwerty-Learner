import type { IDailyRecord, IWordProgress } from '@/utils/db/progress'
import type { IWordRecord } from '@/utils/db/record'

export interface DictStats {
  dictId: string
  dictName: string
  totalDays: number
  totalWords: number
  lastStudyDate: string | null
}

export interface DayStats {
  date: string
  learnedCount: number
  reviewedCount: number
  masteredCount: number
  totalWords: number
}

export interface WordDetail {
  word: string
  timeStamp: number
  wrongCount: number
  type: 'new' | 'review' | 'mastered'
}

export interface WordBankSummary {
  id: string
  name: string
}

export type AnalysisWordRecord = IWordRecord
export type AnalysisDailyRecord = IDailyRecord
export type AnalysisWordProgress = IWordProgress

import type { TypingDailyRecord, TypingStateSnapshot, TypingWordProgress } from '../domain'
import type { Word, WordWithIndex } from '@/typings'

export interface WordProgressRepository {
  getProgress(dictId: string, word: string): Promise<TypingWordProgress | undefined>
  getProgressBatch(dictId: string, words: string[]): Promise<Map<string, TypingWordProgress>>
  initProgress(dictId: string, word: string): Promise<TypingWordProgress>
  initProgressBatch(dictId: string, words: string[]): Promise<void>
  markAsMastered(dictId: string, word: string): Promise<TypingWordProgress>
  updateProgress(dictId: string, word: string, isCorrect: boolean, wrongCount: number): Promise<TypingWordProgress>
  getNewWords(dictId: string, allWords: Word[], limit?: number): Promise<WordWithIndex[]>
  getAllProgress(dictId: string): Promise<TypingWordProgress[]>
  getStats(dictId: string): Promise<{
    total: number
    new: number
    learning: number
    mastered: number
    due: number
  }>
}

export interface DailyRecordRepository {
  getTodayRecord(dictId: string): Promise<TypingDailyRecord>
  ensureTodayRecord(dictId: string): Promise<TypingDailyRecord>
  incrementReviewed(dictId: string, isExtra?: boolean): Promise<TypingDailyRecord>
  incrementLearned(dictId: string): Promise<TypingDailyRecord>
  incrementMastered(dictId: string): Promise<TypingDailyRecord>
  getRecord(dictId: string, date: string): Promise<TypingDailyRecord | undefined>
  getRecordsInRange(dictId: string, startDate: string, endDate: string): Promise<TypingDailyRecord[]>
}

export interface TypingStateRepository {
  getStates(dictId: string, date: string): Promise<TypingStateSnapshot[]>
  deleteStates(ids: number[]): Promise<void>
  saveState(state: TypingStateSnapshot): Promise<number>
}

import type { AnalysisDailyRecord, AnalysisWordProgress } from '../domain/types'

export interface AnalysisRepository {
  getDailyRecordsByDict(dictId: string): Promise<AnalysisDailyRecord[]>
  getWordProgressByDict(dictId: string): Promise<AnalysisWordProgress[]>
}

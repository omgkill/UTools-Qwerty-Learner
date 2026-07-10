import type { AnalysisDailyRecord, AnalysisWordProgress, AnalysisWordRecord } from '../domain/types'

export interface AnalysisRepository {
  getAllWordRecords(): Promise<AnalysisWordRecord[]>
  getDailyRecordsByDict(dictId: string): Promise<AnalysisDailyRecord[]>
  getWordRecordsByDict(dictId: string): Promise<AnalysisWordRecord[]>
  getWordProgressByDict(dictId: string): Promise<AnalysisWordProgress[]>
}

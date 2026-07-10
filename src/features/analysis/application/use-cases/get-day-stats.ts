import { buildDayStats } from '../../domain/stats'
import type { DayStats } from '../../domain/types'
import type { AnalysisRepository } from '../ports'

export async function getDayStats(repository: AnalysisRepository, dictId: string): Promise<DayStats[]> {
  const dailyRecords = await repository.getDailyRecordsByDict(dictId)
  return buildDayStats(dailyRecords)
}

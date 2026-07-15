import { buildWordDetails } from '../../domain/stats'
import type { WordDetail } from '../../domain/types'
import type { AnalysisRepository } from '../ports'

export async function getWordDetails(repository: AnalysisRepository, dictId: string, date: string): Promise<WordDetail[]> {
  const [dailyRecords, wordProgressList] = await Promise.all([repository.getDailyRecordsByDict(dictId), repository.getWordProgressByDict(dictId)])
  const dailyRecord = dailyRecords.find((record) => record.date === date)
  return buildWordDetails(dailyRecord, wordProgressList, date)
}

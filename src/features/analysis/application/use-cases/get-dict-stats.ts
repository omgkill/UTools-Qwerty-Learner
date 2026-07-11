import { buildDictStats } from '../../domain/stats'
import type { DictStats, WordBankSummary } from '../../domain/types'
import type { AnalysisRepository } from '../ports'

export async function getDictStats(repository: AnalysisRepository, dictId: string, wordBanks: WordBankSummary[]): Promise<DictStats[]> {
  const [wordProgressList, dailyRecords] = await Promise.all([
    repository.getWordProgressByDict(dictId),
    repository.getDailyRecordsByDict(dictId),
  ])
  return buildDictStats(wordProgressList, dailyRecords, wordBanks)
}

import { buildDictStats } from '../../domain/stats'
import type { DictStats, WordBankSummary } from '../../domain/types'
import type { AnalysisRepository } from '../ports'

export async function getDictStats(repository: AnalysisRepository, wordBanks: WordBankSummary[]): Promise<DictStats[]> {
  const wordRecords = await repository.getAllWordRecords()
  return buildDictStats(wordRecords, wordBanks)
}

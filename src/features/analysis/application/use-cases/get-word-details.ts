import { buildWordDetails } from '../../domain/stats'
import type { WordDetail } from '../../domain/types'
import type { AnalysisRepository } from '../ports'

export async function getWordDetails(repository: AnalysisRepository, dictId: string, date: string): Promise<WordDetail[]> {
  const [wordRecords, wordProgressList] = await Promise.all([
    repository.getWordRecordsByDict(dictId),
    repository.getWordProgressByDict(dictId),
  ])

  return buildWordDetails(wordRecords, wordProgressList, date)
}

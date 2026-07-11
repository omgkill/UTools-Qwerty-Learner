import { normalizeRawQueryWord } from '../../domain'
import type { MdxQueryResult } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export async function queryMdxWord(repository: MdxDictionaryRepository, word: string): Promise<MdxQueryResult[]> {
  const normalizedWord = normalizeRawQueryWord(word)
  if (!normalizedWord) return []

  return repository.queryWord(normalizedWord)
}

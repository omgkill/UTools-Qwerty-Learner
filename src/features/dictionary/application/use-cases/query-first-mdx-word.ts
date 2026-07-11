import { normalizeRawQueryWord } from '../../domain'
import type { MdxQueryResult } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export async function queryFirstMdxWord(repository: MdxDictionaryRepository, word: string): Promise<MdxQueryResult | null> {
  const normalizedWord = normalizeRawQueryWord(word)
  if (!normalizedWord) return null

  return repository.queryFirstWord(normalizedWord)
}

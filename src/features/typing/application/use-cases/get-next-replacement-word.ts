import type { WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'

export type GetNextReplacementWordParams = {
  dictId: string
  wordList: Word[]
  currentLearningWords: WordWithIndex[]
  wordProgressRepository: WordProgressRepository
}

export async function getNextReplacementWord(params: GetNextReplacementWordParams): Promise<WordWithIndex | null> {
  const { dictId, wordList, currentLearningWords, wordProgressRepository } = params

  if (wordList.length === 0) return null

  const existing = new Set(currentLearningWords.map((word) => word.name))
  const candidates = await wordProgressRepository.getNewWords(dictId, wordList, 100)
  const next = candidates.find((word) => !existing.has(word.name))

  return next ?? null
}

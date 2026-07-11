import { isWordNew } from '../../domain'
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

  if (!dictId || wordList.length === 0) return null

  const existing = new Set(currentLearningWords.map((word) => word.name))
  const allProgress = await wordProgressRepository.getAllProgress(dictId)
  const progressMap = new Map(allProgress.map((progress) => [progress.word, progress]))
  const candidates = wordList
    .map((word, index) => ({ ...word, index }))
    .filter((word) => isWordNew(progressMap.get(word.name)))

  const next = candidates.find((word) => !existing.has(word.name))

  return next ?? null
}

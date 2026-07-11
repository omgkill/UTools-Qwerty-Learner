import type { WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'

export type GetConsolidateWordsParams = {
  dictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
}

export async function getConsolidateWords(params: GetConsolidateWordsParams): Promise<WordWithIndex[]> {
  const { dictId, wordList, wordProgressRepository } = params
  if (!dictId || wordList.length === 0) {
    return []
  }

  const allProgress = await wordProgressRepository.getAllProgress(dictId)
  const learnedButNotMasteredNames = new Set(
    allProgress.filter((progress) => progress.masteryLevel > 0 && progress.masteryLevel < 7).map((progress) => progress.word),
  )

  return wordList.map((word, index) => ({ ...word, index })).filter((word) => learnedButNotMasteredNames.has(word.name))
}

import type { DailyRecordRepository, WordProgressRepository } from '../ports'
import type { WordWithIndex } from '@/typings'

export type MarkWordMasteredParams = {
  dictId: string
  currentWord: WordWithIndex | undefined
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
  getNextNewWord: () => Promise<WordWithIndex | null>
}

export type MarkWordMasteredResult = {
  replacementWord: WordWithIndex | null
  shouldSkip: boolean
}

export async function markWordMastered(params: MarkWordMasteredParams): Promise<MarkWordMasteredResult> {
  const { dictId, currentWord, wordProgressRepository, dailyRecordRepository, getNextNewWord } = params

  if (!currentWord || !dictId) {
    return { replacementWord: null, shouldSkip: false }
  }

  await wordProgressRepository.markAsMastered(dictId, currentWord.name)
  const replacementWord = await getNextNewWord()
  await dailyRecordRepository.incrementMastered(dictId)

  return {
    replacementWord,
    shouldSkip: true,
  }
}

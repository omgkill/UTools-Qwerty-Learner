import type { DailyRecordRepository, WordProgressRepository, WordRecordRepository } from '../ports'
import type { WordWithIndex } from '@/typings'

export type MarkWordMasteredParams = {
  dictId: string
  currentWord: WordWithIndex | undefined
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
  wordRecordRepository: WordRecordRepository
  getNextNewWord: () => Promise<WordWithIndex | null>
}

export type MarkWordMasteredResult = {
  replacementWord: WordWithIndex | null
  shouldSkip: boolean
}

export async function markWordMastered(params: MarkWordMasteredParams): Promise<MarkWordMasteredResult> {
  const { dictId, currentWord, wordProgressRepository, dailyRecordRepository, wordRecordRepository, getNextNewWord } = params

  if (!currentWord || !dictId) {
    return { replacementWord: null, shouldSkip: false }
  }

  await wordProgressRepository.markAsMastered(dictId, currentWord.name)
  try {
    await wordRecordRepository.addWordRecord({
      word: currentWord.name,
      dictId,
      timing: [],
      wrongCount: 0,
      mistakes: {},
    })
  } catch (e) {
    console.error('Failed to save mastered word record:', e)
  }
  const replacementWord = await getNextNewWord()
  await dailyRecordRepository.incrementMastered(dictId)

  return {
    replacementWord,
    shouldSkip: true,
  }
}

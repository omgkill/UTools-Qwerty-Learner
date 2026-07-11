import type { LetterMistakes, TypingWordProgress } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository, WordRecordRepository } from '../ports'
import { saveWordRecord } from './save-word-record'

export type CompleteWordParams = {
  dictId: string
  word: string
  isCorrect: boolean
  wrongCount: number
  letterTimeArray: number[]
  letterMistake: LetterMistakes
  isExtraReview: boolean
  wordRecordRepository: WordRecordRepository
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
}

export type CompleteWordResult = {
  wordRecordId: number
  progress: TypingWordProgress | undefined
}

export async function completeWord(params: CompleteWordParams): Promise<CompleteWordResult> {
  const {
    dictId,
    word,
    isCorrect,
    wrongCount,
    letterTimeArray,
    letterMistake,
    isExtraReview,
    wordRecordRepository,
    wordProgressRepository,
    dailyRecordRepository,
  } = params

  if (!dictId) {
    return {
      wordRecordId: -1,
      progress: undefined,
    }
  }

  const [wordRecordId, progress] = await Promise.all([
    saveWordRecord({
      dictId,
      word,
      wrongCount,
      letterTimeArray,
      letterMistake,
      wordRecordRepository,
    }),
    wordProgressRepository.updateProgress(dictId, word, isCorrect, wrongCount),
  ])

  const isNewWord = progress.reps === 1
  if (isCorrect) {
    if (isNewWord) {
      await dailyRecordRepository.incrementLearned(dictId)
    } else {
      await dailyRecordRepository.incrementReviewed(dictId, isExtraReview)
    }
  }

  return {
    wordRecordId,
    progress,
  }
}

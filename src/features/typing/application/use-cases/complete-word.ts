import type { TypingWordProgress } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository } from '../ports'

export type CompleteWordParams = {
  dictId: string
  word: string
  isCorrect: boolean
  wrongCount: number
  isExtraReview: boolean
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
}

export type CompleteWordResult = {
  progress: TypingWordProgress | undefined
}

export async function completeWord(params: CompleteWordParams): Promise<CompleteWordResult> {
  const { dictId, word, isCorrect, wrongCount, isExtraReview, wordProgressRepository, dailyRecordRepository } = params

  if (!dictId) {
    return {
      progress: undefined,
    }
  }

  const progress = await wordProgressRepository.updateProgress(dictId, word, isCorrect, wrongCount)

  const isNewWord = progress.reps === 1
  if (isCorrect) {
    if (isNewWord) {
      await dailyRecordRepository.incrementLearned(dictId)
    } else {
      await dailyRecordRepository.incrementReviewed(dictId, isExtraReview)
    }
  }

  return {
    progress,
  }
}

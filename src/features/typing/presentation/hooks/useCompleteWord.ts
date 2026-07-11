import { completeWord } from '@/features/typing/application/use-cases'
import type { LetterMistakes } from '@/features/typing/domain'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { dexieWordRecordRepository } from '@/infra/repositories/word-record.repository.dexie'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'

export function useCompleteWord() {
  const dictId = useAtomValue(currentDictIdAtom)

  return useCallback(
    async (params: {
      word: string
      isCorrect: boolean
      wrongCount: number
      letterTimeArray: number[]
      letterMistake: LetterMistakes
      isExtraReview: boolean
    }) => {
      return completeWord({
        dictId,
        word: params.word,
        isCorrect: params.isCorrect,
        wrongCount: params.wrongCount,
        letterTimeArray: params.letterTimeArray,
        letterMistake: params.letterMistake,
        isExtraReview: params.isExtraReview,
        wordRecordRepository: dexieWordRecordRepository,
        wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
      })
    },
    [dictId],
  )
}

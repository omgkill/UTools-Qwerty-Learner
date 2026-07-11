import { completeWord } from '@/features/typing/application/use-cases'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { dailyRecordAtom } from '@/pages/Typing/store/atoms'
import { currentDictIdAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function useCompleteWord() {
  const dictId = useAtomValue(currentDictIdAtom)
  const setDailyRecord = useSetAtom(dailyRecordAtom)

  return useCallback(
    async (params: { word: string; isCorrect: boolean; wrongCount: number; isExtraReview: boolean }) => {
      const result = await completeWord({
        dictId,
        word: params.word,
        isCorrect: params.isCorrect,
        wrongCount: params.wrongCount,
        isExtraReview: params.isExtraReview,
        wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
      })

      // 更新 dailyRecordAtom 以同步计数
      if (params.isCorrect) {
        const updatedRecord = await dexieDailyRecordRepository.getTodayRecord(dictId)
        setDailyRecord(updatedRecord)
      }

      return result
    },
    [dictId, setDailyRecord],
  )
}

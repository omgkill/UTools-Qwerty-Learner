import { markWordMastered } from '@/features/typing/application/use-cases'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { dexieWordRecordRepository } from '@/infra/repositories/word-record.repository.dexie'
import { currentDictIdAtom } from '@/store'
import type { WordWithIndex } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'

export function useMarkWordMastered() {
  const dictId = useAtomValue(currentDictIdAtom)

  return useCallback(
    async (params: { currentWord: WordWithIndex | undefined; getNextNewWord: () => Promise<WordWithIndex | null> }) => {
      return markWordMastered({
        dictId,
        currentWord: params.currentWord,
        getNextNewWord: params.getNextNewWord,
        wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
        wordRecordRepository: dexieWordRecordRepository,
      })
    },
    [dictId],
  )
}

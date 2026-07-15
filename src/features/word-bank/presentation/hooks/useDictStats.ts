import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { getDictProgressStats } from '@/features/word-bank/application/use-cases'
import type { DictProgressStats } from '@/features/word-bank/application/use-cases/get-dict-progress-stats'
import { useEffect, useState } from 'react'

/**
 * 获取词库学习进度统计
 */
export function useDictStats(dictID: string, isStartLoad: boolean, wordCount?: number) {
  const [dictStats, setDictStats] = useState<DictProgressStats | null>(null)

  useEffect(() => {
    const fetchDictStats = async () => {
      const stats = await getDictProgressStats(dexieWordProgressRepository, dictID, {
        dailyRecordRepository: dexieDailyRecordRepository,
        wordCount,
      })
      setDictStats(stats)
    }

    if (isStartLoad && !dictStats) {
      fetchDictStats()
    }
  }, [dictID, isStartLoad, dictStats, wordCount])

  return dictStats
}

import { dexieAnalysisRepository } from '@/infra/repositories/analysis.repository.dexie'
import { getWordStats } from '@/features/analysis/application/use-cases'
import type { WordStats } from '@/features/analysis/domain'
import { useEffect, useState } from 'react'

/**
 * 获取指定时间范围内的单词统计
 */
export function useWordStats(startTimeStamp: number, endTimeStamp: number): WordStats {
  const [wordStats, setWordStats] = useState<WordStats>({
    exerciseRecord: [],
    wordRecord: [],
    wpmRecord: [],
    accuracyRecord: [],
  })

  useEffect(() => {
    const fetchWordStats = async () => {
      const stats = await getWordStats(dexieAnalysisRepository, startTimeStamp, endTimeStamp)
      setWordStats(stats)
    }

    fetchWordStats()
  }, [startTimeStamp, endTimeStamp])

  return wordStats
}
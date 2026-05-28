import { getProgressStats } from '@/utils/storage'
import { useEffect, useState } from 'react'

export function useDictStats(dictID: string, isStartLoad: boolean) {
  const [dictStats, setDictStats] = useState<IDictStats | null>(null)

  useEffect(() => {
    const fetchDictStats = () => {
      const stats = getDictStats(dictID)
      setDictStats(stats)
    }

    if (isStartLoad && !dictStats) {
      fetchDictStats()
    }
  }, [dictID, isStartLoad, dictStats])

  return dictStats
}

interface IDictStats {
  learnedWords: number
  masteredWords: number
  dueWords: number
  totalProgress: number
}

function getDictStats(dict: string): IDictStats {
  const stats = getProgressStats(dict)
  const totalProgress = stats.learned > 0 ? Math.round((stats.mastered / stats.learned) * 100) : 0

  return {
    learnedWords: stats.learned,
    masteredWords: stats.mastered,
    dueWords: stats.due,
    totalProgress,
  }
}

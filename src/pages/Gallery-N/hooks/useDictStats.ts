import { db } from '@/utils/db'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import type { IChapterRecord } from '@/utils/db/record'
import { useEffect, useState } from 'react'

export function useDictStats(dictID: string, isStartLoad: boolean) {
  const [dictStats, setDictStats] = useState<IDictStats | null>(null)

  useEffect(() => {
    const fetchDictStats = async () => {
      const stats = await getDictStats(dictID)
      setDictStats(stats)
    }

    if (isStartLoad && !dictStats) {
      fetchDictStats()
    }
  }, [dictID, isStartLoad, dictStats])

  return dictStats
}

interface IDictStats {
  exercisedChapterCount: number
  learnedWords: number
  masteredWords: number
  dueWords: number
  totalProgress: number
}

async function getDictStats(dict: string): Promise<IDictStats> {
  const records: IChapterRecord[] = await db.chapterRecords.where({ dict }).toArray()
  const allChapter = records.map(({ chapter }) => chapter).filter((item) => item !== null) as number[]
  const uniqueChapter = allChapter.filter((value, index, self) => {
    return self.indexOf(value) === index
  })

  const exercisedChapterCount = uniqueChapter.length

  const allProgress = await db.wordProgress.where('dict').equals(dict).toArray()
  const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
  const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
  const dueWords = allProgress.filter((p) => p.nextReviewTime <= Date.now() && p.masteryLevel < MASTERY_LEVELS.MASTERED).length

  const totalProgress = allProgress.length > 0 ? Math.round((masteredWords / allProgress.length) * 100) : 0

  return {
    exercisedChapterCount,
    learnedWords,
    masteredWords,
    dueWords,
    totalProgress,
  }
}

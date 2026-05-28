import { useEffect, useState } from 'react'

export function useChapterStats(chapter: number, dictID: string, isStartLoad: boolean) {
  const [chapterStats, setChapterStats] = useState<IChapterStats | null>(null)

  useEffect(() => {
    const fetchChapterStats = async () => {
      const stats = await getChapterStats(dictID, chapter)
      setChapterStats(stats)
    }

    if (isStartLoad && !chapterStats) {
      fetchChapterStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictID, chapter, isStartLoad])

  return chapterStats
}

interface IChapterStats {
  exerciseCount: number
  avgWrongWordCount: number
  avgWrongInputCount: number
}

async function getChapterStats(_dict: string, _chapter: number | null): Promise<IChapterStats> {
  void _dict
  void _chapter
  return { exerciseCount: 0, avgWrongWordCount: 0, avgWrongInputCount: 0 }
}

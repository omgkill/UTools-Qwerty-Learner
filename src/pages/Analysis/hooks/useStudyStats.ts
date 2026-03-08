import { wordBanksAtom } from '@/store'
import { getAllProgress, getDailyRecords } from '@/utils/storage'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export interface DictStats {
  dictId: string
  dictName: string
  totalDays: number
  totalWords: number
  lastStudyDate: string | null
}

export interface DayStats {
  date: string
  learnedCount: number
  reviewedCount: number
  masteredCount: number
  totalWords: number
}

export interface WordDetail {
  word: string
  type: 'new' | 'review' | 'mastered'
}

export interface StudyStatsData {
  dictStats: DictStats[]
  isLoading: boolean
  error: Error | null
}

export function useStudyStats(): StudyStatsData {
  const [data, setData] = useState<StudyStatsData>({
    dictStats: [],
    isLoading: true,
    error: null,
  })
  const wordBanks = useAtomValue(wordBanksAtom)

  useEffect(() => {
    try {
      const dictNameMap = new Map(wordBanks.map((wb) => [wb.id, wb.name]))
      const statsMap = new Map<string, { dates: Set<string>; words: Set<string>; lastStudyDate: string | null }>()

      for (const wb of wordBanks) {
        const dailyRecords = getDailyRecords(wb.id)
        const progress = getAllProgress(wb.id)
        
        const dates = new Set<string>()
        const words = new Set<string>()
        let lastStudyDate: string | null = null

        for (const record of dailyRecords) {
          if (record.learnedCount > 0 || record.reviewedCount > 0 || record.masteredCount > 0) {
            dates.add(record.date)
            if (!lastStudyDate || record.date > lastStudyDate) {
              lastStudyDate = record.date
            }
          }
        }

        for (const p of progress) {
          if (p.masteryLevel > 0) {
            words.add(p.word)
          }
        }

        statsMap.set(wb.id, { dates, words, lastStudyDate })
      }

      const dictStats: DictStats[] = Array.from(statsMap.entries()).map(([dictId, stats]) => ({
        dictId,
        dictName: dictNameMap.get(dictId) || dictId,
        totalDays: stats.dates.size,
        totalWords: stats.words.size,
        lastStudyDate: stats.lastStudyDate,
      }))

      dictStats.sort((a, b) => {
        if (!a.lastStudyDate) return 1
        if (!b.lastStudyDate) return -1
        return b.lastStudyDate.localeCompare(a.lastStudyDate)
      })

      setData({
        dictStats,
        isLoading: false,
        error: null,
      })
    } catch (e) {
      setData({
        dictStats: [],
        isLoading: false,
        error: e instanceof Error ? e : new Error('Failed to fetch stats'),
      })
    }
  }, [wordBanks])

  return data
}

export interface DayStatsData {
  days: DayStats[]
  isLoading: boolean
  error: Error | null
}

export function useDayStats(dictId: string | null): DayStatsData {
  const [data, setData] = useState<DayStatsData>({
    days: [],
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!dictId) {
      setData({ days: [], isLoading: false, error: null })
      return
    }

    setData((prev) => ({ ...prev, isLoading: true }))

    try {
      const dailyRecords = getDailyRecords(dictId)

      const days: DayStats[] = dailyRecords
        .filter((r) => (r.learnedCount || 0) > 0 || (r.reviewedCount || 0) > 0 || (r.masteredCount || 0) > 0)
        .map((r) => ({
          date: r.date,
          learnedCount: r.learnedCount || 0,
          reviewedCount: r.reviewedCount || 0,
          masteredCount: r.masteredCount || 0,
          totalWords: (r.learnedCount || 0) + (r.reviewedCount || 0) + (r.masteredCount || 0),
        }))

      setData({
        days,
        isLoading: false,
        error: null,
      })
    } catch (e) {
      setData({
        days: [],
        isLoading: false,
        error: e instanceof Error ? e : new Error('Failed to fetch day stats'),
      })
    }
  }, [dictId])

  return data
}

export interface WordDetailData {
  words: WordDetail[]
  isLoading: boolean
  error: Error | null
}

export function useWordDetails(dictId: string | null, date: string | null): WordDetailData {
  const [data, setData] = useState<WordDetailData>({
    words: [],
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!dictId || !date) {
      setData({ words: [], isLoading: false, error: null })
      return
    }

    setData((prev) => ({ ...prev, isLoading: true }))

    try {
      const dailyRecords = getDailyRecords(dictId)
      const record = dailyRecords.find((r) => r.date === date)
      
      if (!record || !record.todayWords) {
        setData({
          words: [],
          isLoading: false,
          error: null,
        })
        return
      }

      const allProgress = getAllProgress(dictId)
      const progressMap = new Map(allProgress.map((p) => [p.word, p]))

      const words: WordDetail[] = record.todayWords.map((word) => {
        const progress = progressMap.get(word)
        const type: 'new' | 'review' | 'mastered' = 
          progress?.masteryLevel === 7 ? 'mastered' :
          progress?.masteryLevel === 1 ? 'new' : 'review'
        return { word, type }
      })

      setData({
        words: words.sort((a, b) => a.word.localeCompare(b.word)),
        isLoading: false,
        error: null,
      })
    } catch (e) {
      setData({
        words: [],
        isLoading: false,
        error: e instanceof Error ? e : new Error('Failed to fetch word details'),
      })
    }
  }, [dictId, date])

  return data
}

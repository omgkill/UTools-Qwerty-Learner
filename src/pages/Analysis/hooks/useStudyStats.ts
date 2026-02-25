import { wordBanksAtom } from '@/store'
import { db } from '@/utils/db'
import dayjs from 'dayjs'
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
  totalWords: number
}

export interface WordDetail {
  word: string
  timeStamp: number
  wrongCount: number
  type: 'new' | 'review'
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
    async function fetchStats() {
      try {
        const wordRecords = await db.wordRecords.toArray()
        const dictNameMap = new Map(wordBanks.map((wb) => [wb.id, wb.name]))

        const dictMap = new Map<
          string,
          {
            dates: Set<string>
            words: Set<string>
            lastStudyTime: number
          }
        >()

        for (const record of wordRecords) {
          const dictId = record.dict
          if (!dictMap.has(dictId)) {
            dictMap.set(dictId, {
              dates: new Set(),
              words: new Set(),
              lastStudyTime: 0,
            })
          }
          const dictData = dictMap.get(dictId)
          if (dictData) {
            const date = dayjs(record.timeStamp * 1000).format('YYYY-MM-DD')
            dictData.dates.add(date)
            dictData.words.add(record.word)
            if (record.timeStamp > dictData.lastStudyTime) {
              dictData.lastStudyTime = record.timeStamp
            }
          }
        }

        const dictStats: DictStats[] = Array.from(dictMap.entries()).map(([dictId, data]) => ({
          dictId,
          dictName: dictNameMap.get(dictId) || dictId,
          totalDays: data.dates.size,
          totalWords: data.words.size,
          lastStudyDate: data.lastStudyTime > 0 ? dayjs(data.lastStudyTime * 1000).format('YYYY-MM-DD') : null,
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
    }

    fetchStats()
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

    const currentDictId = dictId

    setData((prev) => ({ ...prev, isLoading: true }))

    async function fetchDays() {
      try {
        const dailyRecords = await db.dailyRecords.where('dict').equals(currentDictId).toArray()

        const days: DayStats[] = dailyRecords
          .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0)
          .map((r) => ({
            date: r.date,
            learnedCount: r.learnedCount,
            reviewedCount: r.reviewedCount,
            totalWords: r.learnedCount + r.reviewedCount,
          }))
          .sort((a, b) => b.date.localeCompare(a.date))

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
    }

    fetchDays()
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

    const currentDictId = dictId

    setData((prev) => ({ ...prev, isLoading: true }))

    async function fetchWords() {
      try {
        const startOfDay = dayjs(date).startOf('day').unix()
        const endOfDay = dayjs(date).endOf('day').unix()

        const allWordRecords = await db.wordRecords.where('dict').equals(currentDictId).toArray()

        const wordFirstTimeMap = new Map<string, number>()
        const sortedAllRecords = [...allWordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
        for (const r of sortedAllRecords) {
          if (!wordFirstTimeMap.has(r.word)) {
            wordFirstTimeMap.set(r.word, r.timeStamp)
          }
        }

        const wordRecords = allWordRecords.filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)

        const wordDetails: WordDetail[] = wordRecords
          .map((record) => {
            const firstTimeEver = wordFirstTimeMap.get(record.word)
            const type: 'new' | 'review' = firstTimeEver === record.timeStamp ? 'new' : 'review'
            return {
              word: record.word,
              timeStamp: record.timeStamp,
              wrongCount: record.wrongCount,
              type,
            }
          })
          .sort((a, b) => a.word.localeCompare(b.word))

        const uniqueWords = new Map<string, WordDetail>()
        for (const w of wordDetails) {
          if (!uniqueWords.has(w.word)) {
            uniqueWords.set(w.word, w)
          }
        }

        setData({
          words: Array.from(uniqueWords.values()),
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
    }

    fetchWords()
  }, [dictId, date])

  return data
}

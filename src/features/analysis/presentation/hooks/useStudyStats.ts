import { getDayStats, getDictStats, getWordDetails } from '@/features/analysis/application/use-cases'
import type { DayStats, DictStats, WordDetail } from '@/features/analysis/domain'
import { dexieAnalysisRepository } from '@/infra/repositories/analysis.repository.dexie'
import { currentDictIdAtom, wordBanksAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export type { DayStats, DictStats, WordDetail }

export interface StudyStatsData {
  dictStats: DictStats[]
  isLoading: boolean
  error: Error | null
}

export interface DayStatsData {
  days: DayStats[]
  isLoading: boolean
  error: Error | null
}

export interface WordDetailData {
  words: WordDetail[]
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
  const dictId = useAtomValue(currentDictIdAtom)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      if (!dictId) {
        setData({ dictStats: [], isLoading: false, error: null })
        return
      }
      try {
        const dictStats = await getDictStats(dexieAnalysisRepository, dictId, wordBanks)
        if (cancelled) return
        setData({ dictStats, isLoading: false, error: null })
      } catch (e) {
        if (cancelled) return
        setData({
          dictStats: [],
          isLoading: false,
          error: e instanceof Error ? e : new Error('Failed to fetch stats'),
        })
      }
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }))
    fetchStats()

    return () => {
      cancelled = true
    }
  }, [wordBanks, dictId])

  return data
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

    let cancelled = false

    async function fetchDays() {
      try {
        const days = await getDayStats(dexieAnalysisRepository, dictId!)
        if (cancelled) return
        setData({ days, isLoading: false, error: null })
      } catch (e) {
        if (cancelled) return
        setData({
          days: [],
          isLoading: false,
          error: e instanceof Error ? e : new Error('Failed to fetch day stats'),
        })
      }
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }))
    fetchDays()

    return () => {
      cancelled = true
    }
  }, [dictId])

  return data
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

    let cancelled = false

    async function fetchWords() {
      try {
        const words = await getWordDetails(dexieAnalysisRepository, dictId!, date!)
        if (cancelled) return
        setData({ words, isLoading: false, error: null })
      } catch (e) {
        if (cancelled) return
        setData({
          words: [],
          isLoading: false,
          error: e instanceof Error ? e : new Error('Failed to fetch word details'),
        })
      }
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }))
    fetchWords()

    return () => {
      cancelled = true
    }
  }, [dictId, date])

  return data
}

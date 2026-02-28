import { currentDictIdAtom, currentWordBankAtom } from '@/store'
import { dailyRecordAtom } from '../store/atoms'
import type { Word, WordWithIndex } from '@/typings/index'
import { LEARNING_CONFIG } from '@/utils/db/progress'
import { useDailyRecord, useReviewWords, useWordProgress } from '@/utils/db/useProgress'
import { db } from '@/utils/db'
import { getNextReplacementWord, getRepeatLearningWords, loadTypingSession } from '@/services'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { LearningType } from './learningLogic'

export type { LearningType }

export type UseWordListResult = {
  words: WordWithIndex[] | undefined
  learningWords: WordWithIndex[]
  isLoading: boolean
  error: Error | undefined
  learningType: LearningType
  dueCount: number
  newCount: number
  masteredCount: number
  todayLearned: number
  todayReviewed: number
  todayMastered: number
  newWordQuota: number
  remainingForTarget: number
  hasReachedTarget: boolean
  hasMoreDueWords: boolean
  remainingDueCount: number
  isExtraReview: boolean
  startExtraReview: () => void
  startRepeatLearning: () => Promise<WordWithIndex[]>
  getNextNewWord: () => Promise<WordWithIndex | null>
  setLearningWords: (words: WordWithIndex[]) => void
  setLearningType: (type: LearningType) => void
  reloadWords: () => void
}

export function useWordList(isRepeatLearning: boolean = false): UseWordListResult {
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)
  const dailyRecord = useAtomValue(dailyRecordAtom)
  const dailyRecordRef = useRef(dailyRecord)
  dailyRecordRef.current = dailyRecord

  const { refreshDailyRecord } = useDailyRecord()

  const [learningType, setLearningType] = useState<LearningType>('review')
  const [dueCount, setDueCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [learningWords, setLearningWords] = useState<WordWithIndex[]>([])
  const [loadVersion, setLoadVersion] = useState(0)
  const [hasMoreDueWords, setHasMoreDueWords] = useState(false)
  const [remainingDueCount, setRemainingDueCount] = useState(0)
  const [isExtraReview, setIsExtraReview] = useState(false)
  const [isLoadingLearningWords, setIsLoadingLearningWords] = useState(false)
  const lastLearningWordsRef = useRef<WordWithIndex[]>([])
  const loadVersionRef = useRef(0)

  const isLocalWordBank = useMemo(() => {
    return currentWordBank
      ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
      : false
  }, [currentWordBank])

  const swrKey = useMemo(() => {
    return currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null
  }, [currentWordBank, isLocalWordBank])

  const fetcher = isLocalWordBank ? localWordListFetcher : wordListFetcher

  const {
    data: wordList,
    error,
    isLoading: isWordListLoading,
    mutate,
  } = useSWR(swrKey, fetcher)

  const { getDueWordsWithInfo, getNewWords } = useReviewWords()
  const { getWordProgress } = useWordProgress()

  useEffect(() => {
    refreshDailyRecord()
  }, [refreshDailyRecord])

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0
  const todayMastered = dailyRecord?.masteredCount ?? 0

  const newWordQuota = useMemo(() => {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - todayReviewed - todayLearned)
  }, [todayReviewed, todayLearned])

  const remainingForTarget = newWordQuota

  const hasReachedTarget = useMemo(() => {
    return todayReviewed + todayLearned >= LEARNING_CONFIG.DAILY_LIMIT
  }, [todayReviewed, todayLearned])

  const retryWordListRef = useRef<string | null>(null)

  const loadLearningWords = useCallback(async () => {
    if (isRepeatLearning) {
      return
    }

    if (!wordList || wordList.length === 0 || !currentWordBank) {
      setLearningWords([])
      return
    }

    if (isLoadingLearningWords) {
      return
    }
    setIsLoadingLearningWords(true)

    const currentVersion = loadVersionRef.current

    try {
      const record = dailyRecordRef.current
      const reviewedCount = record?.reviewedCount ?? 0
      const learnedCount = record?.learnedCount ?? 0
      const result = await loadTypingSession({
        wordList,
        reviewedCount,
        learnedCount,
        isExtraReview,
        getDueWordsWithInfo,
        getNewWords,
        getWordProgress,
      })

      if (currentVersion !== loadVersionRef.current) return

      setDueCount(result.dueCount)
      setNewCount(result.newCount)
      setMasteredCount(result.masteredCount)
      setLearningType(result.learningType)

      const prevWordNames = lastLearningWordsRef.current.map((w) => w.name).join(',')
      const newWordNames = result.learningWords.map((w) => w.name).join(',')
      if (prevWordNames !== newWordNames) {
        lastLearningWordsRef.current = result.learningWords
        setLearningWords(result.learningWords)
      }

      setHasMoreDueWords(result.hasMoreDueWords)
      setRemainingDueCount(result.remainingDueCount)
    } catch (e) {
      console.error('Failed to load learning words:', e)
      setLearningWords([])
    } finally {
      setIsLoadingLearningWords(false)
    }
  }, [
    wordList,
    currentWordBank,
    getDueWordsWithInfo,
    getNewWords,
    getWordProgress,
    isExtraReview,
    isLoadingLearningWords,
    isRepeatLearning,
  ])

  const reloadWords = useCallback(() => {
    if (isRepeatLearning) {
      return
    }
    loadVersionRef.current += 1
    setLoadVersion((v) => v + 1)
  }, [isRepeatLearning])

  const startExtraReview = useCallback(() => {
    setIsExtraReview(true)
    reloadWords()
  }, [reloadWords])

  const startRepeatLearning = useCallback(async (): Promise<WordWithIndex[]> => {
    if (!wordList || wordList.length === 0 || !currentDictId) {
      return []
    }

    const repeatWords = await getRepeatLearningWords({
      currentDictId,
      wordList,
      listWordRecordsInRange: async (dictId, start, end) => {
        return db.wordRecords
          .where('[dict+timeStamp]')
          .between([dictId, start], [dictId, end])
          .toArray()
      },
    })

    if (repeatWords.length === 0) {
      return []
    }

    return repeatWords
  }, [wordList, currentDictId])

  const getNextNewWord = useCallback(async (): Promise<WordWithIndex | null> => {
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      return null
    }

    return getNextReplacementWord({
      wordList,
      currentLearningWords: learningWords,
      getNewWords,
    })
  }, [wordList, currentWordBank, getNewWords, learningWords])

  useEffect(() => {
    loadLearningWords()
  }, [loadLearningWords, loadVersion])

  useEffect(() => {
    if (dailyRecord) {
      reloadWords()
    }
  }, [dailyRecord, reloadWords])

  useEffect(() => {
    if (isExtraReview) {
      reloadWords()
    }
  }, [isExtraReview, reloadWords])

  useEffect(() => {
    if (!currentWordBank) return
    if (isWordListLoading) return
    if (!wordList) return
    if (wordList.length > 0) {
      retryWordListRef.current = null
      return
    }
    if (currentWordBank.length === 0) return
    const retryKey = currentWordBank.id
    if (retryWordListRef.current === retryKey) return
    retryWordListRef.current = retryKey
    void mutate()
  }, [currentWordBank, isWordListLoading, wordList, mutate])

  useEffect(() => {
    if (isRepeatLearning) return
    if (
      learningWords.length === 0 &&
      learningType !== 'complete' &&
      !isWordListLoading &&
      wordList &&
      wordList.length > 0
    ) {
      reloadWords()
    }
  }, [learningWords.length, learningType, isWordListLoading, wordList, reloadWords, isRepeatLearning])

  const baseWords: WordWithIndex[] = useMemo(() => {
    return learningWords
  }, [learningWords])

  return {
    words: wordList === undefined ? undefined : baseWords,
    learningWords,
    isLoading: isWordListLoading,
    error,
    learningType,
    dueCount,
    newCount,
    masteredCount,
    todayLearned,
    todayReviewed,
    todayMastered,
    newWordQuota,
    remainingForTarget,
    hasReachedTarget,
    hasMoreDueWords,
    remainingDueCount,
    isExtraReview,
    startExtraReview,
    startRepeatLearning,
    getNextNewWord,
    setLearningWords,
    setLearningType,
    reloadWords,
  }
}

async function wordListFetcher(url: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    const response = await fetch('.' + url)
    words = await response.json()
  } catch (err) {
    console.error('Failed to load word list:', err)
  }

  return words
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    words = await window.readLocalWordBank(id)
  } catch (err) {
    console.error('Failed to load word list:', err)
  }
  return words
}

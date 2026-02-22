import { currentWordBankAtom } from '@/store'
import { dailyRecordAtom } from '../store/atoms'
import type { Word, WordWithIndex } from '@/typings/index'
import { LEARNING_CONFIG } from '@/utils/db/progress'
import { useDailyRecord, useReviewWords, useWordProgress } from '@/utils/db/useProgress'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { LearningType } from './learningLogic'
import { determineLearningType } from './learningLogic'

export type { LearningType }

export type UseWordListResult = {
  words: WordWithIndex[] | undefined
  isLoading: boolean
  error: Error | undefined
  learningType: LearningType
  dueCount: number
  newCount: number
  masteredCount: number
  todayLearned: number
  todayReviewed: number
  newWordQuota: number
  remainingForTarget: number
  hasReachedTarget: boolean
  hasMoreDueWords: boolean
  remainingDueCount: number
  isExtraReview: boolean
  startExtraReview: () => void
  getNextNewWord: () => Promise<WordWithIndex | null>
}

export function useWordList(): UseWordListResult {
  const currentWordBank = useAtomValue(currentWordBankAtom)
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
  const isLoadingRef = useRef(false)
  const lastLearningWordsRef = useRef<WordWithIndex[]>([])

  const isLocalWordBank = currentWordBank
    ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
    : false

  const {
    data: wordList,
    error,
    isLoading: isWordListLoading,
  } = useSWR(
    currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null,
    isLocalWordBank ? localWordListFetcher : wordListFetcher,
  )

  const { getDueWordsWithInfo, getNewWords } = useReviewWords()
  const { getWordProgress } = useWordProgress()

  useEffect(() => {
    refreshDailyRecord()
  }, [refreshDailyRecord])

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0

  const newWordQuota = useMemo(() => {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - todayReviewed - todayLearned)
  }, [todayReviewed, todayLearned])

  const remainingForTarget = useMemo(() => {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - todayReviewed - todayLearned)
  }, [todayReviewed, todayLearned])

  const hasReachedTarget = useMemo(() => {
    return todayReviewed + todayLearned >= LEARNING_CONFIG.DAILY_LIMIT
  }, [todayReviewed, todayLearned])

  const loadLearningWords = useCallback(async () => {
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      setLearningWords([])
      return
    }

    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      const [dueWords, newWords] = await Promise.all([
        getDueWordsWithInfo(wordList, 100),
        getNewWords(wordList, 100),
      ])

      const allProgress = await Promise.all(
        wordList.slice(0, 200).map(async (w) => getWordProgress(w.name))
      )
      const mastered = allProgress.filter((p) => p && p.masteryLevel >= 7).length

      setDueCount(dueWords.length)
      setNewCount(newWords.length)
      setMasteredCount(mastered)

      const record = dailyRecordRef.current
      const reviewedCount = record?.reviewedCount ?? 0
      const learnedCount = record?.learnedCount ?? 0

      const result = determineLearningType({
        dueWords,
        newWords,
        reviewedCount,
        learnedCount,
        allProgress,
        wordList,
        isExtraReview,
      })

      setLearningType(result.learningType)
      
      const prevWordNames = lastLearningWordsRef.current.map(w => w.name).join(',')
      const newWordNames = result.learningWords.map(w => w.name).join(',')
      if (prevWordNames !== newWordNames) {
        lastLearningWordsRef.current = result.learningWords
        setLearningWords(result.learningWords)
      }
      
      setHasMoreDueWords(result.hasMoreDueWords ?? false)
      setRemainingDueCount(result.remainingDueCount ?? 0)
    } catch (e) {
      console.error('Failed to load learning words:', e)
      setLearningWords([])
    } finally {
      isLoadingRef.current = false
    }
  }, [
    wordList,
    currentWordBank,
    getDueWordsWithInfo,
    getNewWords,
    getWordProgress,
    isExtraReview,
  ])

  const reloadWords = useCallback(() => {
    setLoadVersion((v) => v + 1)
  }, [])

  const startExtraReview = useCallback(() => {
    setIsExtraReview(true)
    reloadWords()
  }, [reloadWords])

  const getNextNewWord = useCallback(async (): Promise<WordWithIndex | null> => {
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      return null
    }

    const newWords = await getNewWords(wordList, 1)
    if (newWords.length === 0) {
      return null
    }

    return newWords[0]
  }, [wordList, currentWordBank, getNewWords])

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
    if (
      learningWords.length === 0 &&
      learningType !== 'complete' &&
      !isWordListLoading &&
      wordList &&
      wordList.length > 0
    ) {
      reloadWords()
    }
  }, [learningWords.length, learningType, isWordListLoading, wordList, reloadWords])

  const baseWords: WordWithIndex[] = useMemo(() => {
    return learningWords
  }, [learningWords])

  return {
    words: wordList === undefined ? undefined : baseWords,
    isLoading: isWordListLoading,
    error,
    learningType,
    dueCount,
    newCount,
    masteredCount,
    todayLearned,
    todayReviewed,
    newWordQuota,
    remainingForTarget,
    hasReachedTarget,
    hasMoreDueWords,
    remainingDueCount,
    isExtraReview,
    startExtraReview,
    getNextNewWord,
  }
}

async function wordListFetcher(url: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    const response = await fetch('.' + url)
    words = await response.json()
  } catch (err) {
    console.log(err)
  }

  return words
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    words = await window.readLocalWordBank(id)
  } catch (err) {
    console.error(err)
  }
  return words
}

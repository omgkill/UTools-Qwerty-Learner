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
  isRepeatLearning: boolean
  startExtraReview: () => void
  startRepeatLearning: () => Promise<void>
  getNextNewWord: () => Promise<WordWithIndex | null>
}

export function useWordList(): UseWordListResult {
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
  const [isRepeatLearning, setIsRepeatLearning] = useState(false)
  const [isLoadingLearningWords, setIsLoadingLearningWords] = useState(false)
  const lastLearningWordsRef = useRef<WordWithIndex[]>([])
  // 用于取消过期的异步加载请求
  const loadVersionRef = useRef(0)

  const isLocalWordBank = currentWordBank
    ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
    : false

  console.log('[useWordList] Current word bank:', {
    currentWordBank: currentWordBank ? currentWordBank.name : null,
    currentWordBankId: currentDictId,
    isLocalWordBank,
    swrKey: currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null
  })

  const swrKey = currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null
  const fetcher = isLocalWordBank ? localWordListFetcher : wordListFetcher

  console.log('[useWordList] SWR configuration:', JSON.stringify({
    swrKey,
    isLocalWordBank,
    fetcherName: isLocalWordBank ? 'localWordListFetcher' : 'wordListFetcher',
    currentWordBank: currentWordBank ? currentWordBank.name : null
  }, null, 2))

  const {
    data: wordList,
    error,
    isLoading: isWordListLoading,
    mutate,
  } = useSWR(swrKey, fetcher)

  console.log('[useWordList] SWR state:', JSON.stringify({
    wordListLength: wordList?.length,
    isWordListLoading,
    error: error?.message,
    wordListType: typeof wordList,
    wordListIsArray: Array.isArray(wordList)
  }, null, 2))

  const { getDueWordsWithInfo, getNewWords } = useReviewWords()
  const { getWordProgress } = useWordProgress()

  useEffect(() => {
    refreshDailyRecord()
  }, [refreshDailyRecord])

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0
  const todayMastered = dailyRecord?.masteredCount ?? 0

  // newWordQuota 和 remainingForTarget 逻辑相同，合并为一个计算
  const newWordQuota = useMemo(() => {
    return Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - todayReviewed - todayLearned)
  }, [todayReviewed, todayLearned])

  const remainingForTarget = newWordQuota

  const hasReachedTarget = useMemo(() => {
    return todayReviewed + todayLearned >= LEARNING_CONFIG.DAILY_LIMIT
  }, [todayReviewed, todayLearned])

  const retryWordListRef = useRef<string | null>(null)

  const loadLearningWords = useCallback(async () => {
    console.log('[useWordList] loadLearningWords called:', JSON.stringify({
      wordListLength: wordList?.length,
      wordListType: typeof wordList,
      wordListIsArray: Array.isArray(wordList),
      currentWordBank: currentWordBank?.name,
      isLoadingLearningWords
    }, null, 2))
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      console.log('[useWordList] Skipping loadLearningWords: no wordList or currentWordBank')
      setLearningWords([])
      return
    }

    if (isLoadingLearningWords) {
      console.log('[useWordList] Skipping loadLearningWords: already loading')
      return
    }
    setIsLoadingLearningWords(true)

    // 记录本次请求的版本号，用于检测是否已过期
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
      console.log('[useWordList] loadLearningWords completed:', {
        learningType: result.learningType,
        learningWordsCount: result.learningWords.length,
        dueCount: result.dueCount,
        newCount: result.newCount
      })
    } catch (e) {
      console.error('[useWordList] Failed to load learning words:', e)
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
  ])

  const reloadWords = useCallback(() => {
    // 递增版本号使过期请求失效，同时触发重新加载
    loadVersionRef.current += 1
    setLoadVersion((v) => v + 1)
  }, [])

  const startExtraReview = useCallback(() => {
    setIsExtraReview(true)
    setIsRepeatLearning(false)
    reloadWords()
  }, [reloadWords])

  // 获取今日学习过的单词并设置为重复学习
  const startRepeatLearning = useCallback(async (): Promise<void> => {
    if (!wordList || wordList.length === 0 || !currentDictId) {
      return
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
      return
    }

    setIsRepeatLearning(true)
    setIsExtraReview(false)
    setLearningType('review')
    setLearningWords(repeatWords)
    lastLearningWordsRef.current = repeatWords
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
    todayMastered,
    newWordQuota,
    remainingForTarget,
    hasReachedTarget,
    hasMoreDueWords,
    remainingDueCount,
    isExtraReview,
    isRepeatLearning,
    startExtraReview,
    startRepeatLearning,
    getNextNewWord,
  }
}

async function wordListFetcher(url: string): Promise<Word[]> {
  console.log('[wordListFetcher] Fetching word list from URL:', url)
  let words: Word[] = []
  try {
    const response = await fetch('.' + url)
    console.log('[wordListFetcher] Response status:', response.status)
    words = await response.json()
    console.log('[wordListFetcher] Word list loaded:', {
      url,
      wordCount: words.length,
      firstWord: words[0]?.name
    })
  } catch (err) {
    console.error('[wordListFetcher] Failed to load word list:', err)
  }

  return words
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  console.log('[localWordListFetcher] Fetching word list for id:', id)
  let words: Word[] = []
  try {
    words = await window.readLocalWordBank(id)
    console.log('[localWordListFetcher] Word list loaded:', JSON.stringify({
      id,
      wordCount: words.length,
      firstWord: words[0]?.name,
      isArray: Array.isArray(words),
      type: typeof words
    }, null, 2))
  } catch (err) {
    console.error('[localWordListFetcher] Failed to load word list:', err)
  }
  console.log('[localWordListFetcher] Returning words:', JSON.stringify({
    wordCount: words.length,
    isArray: Array.isArray(words),
    type: typeof words
  }, null, 2))
  return words
}

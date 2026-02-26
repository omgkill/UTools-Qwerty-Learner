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

  // 从localStorage加载重复学习状态和学习单词
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('typingState')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        // 检查是否是今天的状态
        if (parsedState.date === new Date().toISOString().split('T')[0]) {
          setIsRepeatLearning(parsedState.isRepeatLearning)
          if (parsedState.isRepeatLearning && parsedState.learningWords && parsedState.learningWords.length > 0) {
            setLearningWords(parsedState.learningWords)
            lastLearningWordsRef.current = parsedState.learningWords
          }
        }
      }
    } catch (e) {
      console.error('Failed to load saved state:', e)
    }
  }, [])

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

  // 监听重复学习状态和学习单词变化，保存到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('typingState', JSON.stringify({
        isRepeatLearning,
        learningWords: isRepeatLearning ? learningWords : [],
        date: new Date().toISOString().split('T')[0]
      }))
    } catch (e) {
      console.error('Failed to save state:', e)
    }
  }, [isRepeatLearning, learningWords])

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
    // 重复学习模式下不重新加载单词
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
    // 重复学习模式下不重新加载单词
    if (isRepeatLearning) {
      return
    }
    // 递增版本号使过期请求失效，同时触发重新加载
    loadVersionRef.current += 1
    setLoadVersion((v) => v + 1)
  }, [isRepeatLearning])

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

  // 当重复学习状态为true且学习单词为空时，自动加载重复学习单词
  useEffect(() => {
    if (isRepeatLearning && learningWords.length === 0 && wordList && wordList.length > 0 && currentDictId) {
      startRepeatLearning()
    }
  }, [isRepeatLearning, learningWords.length, wordList, currentDictId, startRepeatLearning])

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

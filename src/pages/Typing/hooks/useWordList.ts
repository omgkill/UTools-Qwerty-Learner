import { currentWordBankAtom, currentDictIdAtom } from '@/store'
import { dailyRecordAtom } from '../store/atoms'
import type { Word, WordWithIndex } from '@/typings/index'
import { LEARNING_CONFIG, getTodayDate } from '@/utils/db/progress'
import { useDailyRecord, useReviewWords, useWordProgress } from '@/utils/db/useProgress'
import { db } from '@/utils/db'
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
  const isLoadingRef = useRef(false)
  const lastLearningWordsRef = useRef<WordWithIndex[]>([])
  // 用于取消过期的异步加载请求
  const loadVersionRef = useRef(0)

  const isLocalWordBank = currentWordBank
    ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
    : false

  const {
    data: wordList,
    error,
    isLoading: isWordListLoading,
    mutate,
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
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      setLearningWords([])
      return
    }

    if (isLoadingRef.current) return
    isLoadingRef.current = true

    // 记录本次请求的版本号，用于检测是否已过期
    const currentVersion = loadVersionRef.current

    try {
      const [dueWords, newWords] = await Promise.all([
        getDueWordsWithInfo(wordList, 100),
        getNewWords(wordList, 100),
      ])

      // 异步操作完成后，检查版本号是否仍有效，防止竞态条件
      if (currentVersion !== loadVersionRef.current) return

      const allProgress = await Promise.all(
        wordList.slice(0, 200).map(async (w) => getWordProgress(w.name))
      )

      if (currentVersion !== loadVersionRef.current) return

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

    const today = getTodayDate()
    const todayStart = new Date(today).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    // 从数据库获取今日学习过的单词记录
    const todayRecords = await db.wordRecords
      .where('[dict+timeStamp]')
      .between([currentDictId, todayStart], [currentDictId, todayEnd])
      .toArray()

    // 获取今天学习过的唯一单词名称
    const todayWordNames = [...new Set(todayRecords.map(r => r.word))]

    if (todayWordNames.length === 0) {
      return
    }

    // 从词库中找到对应的单词
    const repeatWords: WordWithIndex[] = []
    todayWordNames.forEach(wordName => {
      const index = wordList.findIndex(w => w.name === wordName)
      if (index !== -1) {
        repeatWords.push({ ...wordList[index], index })
      }
    })

    if (repeatWords.length === 0) {
      return
    }

    // 随机打乱顺序
    const shuffled = [...repeatWords].sort(() => Math.random() - 0.5)

    setIsRepeatLearning(true)
    setIsExtraReview(false)
    setLearningType('review')
    setLearningWords(shuffled)
    lastLearningWordsRef.current = shuffled
  }, [wordList, currentDictId])

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

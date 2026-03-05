import { currentDictIdAtom, currentWordBankAtom } from '@/store'
import { dailyRecordAtom } from '../store/atoms'
import type { Word, WordWithIndex } from '@/typings/index'
import { db } from '@/utils/db'
import { getRepeatLearningWords as getRepeatLearningWordsFunc, loadTypingSession } from '@/services'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { LearningType } from './learningLogic'
import type { LearningMode } from './useTypingMode'
import { DailyRecord, getTodayDate } from '@/utils/db/progress'

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
  startRepeatLearning: () => Promise<WordWithIndex[]>
  getNextNewWord: () => Promise<WordWithIndex | null>
  setLearningWords: (words: WordWithIndex[]) => void
  setLearningType: (type: LearningType) => void
  reloadWords: () => void
}

export function useWordList(mode: LearningMode | null): UseWordListResult {
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)
  const dailyRecord = useAtomValue(dailyRecordAtom)

  const [learningType, setLearningType] = useState<LearningType>('review')
  const [dueCount, setDueCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [learningWords, setLearningWords] = useState<WordWithIndex[]>([])
  const [loadVersion, setLoadVersion] = useState(0)
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

  useEffect(() => {
    // 触发今日记录的创建（如果不存在）
    if (currentDictId) {
      db.dailyRecords.where('[dict+date]').equals([currentDictId, getTodayDate()]).first().then((record) => {
        if (!record) {
          const today = getTodayDate()
          const newRecord = new DailyRecord(currentDictId, today)
          db.dailyRecords.add(newRecord).catch(console.error)
        }
      }).catch(console.error)
    }
  }, [currentDictId])

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0
  const todayMastered = dailyRecord?.masteredCount ?? 0

  const retryWordListRef = useRef<string | null>(null)

  const loadLearningWords = useCallback(async () => {
    if (mode !== 'normal') {
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
      const reviewedCount = todayReviewed
      const learnedCount = todayLearned

      const result = await loadTypingSession({
        wordList,
        reviewedCount,
        learnedCount,
        getDueWordsWithInfo: async (wordList, limit) => {
          return db.wordProgress
            .where('dict')
            .equals(currentDictId || '')
            .toArray()
            .then((allProgress) => {
              const dueWords = allProgress.filter(
                (p) => p.nextReviewTime <= Date.now() && p.reps > 0 && p.masteryLevel < 7,
              )
              const dueWordSet = new Set(dueWords.slice(0, limit).map((p) => p.word))
              return wordList
                .map((word, index) => ({ ...word, index }))
                .filter((word) => dueWordSet.has(word.name))
            })
        },
        getNewWords: async (wordList, limit) => {
          return db.wordProgress
            .where('dict')
            .equals(currentDictId || '')
            .toArray()
            .then((existingProgress) => {
              const progressMap = new Map(existingProgress.map((p) => [p.word, p]))
              return wordList
                .map((word, index) => ({ ...word, index }))
                .filter((word) => {
                  const progress = progressMap.get(word.name)
                  return !progress || progress.masteryLevel === 0
                })
                .slice(0, limit)
            })
        },
        getWordProgress: async (word) => {
          return db.wordProgress
            .where('[dict+word]')
            .equals([currentDictId || '', word])
            .first()
        },
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
    } catch (e) {
      console.error('Failed to load learning words:', e)
      setLearningWords([])
    } finally {
      setIsLoadingLearningWords(false)
    }
  }, [
    wordList,
    currentWordBank,
    todayReviewed,
    todayLearned,
    isLoadingLearningWords,
    mode,
    currentDictId,
  ])

  const reloadWords = useCallback(() => {
    if (mode !== 'normal') {
      return
    }
    loadVersionRef.current += 1
    setLoadVersion((v) => v + 1)
  }, [mode])

  const startRepeatLearning = useCallback(async (): Promise<WordWithIndex[]> => {
    if (!wordList || wordList.length === 0 || !currentDictId) {
      return []
    }

    const repeatWords = await getRepeatLearningWordsFunc({
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

    const existing = new Set(learningWords.map((w) => w.name))
    const candidates = await db.wordProgress
      .where('dict')
      .equals(currentDictId || '')
      .toArray()
      .then((allProgress) => {
        const progressMap = new Map(allProgress.map((p) => [p.word, p]))
        return wordList
          .map((word, index) => ({ ...word, index }))
          .filter((word) => {
            const progress = progressMap.get(word.name)
            return !progress || progress.masteryLevel === 0
          })
      })

    const next = candidates.find((word) => !existing.has(word.name))
    return next ?? null
  }, [wordList, currentWordBank, learningWords, currentDictId])

  useEffect(() => {
    loadLearningWords()
  }, [loadLearningWords, loadVersion])

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
    if (mode !== 'normal') return
    if (
      learningWords.length === 0 &&
      learningType !== 'complete' &&
      !isWordListLoading &&
      wordList &&
      wordList.length > 0
    ) {
      reloadWords()
    }
  }, [learningWords.length, learningType, isWordListLoading, wordList, reloadWords, mode])

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

import { getNextReplacementWord, getRepeatLearningWords, getTypingSession } from '@/features/typing/application/use-cases'
import type { LearningType } from '@/features/typing/domain'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { dexieWordRecordRepository } from '@/infra/repositories/word-record.repository.dexie'
import { utoolsLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository.utools'
import type { LearningMode } from '@/pages/Typing/hooks/useTypingMode'
import { dailyRecordAtom } from '@/pages/Typing/store/atoms'
import { currentDictIdAtom, currentWordBankAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import { readLocalWordBank } from '@/features/word-bank/application'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

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
  const retryWordListRef = useRef<string | null>(null)

  const isLocalWordBank = useMemo(() => {
    return currentWordBank ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom' : false
  }, [currentWordBank])

  const swrKey = useMemo(() => {
    return currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null
  }, [currentWordBank, isLocalWordBank])

  const fetcher = isLocalWordBank ? localWordListFetcher : wordListFetcher
  const { data: wordList, error, isLoading: isWordListLoading, mutate } = useSWR(swrKey, fetcher)

  useEffect(() => {
    if (!currentDictId) return
    dexieDailyRecordRepository.ensureTodayRecord(currentDictId).catch(console.error)
  }, [currentDictId])

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0
  const todayMastered = dailyRecord?.masteredCount ?? 0

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
      const result = await getTypingSession({
        dictId: currentDictId || '',
        wordList,
        reviewedCount: todayReviewed,
        learnedCount: todayLearned,
        wordProgressRepository: dexieWordProgressRepository,
      })

      if (currentVersion !== loadVersionRef.current) return

      setDueCount(result.dueCount)
      setNewCount(result.newCount)
      setMasteredCount(result.masteredCount)
      setLearningType(result.learningType)

      const prevWordNames = lastLearningWordsRef.current.map((word) => word.name).join(',')
      const newWordNames = result.learningWords.map((word) => word.name).join(',')
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
  }, [wordList, currentWordBank, todayReviewed, todayLearned, isLoadingLearningWords, mode, currentDictId])

  const reloadWords = useCallback(() => {
    if (mode !== 'normal') {
      return
    }
    loadVersionRef.current += 1
    setLoadVersion((version) => version + 1)
  }, [mode])

  const startRepeatLearning = useCallback(async (): Promise<WordWithIndex[]> => {
    if (!wordList || wordList.length === 0 || !currentDictId) {
      return []
    }

    return getRepeatLearningWords({
      currentDictId,
      wordList,
      wordRecordRepository: dexieWordRecordRepository,
    })
  }, [wordList, currentDictId])

  const getNextNewWord = useCallback(async (): Promise<WordWithIndex | null> => {
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      return null
    }

    return getNextReplacementWord({
      dictId: currentDictId || '',
      wordList,
      currentLearningWords: learningWords,
      wordProgressRepository: dexieWordProgressRepository,
    })
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
    if (learningWords.length === 0 && learningType !== 'complete' && !isWordListLoading && wordList && wordList.length > 0) {
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
    words = readLocalWordBank(utoolsLocalWordBankRepository, id)
  } catch (err) {
    console.error('Failed to load word list:', err)
  }
  return words
}

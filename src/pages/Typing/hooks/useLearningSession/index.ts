import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import useSWR from 'swr'
import { currentDictIdAtom } from '@/store'
import { addMasteredWord, loadSessionProgress, saveSessionProgress, updateProgress } from '@/utils/storage'
import { getTodayDate } from '@/utils/timeService'
import type { LearningMode, UseLearningSessionResult, Word, WordSourceStrategy, WordWithIndex } from '@/types'
import {
  addReplacementWordAtom,
  currentIndexAtom,
  currentWordAtom,
  hasWordsAtom,
  isFinishedAtom,
  isLoadingAtom,
  learningTypeAtom,
  sessionStatsAtom,
  setCurrentIndexAtom,
  setHasWordsAtom,
  setIsLoadingAtom,
  setIsRepeatLearningAtom,
  setIsTypingAtom,
  setLearningTypeAtom,
  setSessionStatsAtom,
  setWordsAtom,
  skipWordAtom,
  wordsAtom,
} from '../../store'
import { consolidateStrategy, normalStrategy, repeatStrategy } from './strategies'

const PROGRESS_KEYS: Record<LearningMode, string> = {
  normal: 'normal-learning',
  repeat: 'repeat-learning',
  consolidate: 'consolidate-learning',
}

const STRATEGIES: Record<LearningMode, WordSourceStrategy> = {
  normal: normalStrategy,
  repeat: repeatStrategy,
  consolidate: consolidateStrategy,
}

async function wordListFetcher(url: string): Promise<Word[]> {
  try {
    const response = await fetch('.' + url)
    return await response.json()
  } catch (err) {
    console.error('Failed to load word list:', err)
    return []
  }
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  try {
    return await window.readLocalWordBank(id)
  } catch (err) {
    console.error('Failed to load word list:', err)
    return []
  }
}

export function useLearningSession({ mode, currentWordBank }: UseLearningSessionOptions): UseLearningSessionResult {
  const dictId = useAtomValue(currentDictIdAtom)
  const strategy = STRATEGIES[mode]
  const progressKey = PROGRESS_KEYS[mode]

  const setWords = useSetAtom(setWordsAtom)
  const setCurrentIndex = useSetAtom(setCurrentIndexAtom)
  const setIsRepeatLearning = useSetAtom(setIsRepeatLearningAtom)
  const setIsTyping = useSetAtom(setIsTypingAtom)
  const addReplacementWord = useSetAtom(addReplacementWordAtom)
  const skipWord = useSetAtom(skipWordAtom)
  const setIsLoading = useSetAtom(setIsLoadingAtom)
  const setHasWords = useSetAtom(setHasWordsAtom)
  const setLearningType = useSetAtom(setLearningTypeAtom)
  const setSessionStats = useSetAtom(setSessionStatsAtom)

  const currentIndex = useAtomValue(currentIndexAtom)
  const currentWord = useAtomValue(currentWordAtom)
  const isFinished = useAtomValue(isFinishedAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const hasWords = useAtomValue(hasWordsAtom)
  const learningType = useAtomValue(learningTypeAtom)
  const stats = useAtomValue(sessionStatsAtom)
  const words = useAtomValue(wordsAtom)

  const wordNamesRef = useRef<string[]>([])
  const isInitializedRef = useRef(false)

  const isLocalWordBank = useMemo(() => {
    return currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
  }, [currentWordBank])

  const swrKey = useMemo(() => {
    return isLocalWordBank ? currentWordBank.id : currentWordBank.url
  }, [currentWordBank, isLocalWordBank])

  const fetcher = isLocalWordBank ? localWordListFetcher : wordListFetcher

  const { data: wordList } = useSWR(swrKey, fetcher)

  const loadWords = useCallback(async () => {
    if (!wordList || wordList.length === 0 || !dictId) {
      if (wordList !== undefined) {
        setIsLoading(false)
        setHasWords(false)
      }
      return
    }

    setIsLoading(true)

    try {
      const wordNames = wordList.map((w) => w.name)
      const selectedNames = strategy.getWordNames(dictId, wordNames)

      if (selectedNames.length === 0) {
        setHasWords(false)
        setLearningType('complete')
        setIsLoading(false)
        return
      }

      const newStats = strategy.getStats(dictId, wordNames)
      setSessionStats(newStats)

      const wordMap = new Map(wordList.map((w, i) => [w.name, { ...w, index: i }]))
      const filteredWords = selectedNames
        .map((name) => wordMap.get(name))
        .filter((w): w is WordWithIndex => w !== undefined)

      if (filteredWords.length === 0) {
        setHasWords(false)
        setLearningType('complete')
        setIsLoading(false)
        return
      }

      let finalWords: WordWithIndex[]
      let finalIndex: number

      if (strategy.needsSessionPersist) {
        const saved = loadSessionProgress(progressKey, dictId)
        if (saved.wordNames?.length > 0) {
          finalWords = saved.wordNames
            .map((name) => filteredWords.find((w) => w.name === name))
            .filter((w): w is WordWithIndex => w !== undefined)
          finalIndex = Math.min(saved.index, finalWords.length - 1)
        } else {
          const date = getTodayDate()
          finalWords = shuffleWithSeed(filteredWords, `${dictId}-${date}`)
          finalIndex = 0
        }
      } else {
        finalWords = filteredWords
        finalIndex = 0
      }

      if (finalWords.length === 0) {
        setHasWords(false)
        setLearningType('complete')
        setIsLoading(false)
        return
      }

      wordNamesRef.current = finalWords.map((w) => w.name)
      setWords(finalWords)
      setCurrentIndex(finalIndex)

      if (mode !== 'normal') {
        setIsRepeatLearning(true)
        saveSessionProgress(progressKey, dictId, finalIndex, wordNamesRef.current)
      }

      if (mode === 'normal') {
        const dueWords = strategy.getWordNames(dictId, wordNames)
        const dueSet = new Set(dueWords)
        const hasReview = finalWords.some((w) => dueSet.has(w.name))
        setLearningType(hasReview ? 'review' : 'new')
      } else {
        setLearningType('review')
      }

      isInitializedRef.current = true
      setHasWords(true)
    } catch (e) {
      console.error('Failed to load words:', e)
      setHasWords(false)
    } finally {
      setIsLoading(false)
    }
  }, [wordList, dictId, strategy, progressKey, mode, setWords, setCurrentIndex, setIsRepeatLearning, setIsLoading, setHasWords, setLearningType, setSessionStats])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  useEffect(() => {
    if (!strategy.needsSessionPersist || !isInitializedRef.current || !dictId) return
    saveSessionProgress(progressKey, dictId, currentIndex, wordNamesRef.current)
  }, [currentIndex, dictId, strategy.needsSessionPersist, progressKey])

  const handleMastered = useCallback(async () => {
    if (mode !== 'normal' || !currentWord || !dictId) return

    const progress = updateProgress(dictId, currentWord.name, true)
    if (progress.masteryLevel === 7) {
      addMasteredWord(dictId, currentWord.name)
    }

    const wordNames = wordList?.map((w) => w.name) ?? []
    const newWordNames = normalStrategy.getWordNames(dictId, wordNames)
    const existing = new Set(words.map((w) => w.name))

    const wordMap = new Map(wordList?.map((w, i) => [w.name, { ...w, index: i }]))
    const next = newWordNames
      .map((name) => wordMap?.get(name))
      .filter((w): w is WordWithIndex => w !== undefined)
      .find((w) => !existing.has(w.name))

    if (next) {
      addReplacementWord(next)
      skipWord()
    }
  }, [mode, currentWord, dictId, wordList, words, addReplacementWord, skipWord])

  const handleExit = useCallback(() => {
    setIsRepeatLearning(false)
  }, [setIsRepeatLearning])

  useEffect(() => {
    if (mode === 'normal' && words.length > 0 && !isLoading) {
      setIsTyping(true)
    }
  }, [mode, words.length, isLoading, setIsTyping])

  return {
    isLoading,
    hasWords,
    isFinished,
    learningType,
    stats,
    displayIndex: currentIndex,
    handleMastered: mode === 'normal' ? handleMastered : undefined,
    handleExit,
  }
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff) >>> 0
    const j = hash % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

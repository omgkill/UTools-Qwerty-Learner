import type { IDailyRecord, IDictProgress, IWordProgress, MasteryLevel } from './progress'
import { DailyRecord, DictProgress, getNextReviewTime, getTodayDate, LEARNING_CONFIG, MASTERY_LEVELS, updateMasteryLevel, WordProgress } from './progress'
import type { Word, WordWithIndex } from '@/typings'
import { currentDictIdAtom, dailyRecordAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { db } from './index'

export function useWordProgress() {
  const dictID = useAtomValue(currentDictIdAtom)

  const getWordProgress = useCallback(
    async (word: string): Promise<IWordProgress | undefined> => {
      if (!dictID) return undefined
      return db.wordProgress.where('[dict+word]').equals([dictID, word]).first()
    },
    [dictID],
  )

  const getWordsProgress = useCallback(
    async (words: string[]): Promise<Map<string, IWordProgress>> => {
      const progressMap = new Map<string, IWordProgress>()
      if (!dictID || words.length === 0) return progressMap

      const progressList = await db.wordProgress.where('dict').equals(dictID).and((p) => words.includes(p.word)).toArray()

      for (const progress of progressList) {
        progressMap.set(progress.word, progress)
      }
      return progressMap
    },
    [dictID],
  )

  const updateWordProgress = useCallback(
    async (word: string, isCorrect: boolean, wrongCount: number): Promise<IWordProgress> => {
      if (!dictID) throw new Error('No dict selected')

      let progress = await getWordProgress(word)

      if (!progress) {
        progress = new WordProgress(word, dictID)
      }

      const { newLevel, newEaseFactor } = updateMasteryLevel(progress.masteryLevel, isCorrect, wrongCount, progress.easeFactor)

      progress.masteryLevel = newLevel
      progress.easeFactor = newEaseFactor
      progress.nextReviewTime = getNextReviewTime(newLevel, newEaseFactor)
      progress.lastReviewTime = Date.now()
      progress.reps = (progress.reps || 0) + 1

      if (isCorrect) {
        progress.correctCount++
        progress.streak++
      } else {
        progress.wrongCount++
        progress.streak = 0
      }

      if (progress.id) {
        await db.wordProgress.update(progress.id, progress)
      } else {
        progress.id = await db.wordProgress.add(progress)
      }

      return progress
    },
    [dictID, getWordProgress],
  )

  const initWordProgress = useCallback(
    async (word: string): Promise<IWordProgress> => {
      if (!dictID) throw new Error('No dict selected')

      const existing = await getWordProgress(word)
      if (existing) return existing

      const progress = new WordProgress(word, dictID)
      progress.id = await db.wordProgress.add(progress)
      return progress
    },
    [dictID, getWordProgress],
  )

  const batchInitWordProgress = useCallback(
    async (words: string[]): Promise<void> => {
      if (!dictID || words.length === 0) return

      const existingProgress = await getWordsProgress(words)
      const newWords = words.filter((w) => !existingProgress.has(w))

      if (newWords.length > 0) {
        const newProgressList = newWords.map((word) => new WordProgress(word, dictID))
        await db.wordProgress.bulkAdd(newProgressList)
      }
    },
    [dictID, getWordsProgress],
  )

  const markAsMastered = useCallback(
    async (word: string): Promise<IWordProgress> => {
      if (!dictID) throw new Error('No dict selected')

      let progress = await getWordProgress(word)

      if (!progress) {
        progress = new WordProgress(word, dictID)
      }

      progress.masteryLevel = MASTERY_LEVELS.MASTERED
      progress.nextReviewTime = Date.now() + 365 * 24 * 60 * 60 * 1000
      progress.lastReviewTime = Date.now()
      progress.correctCount++
      progress.streak++

      if (progress.id) {
        await db.wordProgress.update(progress.id, progress)
      } else {
        progress.id = await db.wordProgress.add(progress)
      }

      return progress
    },
    [dictID, getWordProgress],
  )

  return {
    getWordProgress,
    getWordsProgress,
    updateWordProgress,
    initWordProgress,
    batchInitWordProgress,
    markAsMastered,
  }
}

export function useDictProgress() {
  const dictID = useAtomValue(currentDictIdAtom)

  const getDictProgress = useCallback(async (): Promise<IDictProgress | undefined> => {
    if (!dictID) return undefined
    return db.dictProgress.where('dict').equals(dictID).first()
  }, [dictID])

  const updateDictProgress = useCallback(
    async (updates: Partial<IDictProgress>): Promise<void> => {
      if (!dictID) return

      let progress = await getDictProgress()

      if (!progress) {
        progress = new DictProgress(dictID)
        progress.id = await db.dictProgress.add(progress)
      }

      Object.assign(progress, updates)
      progress.lastStudyTime = Date.now()

      await db.dictProgress.update(progress.id!, progress)
    },
    [dictID, getDictProgress],
  )

  const incrementStudyDay = useCallback(async (): Promise<void> => {
    if (!dictID) return

    const progress = await getDictProgress()
    if (!progress) return

    const lastDate = new Date(progress.lastStudyTime).toDateString()
    const today = new Date().toDateString()

    if (lastDate !== today) {
      await updateDictProgress({ studyDays: progress.studyDays + 1 })
    }
  }, [dictID, getDictProgress, updateDictProgress])

  const recalculateStats = useCallback(async (): Promise<void> => {
    if (!dictID) return

    const allProgress = await db.wordProgress.where('dict').equals(dictID).toArray()

    const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
    const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length

    await updateDictProgress({ learnedWords, masteredWords })
  }, [dictID, updateDictProgress])

  return {
    getDictProgress,
    updateDictProgress,
    incrementStudyDay,
    recalculateStats,
  }
}

export function useReviewWords() {
  const dictID = useAtomValue(currentDictIdAtom)

  const getDueWords = useCallback(
    async (limit: number = 20): Promise<IWordProgress[]> => {
      if (!dictID) return []

      const now = Date.now()
      return db.wordProgress
        .where('dict')
        .equals(dictID)
        .and((p) => p.nextReviewTime <= now && p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED)
        .limit(limit)
        .toArray()
    },
    [dictID],
  )

  const getDueWordsWithInfo = useCallback(
    async (allWords: Word[], limit: number = 20): Promise<WordWithIndex[]> => {
      const dueProgress = await getDueWords(limit)
      if (dueProgress.length === 0) return []

      const dueWordSet = new Set(dueProgress.map((p) => p.word))
      return allWords
        .map((word, index) => ({ ...word, index }))
        .filter((word) => dueWordSet.has(word.name))
    },
    [getDueWords],
  )

  const getNewWords = useCallback(
    async (allWords: Word[], limit: number = 20): Promise<WordWithIndex[]> => {
      if (!dictID || allWords.length === 0) return []

      const existingProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
      const existingWords = new Set(existingProgress.map((p) => p.word))

      return allWords
        .map((word, index) => ({ ...word, index }))
        .filter((word) => !existingWords.has(word.name))
        .slice(0, limit)
    },
    [dictID],
  )

  return {
    getDueWords,
    getDueWordsWithInfo,
    getNewWords,
  }
}

export function useLearningStats() {
  const dictID = useAtomValue(currentDictIdAtom)
  const [stats, setStats] = useState({
    totalWords: 0,
    learnedWords: 0,
    masteredWords: 0,
    dueWords: 0,
    todayLearned: 0,
    todayReviewed: 0,
  })

  const refreshStats = useCallback(async () => {
    if (!dictID) {
      setStats({
        totalWords: 0,
        learnedWords: 0,
        masteredWords: 0,
        dueWords: 0,
        todayLearned: 0,
        todayReviewed: 0,
      })
      return
    }

    const allProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
    const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
    const dueWords = allProgress.filter((p) => p.nextReviewTime <= now && p.masteryLevel < MASTERY_LEVELS.MASTERED).length
    const todayLearned = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps === 1).length
    const todayReviewed = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps > 1).length

    setStats({
      totalWords: allProgress.length,
      learnedWords,
      masteredWords,
      dueWords,
      todayLearned,
      todayReviewed,
    })
  }, [dictID])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return { stats, refreshStats }
}

export function useDailyRecord() {
  const dictID = useAtomValue(currentDictIdAtom)
  const setDailyRecord = useSetAtom(dailyRecordAtom)
  const dailyRecord = useAtomValue(dailyRecordAtom)

  const getTodayRecord = useCallback(async (): Promise<IDailyRecord> => {
    if (!dictID) throw new Error('No dict selected')

    const today = getTodayDate()
    let record = await db.dailyRecords.where('[dict+date]').equals([dictID, today]).first()

    if (!record) {
      record = new DailyRecord(dictID, today)
      record.id = await db.dailyRecords.add(record)
    }

    return record
  }, [dictID])

  const refreshDailyRecord = useCallback(async () => {
    if (!dictID) {
      setDailyRecord(null)
      return
    }

    const record = await getTodayRecord()
    setDailyRecord(record)
  }, [dictID, getTodayRecord, setDailyRecord])

  const incrementReviewed = useCallback(async (): Promise<void> => {
    if (!dictID) return

    const record = await getTodayRecord()
    record.reviewedCount++
    record.lastUpdateTime = Date.now()
    await db.dailyRecords.update(record.id!, record)
    setDailyRecord({ ...record })
  }, [dictID, getTodayRecord, setDailyRecord])

  const incrementLearned = useCallback(async (): Promise<void> => {
    if (!dictID) return

    const record = await getTodayRecord()
    record.learnedCount++
    record.lastUpdateTime = Date.now()
    await db.dailyRecords.update(record.id!, record)
    setDailyRecord({ ...record })
  }, [dictID, getTodayRecord, setDailyRecord])

  const getNewWordQuota = useCallback((): number => {
    if (!dailyRecord) return LEARNING_CONFIG.BASE_QUOTA
    const { BASE_QUOTA, REVIEW_TO_NEW_RATIO, DAILY_NEW_WORD_LIMIT } = LEARNING_CONFIG
    const bonusQuota = Math.floor(dailyRecord.reviewedCount / REVIEW_TO_NEW_RATIO)
    const totalQuota = Math.min(BASE_QUOTA + bonusQuota, DAILY_NEW_WORD_LIMIT)
    return Math.max(0, totalQuota - dailyRecord.learnedCount)
  }, [dailyRecord])

  const getRemainingForTarget = useCallback((): number => {
    if (!dailyRecord) return LEARNING_CONFIG.DAILY_MIN_TARGET
    return Math.max(0, LEARNING_CONFIG.DAILY_MIN_TARGET - dailyRecord.reviewedCount - dailyRecord.learnedCount)
  }, [dailyRecord])

  const hasReachedTarget = useCallback((): boolean => {
    if (!dailyRecord) return false
    return dailyRecord.reviewedCount + dailyRecord.learnedCount >= LEARNING_CONFIG.DAILY_MIN_TARGET
  }, [dailyRecord])

  useEffect(() => {
    refreshDailyRecord()
  }, [refreshDailyRecord])

  return {
    dailyRecord,
    refreshDailyRecord,
    incrementReviewed,
    incrementLearned,
    getNewWordQuota,
    getRemainingForTarget,
    hasReachedTarget,
  }
}

import type { IWordProgress } from '../progress'
import { MASTERY_LEVELS, WordProgress, getNextReviewTime, updateMasteryLevel } from '../progress'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { db, recordDataWrite, resolveDictId } from '../index'

export function useWordProgress() {
  const dictID = useAtomValue(currentDictIdAtom)
  const resolvedDictId = resolveDictId(dictID)

  const getWordProgress = useCallback(
    async (word: string): Promise<IWordProgress | undefined> => {
      if (!resolvedDictId) return undefined
      return db.wordProgress.where('[dict+word]').equals([resolvedDictId, word]).first()
    },
    [resolvedDictId],
  )

  const getWordsProgress = useCallback(
    async (words: string[]): Promise<Map<string, IWordProgress>> => {
      const progressMap = new Map<string, IWordProgress>()
      if (!resolvedDictId || words.length === 0) return progressMap

      const progressList = await db.wordProgress
        .where('[dict+word]')
        .anyOf(words.map((w) => [resolvedDictId, w]))
        .toArray()

      for (const progress of progressList) {
        progressMap.set(progress.word, progress)
      }
      return progressMap
    },
    [resolvedDictId],
  )

  const updateWordProgress = useCallback(
    async (word: string, isCorrect: boolean, wrongCount: number): Promise<IWordProgress> => {
      if (!resolvedDictId) throw new Error('No dict selected')

      let progress = await getWordProgress(word)
      const wasFirstAttempt = !progress || (progress.reps || 0) === 0

      if (!progress) {
        progress = new WordProgress(word, resolvedDictId)
      }

      const { newLevel } = updateMasteryLevel(progress.masteryLevel, isCorrect, wrongCount)

      progress.masteryLevel = newLevel
      progress.nextReviewTime = getNextReviewTime(newLevel)
      progress.lastReviewTime = Date.now()
      progress.reps = (progress.reps || 0) + 1
      if (wasFirstAttempt && !isCorrect) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        progress.nextReviewTime = tomorrow.getTime()
      }
      if (isCorrect) {
        progress.correctCount++
        progress.streak++
      } else {
        progress.wrongCount++
        progress.streak = 0
      }

      progress.id = await db.wordProgress.put(progress)
      recordDataWrite()
      return progress
    },
    [resolvedDictId, getWordProgress],
  )

  const initWordProgress = useCallback(
    async (word: string): Promise<IWordProgress> => {
      if (!resolvedDictId) throw new Error('No dict selected')

      const existing = await getWordProgress(word)
      if (existing) return existing

      const progress = new WordProgress(word, resolvedDictId)
      progress.id = await db.wordProgress.add(progress)
      recordDataWrite()
      return progress
    },
    [resolvedDictId, getWordProgress],
  )

  const batchInitWordProgress = useCallback(
    async (words: string[]): Promise<void> => {
      if (!resolvedDictId || words.length === 0) return

      const existingProgress = await getWordsProgress(words)
      const newWords = words.filter((w) => !existingProgress.has(w))

      if (newWords.length > 0) {
        const newProgressList = newWords.map((word) => new WordProgress(word, resolvedDictId))
        await db.wordProgress.bulkAdd(newProgressList)
        recordDataWrite()
      }
    },
    [resolvedDictId, getWordsProgress],
  )

  const markAsMastered = useCallback(
    async (word: string): Promise<IWordProgress> => {
      if (!resolvedDictId) throw new Error('No dict selected')

      let progress = await getWordProgress(word)

      if (!progress) {
        progress = new WordProgress(word, resolvedDictId)
      }

      progress.masteryLevel = MASTERY_LEVELS.MASTERED
      progress.nextReviewTime = Date.now() + 30 * 24 * 60 * 60 * 1000
      progress.lastReviewTime = Date.now()
      progress.correctCount++
      progress.streak++

      progress.id = await db.wordProgress.put(progress)
      recordDataWrite()
      return progress
    },
    [resolvedDictId, getWordProgress],
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

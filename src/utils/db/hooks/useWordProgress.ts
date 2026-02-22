import type { IWordProgress } from '../progress'
import { MASTERY_LEVELS, WordProgress, getNextReviewTime, updateMasteryLevel } from '../progress'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { db } from '../index'

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

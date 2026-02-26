import type { IWordProgress } from '../progress'
import { MASTERY_LEVELS } from '../progress'
import type { Word, WordWithIndex } from '@/typings'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { db } from '../index'

export function useReviewWords() {
  const dictID = useAtomValue(currentDictIdAtom)

  const getDueWords = useCallback(
    async (limit = 20): Promise<IWordProgress[]> => {
      if (!dictID) return []

      const now = Date.now()
      const allDictProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
      const dueWords = allDictProgress.filter(
        (p) => p.nextReviewTime <= now && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED,
      )
      return dueWords.slice(0, limit)
    },
    [dictID],
  )

  const getDueWordsWithInfo = useCallback(
    async (allWords: Word[], limit = 20): Promise<WordWithIndex[]> => {
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
    async (allWords: Word[], limit = 20): Promise<WordWithIndex[]> => {
      if (!dictID || allWords.length === 0) return []

      const existingProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
      const progressMap = new Map(existingProgress.map((progress) => [progress.word, progress]))

      return allWords
        .map((word, index) => ({ ...word, index }))
        .filter((word) => {
          const progress = progressMap.get(word.name)
          return !progress || progress.masteryLevel === MASTERY_LEVELS.NEW
        })
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

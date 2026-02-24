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
      // 先用索引过滤 dict，再在内存中过滤 nextReviewTime 和 masteryLevel
      // .limit() 放在 .and() 之后只限制最终结果数，实际仍需全扫该词典的记录
      // 此处分两步：先取全部该词典记录，再过滤，确保 limit 语义正确
      const allDictProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
      const dueWords = allDictProgress.filter(
        (p) => p.nextReviewTime <= now && p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED,
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

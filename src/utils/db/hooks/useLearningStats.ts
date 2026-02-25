import { MASTERY_LEVELS } from '../progress'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { db } from '../index'

export type LearningStats = {
  totalWords: number
  learnedWords: number
  masteredWords: number
  dueWords: number
  todayLearned: number
  todayReviewed: number
}

const initialStats: LearningStats = {
  totalWords: 0,
  learnedWords: 0,
  masteredWords: 0,
  dueWords: 0,
  todayLearned: 0,
  todayReviewed: 0,
}

export function useLearningStats() {
  const dictID = useAtomValue(currentDictIdAtom)
  const [stats, setStats] = useState<LearningStats>(initialStats)

  const refreshStats = useCallback(async () => {
    if (!dictID) {
      setStats(initialStats)
      return
    }

    const allProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
    const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
    const dueWords = allProgress.filter((p) => p.nextReviewTime <= now && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED).length
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
    let cancelled = false
    const run = async () => {
      if (!dictID) {
        setStats(initialStats)
        return
      }
      const allProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
      if (cancelled) return
      const now = Date.now()
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
      const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
      const dueWords = allProgress.filter((p) => p.nextReviewTime <= now && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED).length
      const todayLearned = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps === 1).length
      const todayReviewed = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps > 1).length
      setStats({ totalWords: allProgress.length, learnedWords, masteredWords, dueWords, todayLearned, todayReviewed })
    }
    run()
    return () => { cancelled = true }
  }, [dictID])

  return { stats, refreshStats }
}

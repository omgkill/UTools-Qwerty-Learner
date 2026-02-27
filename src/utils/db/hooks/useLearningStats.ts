import { MASTERY_LEVELS } from '../progress'
import { currentDictIdAtom } from '@/store'
import { now, getTodayStartTime } from '@/utils/timeService'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { db, resolveDictId } from '../index'

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
  const resolvedDictId = resolveDictId(dictID)
  const [stats, setStats] = useState<LearningStats>(initialStats)

  const refreshStats = useCallback(async () => {
    if (!resolvedDictId) {
      setStats(initialStats)
      return
    }

    const allProgress = await db.wordProgress.where('dict').equals(resolvedDictId).toArray()
    const currentTime = now()
    const todayStart = getTodayStartTime()

    const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
    const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
    const dueWords = allProgress.filter((p) => p.nextReviewTime <= currentTime && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED).length
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
  }, [resolvedDictId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!resolvedDictId) {
        setStats(initialStats)
        return
      }
      const allProgress = await db.wordProgress.where('dict').equals(resolvedDictId).toArray()
      if (cancelled) return
      const currentTime = now()
      const todayStart = getTodayStartTime()
      const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
      const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length
      const dueWords = allProgress.filter((p) => p.nextReviewTime <= currentTime && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED).length
      const todayLearned = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps === 1).length
      const todayReviewed = allProgress.filter((p) => p.lastReviewTime >= todayStart && p.reps > 1).length
      setStats({ totalWords: allProgress.length, learnedWords, masteredWords, dueWords, todayLearned, todayReviewed })
    }
    run()
    return () => { cancelled = true }
  }, [resolvedDictId])

  return { stats, refreshStats }
}

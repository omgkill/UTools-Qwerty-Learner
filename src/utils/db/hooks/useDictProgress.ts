import type { IDictProgress } from '../progress'
import { DictProgress, MASTERY_LEVELS } from '../progress'
import { currentDictIdAtom } from '@/store'
import { now, getTodayString } from '@/utils/timeService'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { db, recordDataWrite, resolveDictId } from '../index'

export function useDictProgress() {
  const dictID = useAtomValue(currentDictIdAtom)
  const resolvedDictId = resolveDictId(dictID)

  const getDictProgress = useCallback(async (): Promise<IDictProgress | undefined> => {
    if (!resolvedDictId) return undefined
    return db.dictProgress.where('dict').equals(resolvedDictId).first()
  }, [resolvedDictId])

  const updateDictProgress = useCallback(
    async (updates: Partial<IDictProgress>): Promise<void> => {
      if (!resolvedDictId) return

      const progress = await getDictProgress()

      if (!progress) {
        const newProgress = new DictProgress(resolvedDictId)
        Object.assign(newProgress, updates)
        newProgress.lastStudyTime = now()
        await db.dictProgress.add(newProgress)
        recordDataWrite()
        return
      }

      Object.assign(progress, updates)
      progress.lastStudyTime = now()
      if (!progress.id) {
        progress.id = await db.dictProgress.add(progress)
        recordDataWrite()
        return
      }
      await db.dictProgress.update(progress.id, progress)
      recordDataWrite()
    },
    [resolvedDictId, getDictProgress],
  )

  const incrementStudyDay = useCallback(async (): Promise<void> => {
    if (!resolvedDictId) return

    const progress = await getDictProgress()
    if (!progress) return

    const lastDate = new Date(progress.lastStudyTime).toISOString().split('T')[0]
    const today = getTodayString()

    if (lastDate !== today) {
      await updateDictProgress({ studyDays: progress.studyDays + 1 })
    }
  }, [resolvedDictId, getDictProgress, updateDictProgress])

  const recalculateStats = useCallback(async (): Promise<void> => {
    if (!resolvedDictId) return

    const allProgress = await db.wordProgress.where('dict').equals(resolvedDictId).toArray()

    const learnedWords = allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW).length
    const masteredWords = allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length

    await updateDictProgress({ learnedWords, masteredWords })
  }, [resolvedDictId, updateDictProgress])

  return {
    getDictProgress,
    updateDictProgress,
    incrementStudyDay,
    recalculateStats,
  }
}

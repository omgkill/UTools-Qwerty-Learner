import type { IDictProgress } from '../progress'
import { DictProgress, MASTERY_LEVELS } from '../progress'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { db } from '../index'

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

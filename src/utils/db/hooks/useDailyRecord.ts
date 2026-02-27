import type { IDailyRecord } from '../progress'
import { DailyRecord, LEARNING_CONFIG, getTodayDate } from '../progress'
import { currentDictIdAtom } from '@/store'
import { dailyRecordAtom } from '@/pages/Typing/store/atoms'
import { now } from '@/utils/timeService'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { db, recordDataWrite, resolveDictId } from '../index'

export function useDailyRecord() {
  const dictID = useAtomValue(currentDictIdAtom)
  const resolvedDictId = resolveDictId(dictID)
  const setDailyRecord = useSetAtom(dailyRecordAtom)
  const dailyRecord = useAtomValue(dailyRecordAtom)

  const getTodayRecord = useCallback(async (): Promise<IDailyRecord> => {
    if (!resolvedDictId) throw new Error('No dict selected')

    const today = getTodayDate()
    let record = await db.dailyRecords.where('[dict+date]').equals([resolvedDictId, today]).first()

    if (!record) {
      record = new DailyRecord(resolvedDictId, today)
      record.id = await db.dailyRecords.add(record)
      recordDataWrite()
    }

    return record
  }, [resolvedDictId])

  const refreshDailyRecord = useCallback(async () => {
    if (!resolvedDictId) {
      setDailyRecord(null)
      return
    }

    const record = await getTodayRecord()
    setDailyRecord(record)
  }, [resolvedDictId, getTodayRecord, setDailyRecord])

  const incrementReviewed = useCallback(async (isExtra = false): Promise<void> => {
    if (!resolvedDictId) return

    try {
      const today = getTodayDate()
      const updatedRecord = await db.transaction('rw', db.dailyRecords, async () => {
        let record = await db.dailyRecords.where('[dict+date]').equals([resolvedDictId, today]).first()
        if (!record) {
          record = new DailyRecord(resolvedDictId, today)
        }
        if (isExtra) {
          record.extraReviewedCount++
        } else {
          record.reviewedCount++
        }
        record.lastUpdateTime = now()
        record.id = await db.dailyRecords.put(record)
        return { ...record }
      })
      setDailyRecord(updatedRecord)
      recordDataWrite()
    } catch (e) {
      console.error('Failed to increment reviewed:', e)
    }
  }, [resolvedDictId, setDailyRecord])

  const incrementLearned = useCallback(async (): Promise<void> => {
    if (!resolvedDictId) return

    try {
      const today = getTodayDate()
      const updatedRecord = await db.transaction('rw', db.dailyRecords, async () => {
        let record = await db.dailyRecords.where('[dict+date]').equals([resolvedDictId, today]).first()
        if (!record) {
          record = new DailyRecord(resolvedDictId, today)
        }
        record.learnedCount++
        record.lastUpdateTime = now()
        record.id = await db.dailyRecords.put(record)
        return { ...record }
      })
      setDailyRecord(updatedRecord)
      recordDataWrite()
    } catch (e) {
      console.error('Failed to increment learned:', e)
    }
  }, [resolvedDictId, setDailyRecord])

  const incrementMastered = useCallback(async (): Promise<void> => {
    if (!resolvedDictId) return

    try {
      const today = getTodayDate()
      const updatedRecord = await db.transaction('rw', db.dailyRecords, async () => {
        let record = await db.dailyRecords.where('[dict+date]').equals([resolvedDictId, today]).first()
        if (!record) {
          record = new DailyRecord(resolvedDictId, today)
        }
        record.masteredCount++
        record.lastUpdateTime = now()
        record.id = await db.dailyRecords.put(record)
        return { ...record }
      })
      setDailyRecord(updatedRecord)
      recordDataWrite()
    } catch (e) {
      console.error('Failed to increment mastered:', e)
    }
  }, [resolvedDictId, setDailyRecord])

  const getExtraReviewInfo = useCallback((): { hasExtra: boolean; remaining: number } => {
    if (!dailyRecord) return { hasExtra: false, remaining: 0 }
    return { hasExtra: dailyRecord.hasExtraReviewQuota, remaining: dailyRecord.extraReviewedCount }
  }, [dailyRecord])

  const getNewWordQuota = useCallback((): number => {
    if (!dailyRecord) return LEARNING_CONFIG.DAILY_LIMIT
    return dailyRecord.getNewWordQuota()
  }, [dailyRecord])

  const getRemainingForTarget = useCallback((): number => {
    if (!dailyRecord) return LEARNING_CONFIG.DAILY_LIMIT
    return dailyRecord.remainingForTarget
  }, [dailyRecord])

  const hasReachedTarget = useCallback((): boolean => {
    if (!dailyRecord) return false
    return dailyRecord.hasReachedTarget
  }, [dailyRecord])

  useEffect(() => {
    refreshDailyRecord()
  }, [refreshDailyRecord])

  return {
    dailyRecord,
    refreshDailyRecord,
    incrementReviewed,
    incrementLearned,
    incrementMastered,
    getNewWordQuota,
    getRemainingForTarget,
    hasReachedTarget,
    getExtraReviewInfo,
  }
}

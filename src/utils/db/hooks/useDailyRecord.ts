import type { IDailyRecord } from '../progress'
import { DailyRecord, LEARNING_CONFIG, getTodayDate } from '../progress'
import { currentDictIdAtom } from '@/store'
import { dailyRecordAtom } from '@/pages/Typing/store/atoms'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { db } from '../index'

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

  const incrementReviewed = useCallback(async (isExtra = false): Promise<void> => {
    if (!dictID) return

    const record = await getTodayRecord()
    if (isExtra) {
      record.extraReviewedCount++
    } else {
      record.reviewedCount++
    }
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
    getNewWordQuota,
    getRemainingForTarget,
    hasReachedTarget,
    getExtraReviewInfo,
  }
}

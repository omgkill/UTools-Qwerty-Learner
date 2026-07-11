import type { DailyRecordRepository } from '@/features/typing/application/ports'
import type { TypingDailyRecord } from '@/features/typing/domain'
import { db as defaultDb } from '@/utils/db'
import { DailyRecord, getTodayDate } from '@/utils/db/progress'
import type { IDailyRecord } from '@/utils/db/progress'
import { now } from '@/utils/timeService'
import type Dexie from 'dexie'
import type { Table } from 'dexie'

type DailyRecordTables = {
  dailyRecords: Table<IDailyRecord, number>
}

export class DexieDailyRecordRepository implements DailyRecordRepository {
  constructor(private db: Dexie) {}

  private get dailyRecords(): Table<IDailyRecord, number> {
    return (this.db as Dexie & DailyRecordTables).dailyRecords
  }

  async getTodayRecord(dictId: string): Promise<TypingDailyRecord> {
    const today = getTodayDate()
    let record = await this.dailyRecords.where('[dict+date]').equals([dictId, today]).first()

    if (!record) {
      record = new DailyRecord(dictId, today)
      record.id = await this.dailyRecords.put(record)
    }

    return record
  }

  async ensureTodayRecord(dictId: string): Promise<TypingDailyRecord> {
    return this.getTodayRecord(dictId)
  }

  async incrementReviewed(dictId: string, isExtra = false): Promise<TypingDailyRecord> {
    const record = await this.getTodayRecord(dictId)

    if (isExtra) {
      record.extraReviewedCount++
    } else {
      record.reviewedCount++
    }
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return record
  }

  async incrementLearned(dictId: string): Promise<TypingDailyRecord> {
    const record = await this.getTodayRecord(dictId)

    record.learnedCount++
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return record
  }

  async incrementMastered(dictId: string): Promise<TypingDailyRecord> {
    const record = await this.getTodayRecord(dictId)

    record.masteredCount++
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return record
  }

  async getRecord(dictId: string, date: string): Promise<TypingDailyRecord | undefined> {
    return this.dailyRecords.where('[dict+date]').equals([dictId, date]).first()
  }

  async getRecordsInRange(dictId: string, startDate: string, endDate: string): Promise<TypingDailyRecord[]> {
    return this.dailyRecords.where('[dict+date]').between([dictId, startDate], [dictId, endDate]).toArray()
  }
}

export const dexieDailyRecordRepository = new DexieDailyRecordRepository(defaultDb)

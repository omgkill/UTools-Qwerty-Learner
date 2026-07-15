import type { DailyRecordRepository } from '@/features/typing/application/ports'
import type { TypingDailyRecord, TypingDailyWordDetail } from '@/features/typing/domain'
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

    return this.toTypingDailyRecord(record)
  }

  async ensureTodayRecord(dictId: string): Promise<TypingDailyRecord> {
    return this.getTodayRecord(dictId)
  }

  async incrementReviewed(dictId: string, isExtra = false): Promise<TypingDailyRecord> {
    const today = getTodayDate()
    const record = await this.getOrCreateRecord(dictId, today)

    if (isExtra) {
      record.extraReviewedCount++
    } else {
      record.reviewedCount++
    }
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return this.toTypingDailyRecord(record)
  }

  async incrementLearned(dictId: string): Promise<TypingDailyRecord> {
    const today = getTodayDate()
    const record = await this.getOrCreateRecord(dictId, today)

    record.learnedCount++
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return this.toTypingDailyRecord(record)
  }

  async incrementMastered(dictId: string): Promise<TypingDailyRecord> {
    const today = getTodayDate()
    const record = await this.getOrCreateRecord(dictId, today)

    record.masteredCount++
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return this.toTypingDailyRecord(record)
  }

  async recordWordDetail(dictId: string, detail: TypingDailyWordDetail): Promise<TypingDailyRecord> {
    const today = getTodayDate()
    const record = await this.getOrCreateRecord(dictId, today)
    const wordDetails = [...(record.wordDetails ?? [])]
    const existingIndex = wordDetails.findIndex((item) => item.word === detail.word)

    if (existingIndex === -1) {
      wordDetails.push(detail)
    } else {
      const existing = wordDetails[existingIndex]
      wordDetails[existingIndex] = {
        word: detail.word,
        timeStamp: Math.max(existing.timeStamp, detail.timeStamp),
        wrongCount: Math.max(existing.wrongCount, detail.wrongCount),
        type: pickDetailType(existing.type, detail.type),
      }
    }

    record.wordDetails = wordDetails
    record.lastUpdateTime = now()
    record.id = await this.dailyRecords.put(record)

    return this.toTypingDailyRecord(record)
  }

  async getRecord(dictId: string, date: string): Promise<TypingDailyRecord | undefined> {
    const record = await this.dailyRecords.where('[dict+date]').equals([dictId, date]).first()
    return record ? this.toTypingDailyRecord(record) : undefined
  }

  async getRecordsInRange(dictId: string, startDate: string, endDate: string): Promise<TypingDailyRecord[]> {
    const records = await this.dailyRecords.where('[dict+date]').between([dictId, startDate], [dictId, endDate]).toArray()
    return records.map((r) => this.toTypingDailyRecord(r))
  }

  private toTypingDailyRecord(record: IDailyRecord): TypingDailyRecord {
    return {
      id: record.id,
      dict: record.dict,
      date: record.date,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
      extraReviewedCount: record.extraReviewedCount,
      masteredCount: record.masteredCount,
      lastUpdateTime: record.lastUpdateTime,
      wordDetails: record.wordDetails ?? [],
    }
  }

  private async getOrCreateRecord(dictId: string, date: string): Promise<IDailyRecord> {
    const record = await this.dailyRecords.where('[dict+date]').equals([dictId, date]).first()
    if (record) {
      record.wordDetails = record.wordDetails ?? []
      return record
    }

    return new DailyRecord(dictId, date)
  }
}

export const dexieDailyRecordRepository = new DexieDailyRecordRepository(defaultDb)

function pickDetailType(currentType: TypingDailyWordDetail['type'], nextType: TypingDailyWordDetail['type']): TypingDailyWordDetail['type'] {
  const priority: Record<TypingDailyWordDetail['type'], number> = {
    review: 1,
    new: 2,
    mastered: 3,
  }

  return priority[nextType] >= priority[currentType] ? nextType : currentType
}

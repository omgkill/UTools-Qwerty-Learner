import type { IDailyRecordRepository } from '../interfaces/IDailyRecordRepository'
import type { DailyRecord } from '../../types/learning'

/**
 * 获取今日日期字符串（YYYY-MM-DD）
 */
function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 创建空的每日记录
 */
function createEmptyRecord(dictId: string, date: string): DailyRecord {
  return {
    dictId,
    date,
    learnedCount: 0,
    reviewedCount: 0,
    masteredCount: 0,
    todayWords: [],
    wordTypes: {},
  }
}

/**
 * 内存每日记录存储实现（用于测试）
 */
export class MockDailyRecordRepository implements IDailyRecordRepository {
  private store: Map<string, DailyRecord> = new Map()
  private todayDate: string = getTodayDate()

  private getKey(dictId: string, date: string): string {
    return `${dictId}:${date}`
  }

  get(dictId: string, date: string): DailyRecord | null {
    const key = this.getKey(dictId, date)
    return this.store.get(key) || null
  }

  set(dictId: string, date: string, record: DailyRecord): void {
    const key = this.getKey(dictId, date)
    this.store.set(key, record)
  }

  getToday(dictId: string): DailyRecord {
    const existing = this.get(dictId, this.todayDate)
    if (existing) return existing
    return createEmptyRecord(dictId, this.todayDate)
  }

  getAll(dictId: string): DailyRecord[] {
    const results: DailyRecord[] = []
    for (const [key, record] of this.store.entries()) {
      if (key.startsWith(`${dictId}:`)) {
        results.push(record)
      }
    }
    return results.sort((a, b) => b.date.localeCompare(a.date))
  }

  clear(dictId: string): void {
    const keysToRemove: string[] = []
    for (const key of this.store.keys()) {
      if (key.startsWith(`${dictId}:`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => this.store.delete(key))
  }

  /**
   * 设置当前日期（测试用，模拟不同日期）
   */
  setTodayDate(date: string): void {
    this.todayDate = date
  }

  /**
   * 清空所有数据（测试用）
   */
  clearAll(): void {
    this.store.clear()
  }

  /**
   * 获取存储大小（测试用）
   */
  size(): number {
    return this.store.size
  }
}
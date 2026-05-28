import type { IDailyRecordRepository } from '../interfaces/IDailyRecordRepository'
import type { DailyRecord } from '../../types/learning'

const STORAGE_KEY_PREFIX = 'qwerty-daily:'

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
 * localStorage 每日记录存储实现
 */
export class LocalStorageDailyRecordRepository implements IDailyRecordRepository {
  private getKey(dictId: string, date: string): string {
    return `${STORAGE_KEY_PREFIX}${dictId}:${date}`
  }

  get(dictId: string, date: string): DailyRecord | null {
    const key = this.getKey(dictId, date)
    const data = localStorage.getItem(key)
    if (!data) return null
    try {
      return JSON.parse(data) as DailyRecord
    } catch {
      return null
    }
  }

  set(dictId: string, date: string, record: DailyRecord): void {
    const key = this.getKey(dictId, date)
    localStorage.setItem(key, JSON.stringify(record))
  }

  getToday(dictId: string): DailyRecord {
    const date = getTodayDate()
    const existing = this.get(dictId, date)
    if (existing) return existing
    return createEmptyRecord(dictId, date)
  }

  getAll(dictId: string): DailyRecord[] {
    const results: DailyRecord[] = []
    const prefix = `${STORAGE_KEY_PREFIX}${dictId}:`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            results.push(JSON.parse(data) as DailyRecord)
          } catch {
            // 跳过解析失败的项
          }
        }
      }
    }

    return results.sort((a, b) => b.date.localeCompare(a.date))
  }

  clear(dictId: string): void {
    const prefix = `${STORAGE_KEY_PREFIX}${dictId}:`
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }
}
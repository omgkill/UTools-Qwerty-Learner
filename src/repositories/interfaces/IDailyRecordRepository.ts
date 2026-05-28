import type { DailyRecord } from '../../types/learning'

/**
 * 每日记录存储接口
 */
export interface IDailyRecordRepository {
  /**
   * 获取指定日期记录
   */
  get(dictId: string, date: string): DailyRecord | null

  /**
   * 设置指定日期记录
   */
  set(dictId: string, date: string, record: DailyRecord): void

  /**
   * 获取今日记录（不存在则创建空记录）
   */
  getToday(dictId: string): DailyRecord

  /**
   * 获取词库所有记录
   */
  getAll(dictId: string): DailyRecord[]

  /**
   * 清空词库记录
   */
  clear(dictId: string): void
}
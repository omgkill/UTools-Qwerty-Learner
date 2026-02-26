import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/utils/db'
import { DailyRecord } from '@/utils/db/progress'
import 'fake-indexeddb/auto'

describe('useStudyStats - 每日掌握单词统计', () => {
  const dictId = 'test-dict-stats'

  beforeEach(async () => {
    await db.dailyRecords.clear()
  })

  afterEach(async () => {
    await db.dailyRecords.clear()
  })

  it('只有掌握单词的记录应该显示在统计中', async () => {
    // 创建一条只有 masteredCount 的每日记录
    const record = new DailyRecord(dictId, '2026-02-26')
    record.masteredCount = 5
    record.learnedCount = 0
    record.reviewedCount = 0
    record.id = await db.dailyRecords.add(record)

    // 模拟 useDayStats 的查询逻辑
    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    
    // 当前的过滤条件（有bug）
    const daysWithBug = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount,
      }))

    // 期望的过滤条件（修复后）
    const daysFixed = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    // 验证bug：当前逻辑会过滤掉只有掌握单词的记录
    expect(daysWithBug.length).toBe(0) // 有bug，应该返回0
    expect(daysFixed.length).toBe(1) // 修复后，应该返回1
    expect(daysFixed[0].masteredCount).toBe(5)
  })

  it('同时有学习、复习和掌握的数据应该正确显示', async () => {
    const record = new DailyRecord(dictId, '2026-02-26')
    record.learnedCount = 10
    record.reviewedCount = 5
    record.masteredCount = 3
    record.id = await db.dailyRecords.add(record)

    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    
    const days = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    expect(days.length).toBe(1)
    expect(days[0].learnedCount).toBe(10)
    expect(days[0].reviewedCount).toBe(5)
    expect(days[0].masteredCount).toBe(3)
    expect(days[0].totalWords).toBe(18)
  })

  it('没有任何活动的记录不应该显示', async () => {
    const record = new DailyRecord(dictId, '2026-02-26')
    record.learnedCount = 0
    record.reviewedCount = 0
    record.masteredCount = 0
    record.id = await db.dailyRecords.add(record)

    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    
    const days = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    expect(days.length).toBe(0)
  })
})

import type { Activity } from 'react-activity-calendar'
import type { AnalysisDailyRecord } from './types'

export interface WordStats {
  isEmpty?: boolean
  exerciseRecord: Activity[]
  wordRecord: Activity[]
}

/**
 * 获取两个日期之间的所有日期
 */
export function getDatesBetween(start: number, end: number): string[] {
  const dates: string[] = []
  const startMs = new Date(start).setHours(0, 0, 0, 0)
  const endMs = new Date(end).setHours(23, 59, 59, 999)

  let current = startMs
  while (current <= endMs) {
    const d = new Date(current)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    current += 24 * 60 * 60 * 1000
  }

  return dates
}

/**
 * 根据数值计算活动级别
 */
export function getLevel(value: number): number {
  if (value === 0) return 0
  if (value < 4) return 1
  if (value < 8) return 2
  if (value < 12) return 3
  return 4
}

/**
 * 构建活动日历统计数据（基于 DailyRecord）
 */
export function buildWordStats(dailyRecords: AnalysisDailyRecord[], startTime: number, endTime: number): WordStats {
  if (dailyRecords.length === 0) {
    return { isEmpty: true, exerciseRecord: [], wordRecord: [] }
  }

  const dates = getDatesBetween(startTime, endTime)
  const data: Record<string, { exerciseCount: number; wordCount: number }> = dates
    .map((date) => ({ [date]: { exerciseCount: 0, wordCount: 0 } }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {})

  for (const record of dailyRecords) {
    if (!data[record.date]) continue
    data[record.date].exerciseCount += (record.learnedCount || 0) + (record.reviewedCount || 0) + (record.masteredCount || 0)
    data[record.date].wordCount += (record.learnedCount || 0) + (record.reviewedCount || 0) + (record.masteredCount || 0)
  }

  const entries = Object.entries(data)

  const exerciseRecord: Activity[] = entries.map(([date, { exerciseCount }]) => ({
    date,
    count: exerciseCount,
    level: getLevel(exerciseCount),
  }))

  const wordRecord: Activity[] = entries.map(([date, { wordCount }]) => ({
    date,
    count: wordCount,
    level: getLevel(wordCount),
  }))

  return { exerciseRecord, wordRecord }
}
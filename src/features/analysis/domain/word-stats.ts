import type { Activity } from 'react-activity-calendar'
import type { AnalysisWordRecord } from './types'

export interface WordStats {
  isEmpty?: boolean
  exerciseRecord: Activity[]
  wordRecord: Activity[]
  wpmRecord: [string, number][]
  accuracyRecord: [string, number][]
}

type DailyStats = {
  exerciseTime: number
  words: string[]
  totalTime: number
  wrongCount: number
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
 * 从时间戳获取日期字符串
 */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 构建按日期分组的统计数据
 */
export function buildWordStats(records: AnalysisWordRecord[], startTime: number, endTime: number): WordStats {
  if (records.length === 0) {
    return { isEmpty: true, exerciseRecord: [], wordRecord: [], wpmRecord: [], accuracyRecord: [] }
  }

  const dates = getDatesBetween(startTime, endTime)
  const data: Record<string, DailyStats> = dates
    .map((date) => ({ [date]: { exerciseTime: 0, words: [], totalTime: 0, wrongCount: 0 } }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {})

  for (const record of records) {
    const date = formatDate(record.timeStamp)
    if (!data[date]) continue

    data[date].exerciseTime += 1
    data[date].words.push(record.word)
    data[date].totalTime += record.timing.reduce((acc, curr) => acc + curr, 0)
    data[date].wrongCount += record.wrongCount
  }

  const entries = Object.entries(data)

  const exerciseRecord: Activity[] = entries.map(([date, { exerciseTime }]) => ({
    date,
    count: exerciseTime,
    level: getLevel(exerciseTime),
  }))

  const wordRecord: Activity[] = entries.map(([date, { words }]) => ({
    date,
    count: Array.from(new Set(words)).length,
    level: getLevel(Array.from(new Set(words)).length),
  }))

  const wpmRecord: [string, number][] = entries
    .map(([date, { words, totalTime }]) => [
      date,
      totalTime > 0 ? Math.round(words.length / (totalTime / 1000 / 60)) : 0,
    ])
    .filter(([, wpm]) => wpm > 0)

  const accuracyRecord: [string, number][] = entries
    .map(([date, { words, wrongCount }]) => {
      const totalChars = words.join('').length
      const accuracy = totalChars > 0 ? Math.round((totalChars / (totalChars + wrongCount)) * 100) : 0
      return [date, accuracy]
    })
    .filter(([, acc]) => acc > 0)

  return { exerciseRecord, wordRecord, wpmRecord, accuracyRecord }
}
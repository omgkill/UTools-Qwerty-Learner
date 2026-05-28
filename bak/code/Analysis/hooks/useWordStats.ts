import { getDailyRecords } from '@/utils/storage'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import type { Activity } from 'react-activity-calendar'

interface IWordStats {
  isEmpty?: boolean
  exerciseRecord: Activity[]
  wordRecord: Activity[]
}

function getDatesBetween(start: number, end: number) {
  const dates = []
  let curr = dayjs(start).startOf('day')
  const last = dayjs(end).endOf('day')

  while (curr.diff(last) < 0) {
    dates.push(curr.clone().format('YYYY-MM-DD'))
    curr = curr.add(1, 'day')
  }

  return dates
}

function getLevel(value: number) {
  if (value === 0) return 0
  else if (value < 4) return 1
  else if (value < 8) return 2
  else if (value < 12) return 3
  else return 4
}

export function useWordStats(startTimeStamp: number, endTimeStamp: number, dictId: string | null) {
  const [wordStats, setWordStats] = useState<IWordStats>({ exerciseRecord: [], wordRecord: [] })

  useEffect(() => {
    if (!dictId) {
      setWordStats({ exerciseRecord: [], wordRecord: [] })
      return
    }

    const stats = getStats(startTimeStamp, endTimeStamp, dictId)
    setWordStats(stats)
  }, [startTimeStamp, endTimeStamp, dictId])

  return wordStats
}

function getStats(startTimeStamp: number, endTimeStamp: number, dictId: string): IWordStats {
  const dailyRecords = getDailyRecords(dictId)
  
  if (dailyRecords.length === 0) {
    return { isEmpty: true, exerciseRecord: [], wordRecord: [] }
  }

  const dates = getDatesBetween(startTimeStamp * 1000, endTimeStamp * 1000)
  const recordMap = new Map(dailyRecords.map((r) => [r.date, r]))

  const data: { [date: string]: { exerciseTime: number; words: number } } = {}
  
  for (const date of dates) {
    const record = recordMap.get(date)
    data[date] = {
      exerciseTime: record ? (record.learnedCount + record.reviewedCount + record.masteredCount) : 0,
      words: record ? record.todayWords.length : 0,
    }
  }

  const RecordArray = Object.entries(data)

  const exerciseRecord: IWordStats['exerciseRecord'] = RecordArray.map(([date, { exerciseTime }]) => ({
    date,
    count: exerciseTime,
    level: getLevel(exerciseTime),
  }))

  const wordRecord: IWordStats['wordRecord'] = RecordArray.map(([date, { words }]) => ({
    date,
    count: words,
    level: getLevel(words),
  }))

  return { exerciseRecord, wordRecord }
}

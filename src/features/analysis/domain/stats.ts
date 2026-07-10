import type {
  AnalysisDailyRecord,
  AnalysisWordProgress,
  AnalysisWordRecord,
  DayStats,
  DictStats,
  WordBankSummary,
  WordDetail,
} from './types'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import dayjs from 'dayjs'

export function buildDictStats(wordRecords: AnalysisWordRecord[], wordBanks: WordBankSummary[]): DictStats[] {
  const dictNameMap = new Map(wordBanks.map((wordBank) => [wordBank.id, wordBank.name]))
  const dictMap = new Map<string, { dates: Set<string>; words: Set<string>; lastStudyTime: number }>()

  for (const record of wordRecords) {
    const dictId = record.dict
    const dictData = dictMap.get(dictId) ?? { dates: new Set<string>(), words: new Set<string>(), lastStudyTime: 0 }
    const date = dayjs(record.timeStamp).format('YYYY-MM-DD')

    dictData.dates.add(date)
    dictData.words.add(record.word)
    dictData.lastStudyTime = Math.max(dictData.lastStudyTime, record.timeStamp)
    dictMap.set(dictId, dictData)
  }

  return Array.from(dictMap.entries())
    .map(([dictId, data]) => ({
      dictId,
      dictName: dictNameMap.get(dictId) || dictId,
      totalDays: data.dates.size,
      totalWords: data.words.size,
      lastStudyDate: data.lastStudyTime > 0 ? dayjs(data.lastStudyTime).format('YYYY-MM-DD') : null,
    }))
    .sort((a, b) => {
      if (!a.lastStudyDate) return 1
      if (!b.lastStudyDate) return -1
      return b.lastStudyDate.localeCompare(a.lastStudyDate)
    })
}

export function buildDayStats(dailyRecords: AnalysisDailyRecord[]): DayStats[] {
  return dailyRecords
    .filter((record) => hasActivity(record))
    .map((record) => {
      const learnedCount = record.learnedCount || 0
      const reviewedCount = record.reviewedCount || 0
      const masteredCount = record.masteredCount || 0

      return {
        date: record.date,
        learnedCount,
        reviewedCount,
        masteredCount,
        totalWords: learnedCount + reviewedCount + masteredCount,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function buildWordDetails(wordRecords: AnalysisWordRecord[], wordProgressList: AnalysisWordProgress[], date: string): WordDetail[] {
  const startOfDay = dayjs(date).startOf('day').valueOf()
  const endOfDay = dayjs(date).endOf('day').valueOf()
  const wordFirstDateMap = buildWordFirstDateMap(wordRecords)
  const detailsByWord = new Map<string, WordDetail>()

  const recordsOnDate = wordRecords.filter((record) => record.timeStamp >= startOfDay && record.timeStamp <= endOfDay)

  for (const record of recordsOnDate) {
    const currentDate = dayjs(record.timeStamp).format('YYYY-MM-DD')
    const firstDateEver = wordFirstDateMap.get(record.word)
    const isMasteredRecord = record.timing.length === 0 && record.wrongCount === 0

    detailsByWord.set(record.word, {
      word: record.word,
      timeStamp: record.timeStamp,
      wrongCount: record.wrongCount,
      type: isMasteredRecord ? 'mastered' : firstDateEver === currentDate ? 'new' : 'review',
    })
  }

  for (const progress of wordProgressList) {
    if (progress.masteryLevel !== MASTERY_LEVELS.MASTERED) continue
    if (progress.lastReviewTime < startOfDay || progress.lastReviewTime > endOfDay) continue
    if (detailsByWord.has(progress.word)) continue

    detailsByWord.set(progress.word, {
      word: progress.word,
      timeStamp: progress.lastReviewTime,
      wrongCount: 0,
      type: 'mastered',
    })
  }

  return Array.from(detailsByWord.values()).sort((a, b) => a.word.localeCompare(b.word))
}

function hasActivity(record: AnalysisDailyRecord): boolean {
  return (record.learnedCount || 0) > 0 || (record.reviewedCount || 0) > 0 || (record.masteredCount || 0) > 0
}

function buildWordFirstDateMap(wordRecords: AnalysisWordRecord[]): Map<string, string> {
  const wordFirstDateMap = new Map<string, string>()
  const sortedRecords = [...wordRecords].sort((a, b) => a.timeStamp - b.timeStamp)

  for (const record of sortedRecords) {
    if (!wordFirstDateMap.has(record.word)) {
      wordFirstDateMap.set(record.word, dayjs(record.timeStamp).format('YYYY-MM-DD'))
    }
  }

  return wordFirstDateMap
}

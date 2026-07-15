import type { AnalysisDailyRecord, AnalysisWordProgress, DayStats, DictStats, WordBankSummary, WordDetail } from './types'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import dayjs from 'dayjs'

export function buildDictStats(wordProgressList: AnalysisWordProgress[], dailyRecords: AnalysisDailyRecord[], wordBanks: WordBankSummary[]): DictStats[] {
  const dictNameMap = new Map(wordBanks.map((wordBank) => [wordBank.id, wordBank.name]))
  const dictMap = new Map<string, { dates: Set<string>; words: Set<string>; lastStudyTime: number }>()

  // 从 DailyRecord 获取学习日期
  for (const record of dailyRecords) {
    const dictId = record.dict
    const dictData = dictMap.get(dictId) ?? { dates: new Set<string>(), words: new Set<string>(), lastStudyTime: 0 }
    dictData.dates.add(record.date)
    dictData.lastStudyTime = Math.max(dictData.lastStudyTime, record.lastUpdateTime)
    dictMap.set(dictId, dictData)
  }

  // 从 WordProgress 获取学过的单词
  for (const progress of wordProgressList) {
    const dictId = progress.dict
    const dictData = dictMap.get(dictId) ?? { dates: new Set<string>(), words: new Set<string>(), lastStudyTime: 0 }
    dictData.words.add(progress.word)
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

export function buildWordDetails(
  dailyRecord: AnalysisDailyRecord | undefined,
  wordProgressList: AnalysisWordProgress[],
  date: string,
): WordDetail[] {
  if (dailyRecord?.wordDetails?.length) {
    return [...dailyRecord.wordDetails].sort((a, b) => a.word.localeCompare(b.word))
  }

  const startOfDay = dayjs(date).startOf('day').valueOf()
  const endOfDay = dayjs(date).endOf('day').valueOf()
  const detailsByWord = new Map<string, WordDetail>()

  for (const progress of wordProgressList) {
    // 跳过今天没有学习的单词
    if (progress.lastReviewTime < startOfDay || progress.lastReviewTime > endOfDay) continue

    const isNew = progress.reps === 1
    const isMastered = progress.masteryLevel >= MASTERY_LEVELS.MASTERED

    detailsByWord.set(progress.word, {
      word: progress.word,
      timeStamp: progress.lastReviewTime,
      wrongCount: progress.wrongCount,
      type: isMastered ? 'mastered' : isNew ? 'new' : 'review',
    })
  }

  return Array.from(detailsByWord.values()).sort((a, b) => a.word.localeCompare(b.word))
}

function hasActivity(record: AnalysisDailyRecord): boolean {
  return (record.learnedCount || 0) > 0 || (record.reviewedCount || 0) > 0 || (record.masteredCount || 0) > 0
}

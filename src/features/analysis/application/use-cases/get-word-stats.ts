import type { AnalysisRepository } from '../ports'
import type { WordStats } from '../../domain/word-stats'
import { buildWordStats } from '../../domain/word-stats'
import dayjs from 'dayjs'

/**
 * 获取指定时间范围内的单词统计
 */
export async function getWordStats(repository: AnalysisRepository, dictId: string, startTime: number, endTime: number): Promise<WordStats> {
  const dailyRecords = await repository.getDailyRecordsByDict(dictId)

  // 过滤时间范围内的记录
  const startDate = dayjs(startTime).format('YYYY-MM-DD')
  const endDate = dayjs(endTime).format('YYYY-MM-DD')
  const filteredRecords = dailyRecords.filter((record) => record.date >= startDate && record.date <= endDate)

  return buildWordStats(filteredRecords, startTime, endTime)
}
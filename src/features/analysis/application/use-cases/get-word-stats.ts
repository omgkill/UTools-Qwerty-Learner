import type { AnalysisRepository } from '../ports'
import type { WordStats } from '../../domain/word-stats'
import { buildWordStats } from '../../domain/word-stats'

/**
 * 获取指定时间范围内的单词统计
 */
export async function getWordStats(
  repository: AnalysisRepository,
  startTime: number,
  endTime: number,
): Promise<WordStats> {
  const records = await repository.getWordRecordsByTimeRange(startTime, endTime)
  return buildWordStats(records, startTime, endTime)
}
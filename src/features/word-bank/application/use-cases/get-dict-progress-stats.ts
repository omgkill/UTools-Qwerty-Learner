import type { DailyRecordRepository, WordProgressRepository } from '@/features/typing/application/ports'
import { LEARNING_CONFIG } from '@/features/typing/domain'
import { getTodayDate } from '@/utils/db/progress'

export interface DictProgressStats {
  learnedWords: number
  masteredWords: number
  dueWords: number
  pendingLearnWords: number
  totalProgress: number
}

export type GetDictProgressStatsOptions = {
  dailyRecordRepository?: DailyRecordRepository
  wordCount?: number
}

/**
 * 获取词库学习进度统计
 */
export async function getDictProgressStats(
  wordProgressRepository: WordProgressRepository,
  dictId: string,
  options: GetDictProgressStatsOptions = {},
): Promise<DictProgressStats> {
  const [stats, dailyRecord] = await Promise.all([
    wordProgressRepository.getStats(dictId),
    options.dailyRecordRepository?.getRecord(dictId, getTodayDate()),
  ])

  const learnedWords = stats.new + stats.learning + stats.mastered
  const masteredWords = stats.mastered
  const dueWords = stats.due
  const learnedOrMasteredWords = stats.learning + stats.mastered
  const availableNewWords =
    typeof options.wordCount === 'number'
      ? Math.max(0, options.wordCount - learnedOrMasteredWords)
      : stats.new
  const pendingLearnWords = calculatePendingLearnWords({
    dueWords,
    availableNewWords,
    reviewedCount: dailyRecord?.reviewedCount ?? 0,
    learnedCount: dailyRecord?.learnedCount ?? 0,
  })
  const totalProgress = stats.total > 0 ? Math.round((masteredWords / stats.total) * 100) : 0

  return {
    learnedWords,
    masteredWords,
    dueWords,
    pendingLearnWords,
    totalProgress,
  }
}

export function calculatePendingLearnWords(params: {
  dueWords: number
  availableNewWords: number
  reviewedCount: number
  learnedCount: number
  dailyLimit?: number
}): number {
  const dailyLimit = params.dailyLimit ?? LEARNING_CONFIG.DAILY_LIMIT
  const remaining = Math.max(0, dailyLimit - params.reviewedCount - params.learnedCount)
  const reviewWords = Math.min(params.dueWords, remaining)
  const newWords = Math.min(params.availableNewWords, Math.max(0, remaining - reviewWords))

  return reviewWords + newWords
}

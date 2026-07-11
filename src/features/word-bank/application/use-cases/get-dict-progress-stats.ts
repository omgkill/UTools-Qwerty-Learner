import type { WordProgressRepository } from '@/features/typing/application/ports'

export interface DictProgressStats {
  learnedWords: number
  masteredWords: number
  dueWords: number
  totalProgress: number
}

/**
 * 获取词库学习进度统计
 */
export async function getDictProgressStats(
  wordProgressRepository: WordProgressRepository,
  dictId: string,
): Promise<DictProgressStats> {
  const stats = await wordProgressRepository.getStats(dictId)

  const learnedWords = stats.new + stats.learning + stats.mastered
  const masteredWords = stats.mastered
  const dueWords = stats.due
  const totalProgress = stats.total > 0 ? Math.round((masteredWords / stats.total) * 100) : 0

  return {
    learnedWords,
    masteredWords,
    dueWords,
    totalProgress,
  }
}
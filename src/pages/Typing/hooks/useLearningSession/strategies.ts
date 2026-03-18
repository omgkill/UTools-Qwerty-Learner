import { getAllProgress, getDueWords, getNewWords, getProgressStats, getTodayWords } from '@/utils/storage'
import { getTodayRecord } from '@/utils/storage'
import type { LearningStats, WordSourceStrategy } from '@/types'

/** 空的学习统计数据 */
export const EMPTY_STATS: LearningStats = {
  todayLearned: 0,
  todayReviewed: 0,
  todayMastered: 0,
  dueCount: 0,
  newCount: 0,
  masteredCount: 0,
}

export const normalStrategy: WordSourceStrategy = {
  getWordNames(dictId: string, wordList: string[]): string[] {
    const dueWords = getDueWords(dictId, wordList, 20)
    if (dueWords.length > 0) {
      return dueWords
    }
    return getNewWords(dictId, wordList, 20)
  },

  getStats(dictId: string, wordList: string[]): LearningStats {
    const stats = getProgressStats(dictId)
    const dailyRecord = getTodayRecord(dictId)
    return {
      todayLearned: dailyRecord?.learnedCount ?? 0,
      todayReviewed: dailyRecord?.reviewedCount ?? 0,
      todayMastered: dailyRecord?.masteredCount ?? 0,
      dueCount: stats.due,
      newCount: wordList.length - stats.learned,
      masteredCount: stats.mastered,
    }
  },

  needsSessionPersist: false,
}

export const repeatStrategy: WordSourceStrategy = {
  getWordNames(dictId: string): string[] {
    return getTodayWords(dictId)
  },

  getStats(): LearningStats {
    return EMPTY_STATS
  },

  needsSessionPersist: true,
}

export const consolidateStrategy: WordSourceStrategy = {
  getWordNames(dictId: string): string[] {
    const allProgress = getAllProgress(dictId)
    return allProgress
      .filter((p) => p.masteryLevel > 0 && p.masteryLevel < 7)
      .map((p) => p.word)
  },

  getStats(): LearningStats {
    return EMPTY_STATS
  },

  needsSessionPersist: true,
}

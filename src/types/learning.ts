/**
 * 掌握等级类型
 * 0: 新词（未学习）
 * 1: 初学（刚完成第一次）
 * 2: 熟悉
 * 3: 认识
 * 4: 熟练
 * 5: 精通
 * 6: 专家
 * 7: 已掌握（永不复习）
 */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * 单词学习进度
 */
export interface WordProgress {
  word: string
  dictId: string
  masteryLevel: MasteryLevel
  nextReviewTime: number // 时间戳
}

/**
 * 单词学习类型
 */
export type WordLearnType = 'new' | 'review'

/**
 * 每日学习记录
 */
export interface DailyRecord {
  dictId: string
  date: string // YYYY-MM-DD 格式
  learnedCount: number // 今日新学数量
  reviewedCount: number // 今日复习数量
  masteredCount: number // 今日掌握数量（达到 masteryLevel=7）
  todayWords: string[] // 今日学习的单词列表
  wordTypes: Record<string, WordLearnType> // 每个单词的学习类型
}

/**
 * 学习统计
 */
export interface LearningStats {
  todayLearned: number
  todayReviewed: number
  todayMastered: number
  dueCount: number // 待复习数量
  newCount: number // 未学习数量
  masteredCount: number // 已掌握数量
}

/**
 * 学习类型
 */
export type LearningType = 'new' | 'review' | 'complete'

/**
 * 获取今日单词的结果
 */
export interface TodayWordsResult {
  words: string[]
  learningType: LearningType
  stats: LearningStats
}

/**
 * 完成单词后的结果
 */
export interface CompleteWordResult {
  progress: WordProgress
  dailyRecord: DailyRecord
  sessionComplete: boolean
  nextWord?: string
}

/**
 * 复习间隔配置（天数）
 */
export const REVIEW_INTERVALS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 15,
  6: 30,
  7: 0, // 已掌握，永不复习
}
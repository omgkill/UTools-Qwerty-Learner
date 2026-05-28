import type { IProgressRepository } from '../repositories/interfaces/IProgressRepository'
import type { IDailyRecordRepository } from '../repositories/interfaces/IDailyRecordRepository'
import type { WordProgress, MasteryLevel, TodayWordsResult, LearningStats, CompleteWordResult, DailyRecord } from '../types/learning'

const REVIEW_INTERVALS_MAP: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 15,
  6: 30,
  7: 0,
}

/**
 * 获取今日开始时间戳（当天 00:00:00）
 */
function getTodayStartTime(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

/**
 * 学习服务 - 核心业务逻辑
 */
export class LearningService {
  private progressRepo: IProgressRepository
  private dailyRecordRepo: IDailyRecordRepository

  constructor(progressRepo: IProgressRepository, dailyRecordRepo: IDailyRecordRepository) {
    this.progressRepo = progressRepo
    this.dailyRecordRepo = dailyRecordRepo
  }

  /**
   * 获取今日学习单词列表
   *
   * 逻辑：
   * 1. 获取今日已学数量
   * 2. 计算剩余配额 = 上限 - 已学
   * 3. 先获取到期词（不超过剩余配额）
   * 4. 剩余配额给新词
   */
  getTodayWords(dictId: string, wordList: string[], dailyLimit: number): TodayWordsResult {
    // 步骤 1：获取今日已学数量
    const todayRecord = this.dailyRecordRepo.getToday(dictId)
    const todayTotal = todayRecord.learnedCount + todayRecord.reviewedCount

    // 步骤 2：计算剩余配额
    const remainingQuota = Math.max(0, dailyLimit - todayTotal)
    if (remainingQuota === 0) {
      return {
        words: [],
        learningType: 'complete',
        stats: this.getStats(dictId, wordList),
      }
    }

    // 步骤 3：获取到期词
    const dueWords = this.getDueWords(dictId, wordList, remainingQuota)

    // 步骤 4：获取新词（如果有剩余配额）
    let newWords: string[] = []
    if (dueWords.length < remainingQuota) {
      const newQuota = remainingQuota - dueWords.length
      newWords = this.getNewWords(dictId, wordList, newQuota)
    }

    // 步骤 5：合并返回
    const words = [...dueWords, ...newWords]
    const learningType = dueWords.length > 0 ? 'review' : (newWords.length > 0 ? 'new' : 'complete')

    return {
      words,
      learningType,
      stats: this.getStats(dictId, wordList),
    }
  }

  /**
   * 完成一个单词的处理
   *
   * 逻辑：
   * 1. 升级掌握等级
   * 2. 设置下次复习时间
   * 3. 更新今日记录
   * 4. 判断是否需要补充新词
   */
  completeWord(
    dictId: string,
    word: string,
    wordList: string[],
    dailyLimit: number,
    currentWordList: string[]
  ): CompleteWordResult {
    // 步骤 1：升级掌握等级
    const progress = this.upgradeLevel(dictId, word)

    // 步骤 2：更新今日记录
    const wasNew = progress.masteryLevel === 1 // 升级后为 1 表示刚从 0 升上来
    const todayRecord = this.updateTodayRecord(dictId, word, wasNew)

    // 步骤 3：判断是否完成
    const todayTotal = todayRecord.learnedCount + todayRecord.reviewedCount
    const sessionComplete = todayTotal >= dailyLimit

    // 步骤 4：获取下一个单词
    let nextWord: string | undefined
    if (!sessionComplete) {
      // 从当前列表中找下一个
      const currentIndex = currentWordList.indexOf(word)
      if (currentIndex >= 0 && currentIndex < currentWordList.length - 1) {
        nextWord = currentWordList[currentIndex + 1]
      } else {
        // 需要补充新词
        const remaining = dailyLimit - todayTotal
        const moreWords = this.getNewWords(dictId, wordList, remaining)
        nextWord = moreWords[0]
      }
    }

    return {
      progress,
      dailyRecord: todayRecord,
      sessionComplete,
      nextWord,
    }
  }

  /**
   * 获取学习统计
   */
  getStats(dictId: string, wordList: string[]): LearningStats {
    const todayRecord = this.dailyRecordRepo.getToday(dictId)
    const allProgress = this.progressRepo.getAll(dictId)
    const now = Date.now()

    let learnedCount = 0
    let masteredCount = 0
    let dueCount = 0

    for (const p of allProgress) {
      if (p.masteryLevel > 0) learnedCount++
      if (p.masteryLevel === 7) masteredCount++
      if (p.masteryLevel > 0 && p.masteryLevel < 7 && p.nextReviewTime <= now) dueCount++
    }

    const newCount = wordList.length - learnedCount

    return {
      todayLearned: todayRecord.learnedCount,
      todayReviewed: todayRecord.reviewedCount,
      todayMastered: todayRecord.masteredCount,
      dueCount,
      newCount,
      masteredCount,
    }
  }

  /**
   * 获取到期单词
   *
   * 条件：masteryLevel > 0 且 < 7 且 nextReviewTime <= 当前时间
   */
  private getDueWords(dictId: string, wordList: string[], limit: number): string[] {
    const now = Date.now()
    const dueWords: string[] = []

    for (const word of wordList) {
      if (dueWords.length >= limit) break

      const progress = this.progressRepo.get(dictId, word)
      if (progress && progress.masteryLevel > 0 && progress.masteryLevel < 7) {
        if (progress.nextReviewTime <= now) {
          dueWords.push(word)
        }
      }
    }

    return dueWords
  }

  /**
   * 获取新单词
   *
   * 条件：没有进度记录 或 masteryLevel === 0
   */
  private getNewWords(dictId: string, wordList: string[], limit: number): string[] {
    const newWords: string[] = []

    for (const word of wordList) {
      if (newWords.length >= limit) break

      const progress = this.progressRepo.get(dictId, word)
      if (!progress || progress.masteryLevel === 0) {
        newWords.push(word)
      }
    }

    return newWords
  }

  /**
   * 升级掌握等级
   */
  private upgradeLevel(dictId: string, word: string): WordProgress {
    const existing = this.progressRepo.get(dictId, word)
    const currentLevel = existing?.masteryLevel || 0
    const newLevel = Math.min(currentLevel + 1, 7) as MasteryLevel

    const nextReviewTime = this.calculateNextReviewTime(newLevel)

    const progress: WordProgress = {
      word,
      dictId,
      masteryLevel: newLevel,
      nextReviewTime,
    }

    this.progressRepo.set(dictId, word, progress)
    return progress
  }

  /**
   * 计算下次复习时间
   */
  private calculateNextReviewTime(level: MasteryLevel): number {
    const days = REVIEW_INTERVALS_MAP[level] || 0
    if (days === 0) return 0
    return getTodayStartTime() + days * 24 * 60 * 60 * 1000
  }

  /**
   * 更新今日记录
   */
  private updateTodayRecord(dictId: string, word: string, wasNew: boolean): DailyRecord {
    const record = this.dailyRecordRepo.getToday(dictId)

    // 添加单词到今日列表（如果不存在）
    if (!record.todayWords.includes(word)) {
      record.todayWords.push(word)
    }

    // 记录学习类型
    record.wordTypes[word] = wasNew ? 'new' : 'review'

    // 更新计数
    if (wasNew) {
      record.learnedCount++
    } else {
      record.reviewedCount++
    }

    // 判断是否达到掌握
    const progress = this.progressRepo.get(dictId, word)
    if (progress && progress.masteryLevel === 7) {
      record.masteredCount++
    }

    this.dailyRecordRepo.set(record.dictId, record.date, record)
    return record
  }
}
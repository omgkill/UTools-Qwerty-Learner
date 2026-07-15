import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService } from '@/services'
import { completeCurrentWord, startTypingSession } from '.'
import { setDailyLimit } from '../../domain'
import { advanceDays, now as getNow, resetTimeDiff, setTimeTo } from '@/utils/timeService'
import 'fake-indexeddb/auto'

type LevelName = 'NEW' | 'LEARNED' | 'FAMILIAR' | 'KNOWN' | 'PROFICIENT' | 'ADVANCED' | 'EXPERT' | 'MASTERED'

const createWordList = (count: number): Word[] => {
  const words: Word[] = []
  for (let i = 1; i <= count; i++) {
    words.push({
      name: `word${i}`,
      trans: ['n. 测试'],
      usphone: '',
      ukphone: '',
      tense: '',
    })
  }
  return words
}

describe('100个单词30天真实流程模拟', () => {
  const dictId = 'test-dict-real-flow'
  const TOTAL_WORDS = 100
  const DAILY_LIMIT = 20

  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    resetTimeDiff()
    setTimeTo('2026-07-15T09:00:00.000Z')
    setDailyLimit(DAILY_LIMIT)
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    resetTimeDiff()
    setDailyLimit(DAILY_LIMIT)
  })

  it('调用真实Repository和Application层，模拟100个单词30天的完整学习流程', async () => {
    const log = (msg: string) => console.error(msg)

    // 创建100个单词
    const wordList = createWordList(TOTAL_WORDS)

    // 初始化所有单词的进度
    await wordProgressService.initProgressBatch(dictId, wordList.map((w) => w.name))

    // 统计数据
    const stats: Array<{
      day: number
      dueCount: number
      newCount: number
      learnedWords: number
      learnedCount: number
      reviewedCount: number
      learningType: string
      description: string
      newWordsList: string[]
      reviewWordsList: string[]
    }> = []

    log('\n========== 100个单词 × 30天真实流程模拟 ==========\n')
    log('使用真实的Repository、Application层和IndexedDB')
    log('规则：每天最多学习20个（复习优先，剩余配额学新词）')
    log('间隔：1天→2天→4天→7天→15天→21天→30天（最小间隔，实际可能延迟）')
    log('延迟累积：基于实际复习时间计算下次到期\n')

    for (let day = 1; day <= 30; day++) {
      log(`========== Day ${day} ==========`)
      const currentDay = new Date(getNow()).toISOString().split('T')[0]
      log(`时间: ${currentDay}`)

      const dailyWordList = shuffleWithSeed(wordList, `100-words-30-days-${day}`)

      let session = await startTypingSession({
        dictId,
        wordList: dailyWordList,
        wordProgressRepository: wordProgressService,
        dailyRecordRepository: dailyRecordService,
      })
      const initialDueCount = session.dueCount
      const initialNewCount = session.newCount
      const initialLearningType = session.learningType
      const initialQueueWords = session.queueWords
      const reviewWordsList = initialQueueWords.filter((entry) => entry.kind === 'review').map((entry) => entry.word.name)
      const newWordsList = initialQueueWords.filter((entry) => entry.kind === 'new' || entry.kind === 'replacement').map((entry) => entry.word.name)

      log(`到期单词数: ${initialDueCount}`)
      log(`新单词数: ${initialNewCount}`)
      log(`学习类型: ${initialLearningType}`)
      log(`计划学习: ${initialQueueWords.length}个单词`)
      log(`  学习列表（前10个）: ${initialQueueWords.slice(0, 10).map((entry) => entry.word.name).join(', ')}${initialQueueWords.length > 10 ? '...' : ''}`)
      log(`  复习词: ${formatWordList(reviewWordsList)}`)
      log(`  新词: ${formatWordList(newWordsList)}`)

      while (!session.isFinished) {
        const result = await completeCurrentWord({
          session,
          wordList: dailyWordList,
          isCorrect: true,
          wrongCount: 0,
          wordProgressRepository: wordProgressService,
          dailyRecordRepository: dailyRecordService,
        })
        session = result.session
      }

      const record = await dailyRecordService.getTodayRecord(dictId)
      const learnedWords = record.learnedCount + record.reviewedCount

      // 统计
      let description = ''
      if (learnedWords === 0) {
        description = '无单词到期，无新词可学'
      }
      else if (record.reviewedCount > 0 && record.learnedCount > 0) {
        description = `复习${record.reviewedCount}个 + 新词${record.learnedCount}个`
      }
      else if (record.reviewedCount > 0) {
        if (initialDueCount > DAILY_LIMIT) {
          description = `复习前20个（剩余${initialDueCount - DAILY_LIMIT}个排队）`
        }
        else {
          description = `复习${record.reviewedCount}个`
        }
      }
      else {
        description = `学习${record.learnedCount}个新词`
      }

      stats.push({
        day,
        dueCount: initialDueCount,
        newCount: initialNewCount,
        learnedWords,
        learnedCount: record.learnedCount,
        reviewedCount: record.reviewedCount,
        learningType: initialLearningType,
        description,
        newWordsList,
        reviewWordsList,
      })

      log('')
      // 前进到下一天
      advanceDays(1)
    }

    // 打印30天总结表格
    log('\n========== 30天学习总结表格 ==========\n')
    log('| 天数 | 到期单词 | 新单词 | 实际学习 | 学习类型 | 说明 |')
    log('|------|----------|--------|----------|----------|------|')

    stats.forEach((s) => {
      log(`| Day ${s.day} | ${s.dueCount}个 | ${s.newCount}个 | ${s.learnedWords}个 | ${s.learningType} | ${s.description} |`)
    })

    log('\n========== 30天学习明细 ==========\n')
    log('| 天数 | 复习词 | 新词 |')
    log('|------|--------|------|')
    stats.forEach((s) => {
      log(`| Day ${s.day} | ${formatWordList(s.reviewWordsList)} | ${formatWordList(s.newWordsList)} |`)
    })

    // 统计最终级别分布
    log('\n========== 最终单词级别分布 ==========\n')
    const allProgress = await wordProgressService.getAllProgress(dictId)

    const levelDistribution: Record<LevelName, number> = {
      NEW: 0,
      LEARNED: 0,
      FAMILIAR: 0,
      KNOWN: 0,
      PROFICIENT: 0,
      ADVANCED: 0,
      EXPERT: 0,
      MASTERED: 0,
    }

    allProgress.forEach((p) => {
      const levelNames: LevelName[] = ['NEW', 'LEARNED', 'FAMILIAR', 'KNOWN', 'PROFICIENT', 'ADVANCED', 'EXPERT', 'MASTERED']
      const levelName = levelNames[p.masteryLevel] || 'NEW'
      levelDistribution[levelName]++
    })

    const unlearnedCount = TOTAL_WORDS - allProgress.length
    levelDistribution.NEW = unlearnedCount

    log('| 级别 | 单词数 | 说明 |')
    log('|------|--------|------|')
    Object.entries(levelDistribution).forEach(([level, count]) => {
      const levelDescriptions: Record<LevelName, string> = {
        NEW: '未学习',
        LEARNED: '学习1次（下次1天后）',
        FAMILIAR: '学习2次（下次2天后）',
        KNOWN: '学习3次（下次4天后）',
        PROFICIENT: '学习4次（下次7天后）',
        ADVANCED: '学习5次（下次15天后）',
        EXPERT: '学习6次（下次21天后）',
        MASTERED: '已掌握（下次30天后）',
      }
      log(`| ${level} | ${count}个 | ${levelDescriptions[level as LevelName]} |`)
    })

    log(`\n总学习单词数: ${allProgress.length}个`)
    log(`未学习单词数: ${unlearnedCount}个`)

    // 验证每日学习不超过20个
    stats.forEach((s) => {
      expect(s.learnedWords).toBeLessThanOrEqual(DAILY_LIMIT)
      expect(s.learnedCount + s.reviewedCount).toBe(s.learnedWords)
    })

    // 验证所有100个单词都被学习过
    expect(allProgress.length).toBe(TOTAL_WORDS)

    const totalLearnedDays = stats.filter((s) => s.learnedWords > 0).length
    log(`\n有效学习天数: ${totalLearnedDays}天`)
    log(`休息天数（无单词到期且无新词）: ${stats.filter((s) => s.learnedWords === 0).length}天`)
  })
})

// 辅助函数：根据级别获取间隔天数
function getInterval(level: number): number {
  const intervals = [0, 1, 2, 4, 7, 15, 21, 30]
  return intervals[level] || 0
}

function formatWordList(words: string[]): string {
  return words.length > 0 ? words.join(', ') : '-'
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array]
  const random = createSeededRandom(seed)

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const value = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = value
  }

  return result
}

function createSeededRandom(seed: string): () => number {
  let state = 0
  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(index)) | 0
  }

  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

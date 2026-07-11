import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, loadTypingSession } from '@/services'
import { now as getNow, advanceDays } from '@/utils/timeService'
import 'fake-indexeddb/auto'

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
  const DAY_MS = 24 * 60 * 60 * 1000

  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
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
      learningType: string
      description: string
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

      // 获取今日记录
      const record = await dailyRecordService.getTodayRecord(dictId)

      // 调用真实的 loadTypingSession (Application层)
      const session = await loadTypingSession({
        wordList,
        reviewedCount: record.reviewedCount,
        learnedCount: record.learnedCount,
        getAllProgress: () => wordProgressService.getAllProgress(dictId),
        getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
      })

      log(`到期单词数: ${session.dueCount}`)
      log(`新单词数: ${session.newCount}`)
      log(`学习类型: ${session.learningType}`)
      log(`实际学习: ${session.learningWords.length}个单词`)
      log(`  学习列表（前10个）: ${session.learningWords.slice(0, 10).map((w) => w.name).join(', ')}${session.learningWords.length > 10 ? '...' : ''}`)

      // 模拟学习所有单词（假设全部答对）
      for (const word of session.learningWords) {
        // 使用真实的 updateProgress 方法（参数：isCorrect=true, wrongCount=0）
        await wordProgressService.updateProgress(dictId, word.name, true, 0)

        // 注意：在真实应用中，学习完成后会自动更新今日记录
        // 这里为了测试简化，跳过dailyRecordService的更新
      }

      // 统计
      let description = ''
      if (session.learningWords.length === 0) {
        description = '无单词到期，无新词可学'
      }
      else if (session.dueCount > 0 && session.dueCount <= DAILY_LIMIT) {
        if (session.newCount > 0 && session.dueCount < DAILY_LIMIT) {
          const newWordCount = session.learningWords.length - session.dueCount
          description = `复习${session.dueCount}个 + 新词${newWordCount}个`
        }
        else {
          description = `复习${session.dueCount}个`
        }
      }
      else if (session.dueCount > DAILY_LIMIT) {
        description = `复习前20个（剩余${session.dueCount - DAILY_LIMIT}个排队）`
      }
      else {
        description = `学习${session.learningWords.length}个新词`
      }

      stats.push({
        day,
        dueCount: session.dueCount,
        newCount: session.newCount,
        learnedWords: session.learningWords.length,
        learningType: session.learningType,
        description,
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

    // 统计最终级别分布
    log('\n========== 最终单词级别分布 ==========\n')
    const allProgress = await wordProgressService.getAllProgress(dictId)

    const levelDistribution = {
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
      const levelNames = ['NEW', 'LEARNED', 'FAMILIAR', 'KNOWN', 'PROFICIENT', 'ADVANCED', 'EXPERT', 'MASTERED']
      const levelName = levelNames[p.masteryLevel] || 'NEW'
      levelDistribution[levelName]++
    })

    const unlearnedCount = TOTAL_WORDS - allProgress.length
    levelDistribution.NEW = unlearnedCount

    log('| 级别 | 单词数 | 说明 |')
    log('|------|--------|------|')
    Object.entries(levelDistribution).forEach(([level, count]) => {
      const levelDescriptions = {
        NEW: '未学习',
        LEARNED: '学习1次（下次1天后）',
        FAMILIAR: '学习2次（下次2天后）',
        KNOWN: '学习3次（下次4天后）',
        PROFICIENT: '学习4次（下次7天后）',
        ADVANCED: '学习5次（下次15天后）',
        EXPERT: '学习6次（下次21天后）',
        MASTERED: '已掌握（下次30天后）',
      }
      log(`| ${level} | ${count}个 | ${levelDescriptions[level]} |`)
    })

    log(`\n总学习单词数: ${allProgress.length}个`)
    log(`未学习单词数: ${unlearnedCount}个`)

    // 验证每日学习不超过20个
    stats.forEach((s) => {
      expect(s.learnedWords).toBeLessThanOrEqual(DAILY_LIMIT)
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { WordProgressService, loadTypingSession } from '@/services'
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

describe('调试 nextReviewTime 问题', () => {
  const dictId = 'test-dict-debug'
  const DAY_MS = 24 * 60 * 60 * 1000

  let wordProgressService: WordProgressService

  beforeEach(async () => {
    await db.wordProgress.clear()
    wordProgressService = new WordProgressService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
  })

  it('调试loadTypingSession中的到期判断', async () => {
    const log = (msg: string) => console.error(msg)

    const wordList = createWordList(10)
    await wordProgressService.initProgressBatch(dictId, wordList.map((w) => w.name))

    log('\n========== 调试 loadTypingSession 到期判断 ==========\n')

    // Day 1: 学习word1
    log('========== Day 1: 学习word1 ==========')
    const day1Time = getNow()
    log(`当前时间: ${day1Time}`)
    log(`时间戳: ${new Date(day1Time).toISOString()}`)

    await wordProgressService.updateProgress(dictId, 'word1', true, 0)

    const progress = await wordProgressService.getProgress(dictId, 'word1')
    log(`\n学习后进度: ${JSON.stringify(progress, null, 2)}`)

    // 前进到Day 2
    log('\n========== 前进到 Day 2 ==========')
    advanceDays(1)
    const day2Time = getNow()
    log(`Day 2时间: ${day2Time}`)
    log(`时间戳: ${new Date(day2Time).toISOString()}`)

    // 使用loadTypingSession检查
    log('\n使用 loadTypingSession 检查到期单词')
    const session = await loadTypingSession({
      wordList,
      reviewedCount: 0,
      learnedCount: 0,
      getAllProgress: () => wordProgressService.getAllProgress(dictId),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    log(`到期单词数: ${session.dueCount}`)
    log(`学习类型: ${session.learningType}`)
    log(`学习单词数: ${session.learningWords.length}`)

    // 手动检查
    log('\n手动检查到期条件')
    const word1Progress = await wordProgressService.getProgress(dictId, 'word1')
    log(`word1.nextReviewTime: ${word1Progress?.nextReviewTime}`)
    log(`word1.reps: ${word1Progress?.reps}`)
    log(`word1.masteryLevel: ${word1Progress?.masteryLevel}`)
    log(`当前时间: ${day2Time}`)
    log(`是否到期: ${word1Progress?.nextReviewTime} <= ${day2Time} = ${(word1Progress?.nextReviewTime || 0) <= day2Time}`)
    log(`reps > 0: ${word1Progress?.reps} > 0 = ${(word1Progress?.reps || 0) > 0}`)
    log(`masteryLevel < 7: ${word1Progress?.masteryLevel} < 7 = ${(word1Progress?.masteryLevel || 0) < 7}`)

    // 验证
    expect(session.dueCount).toBe(1)
    // 当日配额是20，有1个到期词，剩余配额19个，可以学习9个新词（总共10个）
    expect(session.learningWords.length).toBe(10)
    expect(word1Progress?.masteryLevel).toBe(1)
    expect(word1Progress?.reps).toBe(1)
  })
})
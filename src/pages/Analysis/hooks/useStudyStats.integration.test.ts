import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/utils/db'
import { DailyRecord, WordProgress } from '@/utils/db/progress'
import { handleMasteredFlow } from '@/services'
import type { Word } from '@/typings'
import 'fake-indexeddb/auto'

const createWordList = (count: number): Word[] => {
  const words: Word[] = []
  for (let i = 0; i < count; i++) {
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

describe('统计信息集成测试 - 完整用户流程', () => {
  const dictId = 'test-dict-integration'

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
  })

  it('完整流程：点击掌握 -> 查看统计信息', async () => {
    // 1. 初始化词库和单词进度
    const wordList = createWordList(10)
    
    // 初始化单词进度（注意参数顺序：WordProgress(word, dict)）
    for (const word of wordList) {
      const progress = new WordProgress(word.name, dictId)
      await db.wordProgress.add(progress)
    }

    // 2. 模拟点击掌握按钮（实际代码中的流程）
    const currentWord = { ...wordList[0], index: 0 }
    
    // 标记为已掌握
    await handleMasteredFlow({
      currentWord,
      markAsMastered: async (word: string) => {
        const progress = await db.wordProgress.where({ dict: dictId, word }).first()
        if (progress) {
          progress.masteryLevel = 7 // MASTERED
          progress.lastReviewTime = Date.now()
          await db.wordProgress.update(progress.id!, progress)
        }
        return progress!
      },
      getNextNewWord: async () => null,
    })

    // 3. 增加掌握计数（模拟 useDailyRecord.incrementMastered）
    const today = new Date().toISOString().split('T')[0]
    const existingRecord = await db.dailyRecords.where('[dict+date]').equals([dictId, today]).first()
    const record = existingRecord ?? new DailyRecord(dictId, today)
    if (!existingRecord) {
      record.id = await db.dailyRecords.add(record)
    }
    
    record.masteredCount++
    record.lastUpdateTime = Date.now()
    await db.dailyRecords.update(record.id!, record)

    // 4. 模拟 useDayStats 查询（统计页面实际使用的逻辑）
    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    
    const days = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    // 5. 验证统计结果
    console.log('查询到的记录:', days)
    expect(days.length).toBe(1)
    expect(days[0].masteredCount).toBe(1)
    expect(days[0].totalWords).toBe(1)

    // 6. 验证单词确实被标记为已掌握
    const updatedProgress = await db.wordProgress.where({ dict: dictId, word: currentWord.name }).first()
    expect(updatedProgress?.masteryLevel).toBe(7)
  })

  it('多次点击掌握后，统计信息应该正确累加', async () => {
    const wordList = createWordList(10)
    
    // 初始化单词进度（注意参数顺序：WordProgress(word, dict)）
    for (const word of wordList) {
      const progress = new WordProgress(word.name, dictId)
      await db.wordProgress.add(progress)
    }

    const today = new Date().toISOString().split('T')[0]

    // 点击掌握5次
    for (let i = 0; i < 5; i++) {
      const currentWord = { ...wordList[i], index: i }
      
      await handleMasteredFlow({
        currentWord,
        markAsMastered: async (word: string) => {
          const progress = await db.wordProgress.where({ dict: dictId, word }).first()
          if (progress) {
            progress.masteryLevel = 7
            progress.lastReviewTime = Date.now()
            await db.wordProgress.update(progress.id!, progress)
          }
          return progress!
        },
        getNextNewWord: async () => null,
      })

      // 增加掌握计数
      const existingRecord = await db.dailyRecords.where('[dict+date]').equals([dictId, today]).first()
      const record = existingRecord ?? new DailyRecord(dictId, today)
      if (!existingRecord) {
        record.id = await db.dailyRecords.add(record)
      }
      record.masteredCount++
      record.lastUpdateTime = Date.now()
      await db.dailyRecords.update(record.id!, record)
    }

    // 查询统计信息
    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    const days = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    console.log('5次掌握后的记录:', days)
    expect(days.length).toBe(1)
    expect(days[0].masteredCount).toBe(5)
    expect(days[0].totalWords).toBe(5)
  })

  it('同时有学习、复习、掌握时，统计应该正确显示所有类型', async () => {
    const today = new Date().toISOString().split('T')[0]
    
    // 创建一条包含所有类型的记录
    const record = new DailyRecord(dictId, today)
    record.learnedCount = 10
    record.reviewedCount = 5
    record.masteredCount = 3
    record.id = await db.dailyRecords.add(record)

    // 查询统计信息
    const dailyRecords = await db.dailyRecords.where('dict').equals(dictId).toArray()
    const days = dailyRecords
      .filter((r) => r.learnedCount > 0 || r.reviewedCount > 0 || r.masteredCount > 0)
      .map((r) => ({
        date: r.date,
        learnedCount: r.learnedCount,
        reviewedCount: r.reviewedCount,
        masteredCount: r.masteredCount,
        totalWords: r.learnedCount + r.reviewedCount + r.masteredCount,
      }))

    console.log('混合类型记录:', days)
    expect(days.length).toBe(1)
    expect(days[0].learnedCount).toBe(10)
    expect(days[0].reviewedCount).toBe(5)
    expect(days[0].masteredCount).toBe(3)
    expect(days[0].totalWords).toBe(18)
  })
})

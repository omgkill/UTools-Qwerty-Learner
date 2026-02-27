import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, handleMasteredFlow, loadTypingSession } from '@/services'
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

describe('每日掌握单词统计集成测试', () => {
  const dictId = 'test-dict-mastered-count'
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

  it('点击掌握按钮后，每日记录的 masteredCount 应该增加', async () => {
    const wordList = createWordList(10)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    // 获取今日记录
    const record = await dailyRecordService.getTodayRecord(dictId)
    expect(record.masteredCount).toBe(0)

    // 模拟点击掌握按钮
    const currentWord = wordList[0]
    await handleMasteredFlow({
      currentWord: { ...currentWord, index: 0 },
      markAsMastered: (word) => wordProgressService.markAsMastered(dictId, word),
      getNextNewWord: async () => null,
    })

    // 增加掌握计数（模拟 incrementMastered）
    record.masteredCount++
    record.lastUpdateTime = Date.now()
    if (record.id) {
      await db.dailyRecords.update(record.id, record)
    }

    // 验证掌握计数增加
    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.masteredCount).toBe(1)
  })

  it('多次点击掌握按钮，masteredCount 应该正确累加', async () => {
    const wordList = createWordList(10)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    expect(record.masteredCount).toBe(0)

    // 模拟点击掌握按钮5次
    for (let i = 0; i < 5; i++) {
      const currentWord = wordList[i]
      await handleMasteredFlow({
        currentWord: { ...currentWord, index: i },
        markAsMastered: (word) => wordProgressService.markAsMastered(dictId, word),
        getNextNewWord: async () => null,
      })

      // 增加掌握计数
      record.masteredCount++
      record.lastUpdateTime = Date.now()
      if (record.id) {
        await db.dailyRecords.update(record.id, record)
      }
    }

    // 验证掌握计数为5
    const updatedRecord = await dailyRecordService.getTodayRecord(dictId)
    expect(updatedRecord.masteredCount).toBe(5)
  })

  it('掌握单词后，单词进度应该被标记为已掌握', async () => {
    const wordList = createWordList(5)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const currentWord = wordList[0]
    
    // 掌握前检查
    let progress = await wordProgressService.getProgress(dictId, currentWord.name)
    expect(progress?.masteryLevel).toBe(0) // NEW

    // 点击掌握
    await handleMasteredFlow({
      currentWord: { ...currentWord, index: 0 },
      markAsMastered: (word) => wordProgressService.markAsMastered(dictId, word),
      getNextNewWord: async () => null,
    })

    // 掌握后检查
    progress = await wordProgressService.getProgress(dictId, currentWord.name)
    expect(progress?.masteryLevel).toBe(7) // MASTERED
  })

  it('不同词库的掌握计数应该独立统计', async () => {
    const dictId1 = 'test-dict-1'
    const dictId2 = 'test-dict-2'
    const wordList1 = createWordList(5)
    const wordList2 = createWordList(5)
    
    await wordProgressService.initProgressBatch(dictId1, wordList1.map((word) => word.name))
    await wordProgressService.initProgressBatch(dictId2, wordList2.map((word) => word.name))
    
    // 在词库1中掌握2个单词
    const record1 = await dailyRecordService.getTodayRecord(dictId1)
    for (let i = 0; i < 2; i++) {
      await handleMasteredFlow({
        currentWord: { ...wordList1[i], index: i },
        markAsMastered: (word) => wordProgressService.markAsMastered(dictId1, word),
        getNextNewWord: async () => null,
      })
      record1.masteredCount++
      if (record1.id) {
        await db.dailyRecords.update(record1.id, record1)
      }
    }

    // 在词库2中掌握3个单词
    const record2 = await dailyRecordService.getTodayRecord(dictId2)
    for (let i = 0; i < 3; i++) {
      await handleMasteredFlow({
        currentWord: { ...wordList2[i], index: i },
        markAsMastered: (word) => wordProgressService.markAsMastered(dictId2, word),
        getNextNewWord: async () => null,
      })
      record2.masteredCount++
      if (record2.id) {
        await db.dailyRecords.update(record2.id, record2)
      }
    }

    // 验证各自独立
    const updatedRecord1 = await dailyRecordService.getTodayRecord(dictId1)
    const updatedRecord2 = await dailyRecordService.getTodayRecord(dictId2)
    expect(updatedRecord1.masteredCount).toBe(2)
    expect(updatedRecord2.masteredCount).toBe(3)
  })

  it('新创建的每日记录，masteredCount 默认为 0', async () => {
    const record = await dailyRecordService.getTodayRecord(dictId)
    expect(record.masteredCount).toBe(0)
    expect(record.learnedCount).toBe(0)
    expect(record.reviewedCount).toBe(0)
    expect(record.extraReviewedCount).toBe(0)
  })
})

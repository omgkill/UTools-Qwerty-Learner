import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/utils/db'
import { DailyRecord, WordProgress } from '@/utils/db/progress'
import 'fake-indexeddb/auto'

describe('useWordDetails - 学习详情中的掌握单词', () => {
  const dictId = 'test-dict-word-details'

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

  it('当前逻辑无法显示掌握单词（bug复现）', async () => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = new Date(today).getTime() / 1000
    const endOfDay = startOfDay + 24 * 60 * 60

    // 创建单词进度并标记为已掌握
    const word1 = new WordProgress('word1', dictId)
    word1.masteryLevel = 7 // MASTERED
    word1.lastReviewTime = Date.now()
    await db.wordProgress.add(word1)

    // 创建每日记录
    const record = new DailyRecord(dictId, today)
    record.masteredCount = 1
    await db.dailyRecords.add(record)

    // 模拟 useWordDetails 的查询逻辑（从 wordRecords 查询）
    const wordRecords = await db.wordRecords
      .where('dict')
      .equals(dictId)
      .filter((r) => r.timeStamp >= startOfDay && r.timeStamp <= endOfDay)
      .toArray()

    // 当前逻辑：从 wordRecords 查询，但掌握单词不会创建 wordRecords
    console.log('从 wordRecords 查询到的记录:', wordRecords)
    expect(wordRecords.length).toBe(0) // 有bug，掌握单词不会被查询到

    // 修复后的逻辑：应该从 wordProgress 查询当天标记为已掌握的单词
    const masteredWords = await db.wordProgress
      .where({ dict: dictId })
      .filter((p) => p.masteryLevel === 7 && p.lastReviewTime >= startOfDay * 1000 && p.lastReviewTime <= endOfDay * 1000)
      .toArray()

    console.log('从 wordProgress 查询到的掌握单词:', masteredWords)
    expect(masteredWords.length).toBe(1)
    expect(masteredWords[0].word).toBe('word1')
  })

  it('学习详情应该同时显示新词、复习词和掌握词', async () => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = new Date(today).getTime() / 1000
    const endOfDay = startOfDay + 24 * 60 * 60

    // 创建新词进度
    const newWord = new WordProgress('newWord', dictId)
    newWord.masteryLevel = 1 // LEARNED
    await db.wordProgress.add(newWord)

    // 创建复习词进度
    const reviewWord = new WordProgress('reviewWord', dictId)
    reviewWord.masteryLevel = 3 // KNOWN
    reviewWord.reps = 2
    await db.wordProgress.add(reviewWord)

    // 创建掌握词进度
    const masteredWord = new WordProgress('masteredWord', dictId)
    masteredWord.masteryLevel = 7 // MASTERED
    masteredWord.lastReviewTime = Date.now()
    await db.wordProgress.add(masteredWord)

    // 模拟修复后的查询逻辑
    const wordProgressList = await db.wordProgress.where({ dict: dictId }).toArray()

    const newWords = wordProgressList.filter((p) => p.masteryLevel >= 1 && p.masteryLevel <= 6 && p.reps === 0)
    const reviewWords = wordProgressList.filter((p) => p.masteryLevel >= 1 && p.masteryLevel <= 6 && p.reps > 0)
    const masteredWords = wordProgressList.filter((p) => p.masteryLevel === 7)

    console.log('新词:', newWords.map((w) => w.word))
    console.log('复习词:', reviewWords.map((w) => w.word))
    console.log('掌握词:', masteredWords.map((w) => w.word))

    expect(newWords.length).toBe(1)
    expect(reviewWords.length).toBe(1)
    expect(masteredWords.length).toBe(1)
  })
})

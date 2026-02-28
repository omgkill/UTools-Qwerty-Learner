import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyRecord, WordProgress, getTodayDate } from '@/utils/db/progress'
import { DailyRecordService, WordProgressService, handleMasteredFlow, loadTypingSession } from '@/services'
import { db } from '@/utils/db'
import type { Word, WordWithIndex } from '@/typings'

describe('掌握单词替换逻辑测试', () => {
  const dictID = 'test-dict-mastered-replacement'
  const wordList: Word[] = Array.from({ length: 100 }, (_, i) => ({
    name: `word-${i + 1}`,
    trans: [`翻译-${i + 1}`],
    usphone: `音标-${i + 1}`,
    ukphone: `音标-${i + 1}`,
  }))

  beforeAll(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
  })

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
  })

  afterAll(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
  })

  it('掌握单词时应该添加替换单词，保持今日目标总量不变', async () => {
    const wordProgressService = new WordProgressService(db)
    const dailyRecordService = new DailyRecordService(db)

    // 1. 初始化进度
    await wordProgressService.initProgressBatch(dictID, wordList.map(w => w.name))

    // 2. 模拟学习20个新词，其中5个被掌握
    const initialWords = await wordProgressService.getNewWords(dictID, wordList, 20)
    expect(initialWords.length).toBe(20)

    // 3. 模拟学习过程，其中5个单词被掌握
    let masteredCount = 0
    const learnedWords = new Set<string>()

    for (let i = 0; i < initialWords.length; i++) {
      const word = initialWords[i]
      learnedWords.add(word.name)

      // 模拟学习单词
      await wordProgressService.updateProgress(dictID, word.name, true, 0)
      await dailyRecordService.incrementLearned(dictID)

      // 前5个单词标记为掌握
      if (i < 5) {
        const result = await handleMasteredFlow({
          currentWord: word,
          markAsMastered: async (wordName) => {
            const progress = await wordProgressService.markAsMastered(dictID, wordName)
            // 增加掌握计数
            const record = await dailyRecordService.getTodayRecord(dictID)
            record.masteredCount++
            if (record.id) {
              await db.dailyRecords.update(record.id, record)
            }
            return progress
          },
          getNextNewWord: async () => {
            const newWords = await wordProgressService.getNewWords(dictID, wordList, 100)
            // 过滤掉已经学习过的单词
            const available = newWords.filter(w => !learnedWords.has(w.name))
            if (available.length > 0) {
              const nextWord = available[0]
              learnedWords.add(nextWord.name)
              return nextWord
            }
            return null
          },
          createWordRecord: async () => {
            // 模拟创建学习记录
          },
        })

        if (result.replacementWord) {
          masteredCount++
          // 模拟学习替换单词（不增加学习计数，因为是替换被掌握的单词）
          await wordProgressService.updateProgress(dictID, result.replacementWord.name, true, 0)
          // 不调用 incrementLearned，因为替换单词是为了保持学习总量
        }
      }
    }

    // 4. 验证结果
    const todayRecord = await dailyRecordService.getTodayRecord(dictID)
    console.log('今日记录:', todayRecord)

    // 今日详情应该是20个新词，5个掌握词
    expect(todayRecord.learnedCount).toBe(20) // 20个新词（包括5个替换的）
    expect(todayRecord.masteredCount).toBe(5) // 5个掌握词
    expect(todayRecord.totalToday).toBe(20) // 总学习量应该是20（不包含掌握的）

    // 5. 验证掌握的单词状态
    const masteredWords = await db.wordProgress
      .where('dict')
      .equals(dictID)
      .filter(p => p.masteryLevel >= 7)
      .toArray()
    expect(masteredWords.length).toBe(5)

    // 6. 验证学习列表加载逻辑
    const typingSession = await loadTypingSession({
      wordList,
      reviewedCount: 0,
      learnedCount: todayRecord.learnedCount,
      isExtraReview: false,
      getDueWordsWithInfo: async (wordList, limit) => {
        return await wordProgressService.getDueWordsWithInfo(dictID, wordList, limit)
      },
      getNewWords: async (wordList, limit) => {
        return await wordProgressService.getNewWords(dictID, wordList, limit)
      },
      getWordProgress: async (word) => {
        return await wordProgressService.getProgress(dictID, word)
      },
    })

    // 验证学习类型是否为complete（已达到每日目标）
    expect(typingSession.learningType).toBe('complete')
  })

  it('验证掌握单词不影响今日目标计数', async () => {
    const wordProgressService = new WordProgressService(db)
    const dailyRecordService = new DailyRecordService(db)

    // 1. 初始化进度
    await wordProgressService.initProgressBatch(dictID, wordList.map(w => w.name))

    // 2. 学习一个单词并标记为掌握
    const firstWord = wordList[0]
    await wordProgressService.updateProgress(dictID, firstWord.name, true, 0)
    await dailyRecordService.incrementLearned(dictID)

    // 3. 标记为掌握
    await wordProgressService.markAsMastered(dictID, firstWord.name)
    const record = await dailyRecordService.getTodayRecord(dictID)
    record.masteredCount++
    if (record.id) {
      await db.dailyRecords.update(record.id, record)
    }

    // 4. 验证今日目标计数
    expect(record.learnedCount).toBe(1)
    expect(record.masteredCount).toBe(1)
    expect(record.totalToday).toBe(1) // 掌握的词不包含在今日目标里
  })
})

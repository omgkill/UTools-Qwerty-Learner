import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getTodayDate } from '@/utils/db/progress'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords } from '@/services'
import { RepeatLearningManager } from './RepeatLearningManager'
import { getTodayStartTime } from '@/utils/timeService'
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

describe('RepeatLearningManager 集成测试', () => {
  const dictId = 'test-dict-repeat-learning'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
  })

  it('完整流程：开始重复学习 → 学习几个单词 → 刷新页面 → 恢复进度', async () => {
    // 准备数据
    const wordList = createWordList(20)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: `word${i}`,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }
    
    // 获取重复学习单词
    const repeatWords = await getRepeatLearningWords({
      currentDictId: dictId,
      wordList,
      listWordRecordsInRange: async (dictIdParam, start, end) => {
        return db.wordRecords
          .where('[dict+timeStamp]')
          .between([dictIdParam, start], [dictIdParam, end])
          .toArray()
      },
    })
    
    expect(repeatWords.length).toBe(20)
    
    // 开始重复学习
    const manager = new RepeatLearningManager()
    await manager.start(dictId, repeatWords)
    
    // 验证初始状态
    expect(manager.isRepeatLearning()).toBe(true)
    expect(manager.getCurrentIndex()).toBe(0)
    expect(manager.getLearningWords().length).toBe(20)
    
    // 学习到第 10 个词
    for (let i = 0; i < 10; i++) {
      await manager.updateIndex(dictId, i + 1)
      expect(manager.getCurrentIndex()).toBe(i + 1)
    }
    
    // 验证 IndexedDB 中的数据
    const today = getTodayDate()
    const savedBefore = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()
    
    expect(savedBefore).toBeDefined()
    expect(savedBefore?.currentIndex).toBe(10)
    
    // 模拟刷新页面
    const manager2 = new RepeatLearningManager()
    const restoredState = await manager2.initialize(dictId)
    
    // 验证恢复状态
    expect(restoredState).not.toBeNull()
    expect(restoredState?.isRepeatLearning).toBe(true)
    expect(restoredState?.currentIndex).toBe(10)
    expect(restoredState?.learningWords.length).toBe(20)
    
    expect(manager2.isRepeatLearning()).toBe(true)
    expect(manager2.getCurrentIndex()).toBe(10)
  })

  it('快速连续更新索引，应该保存最新状态', async () => {
    const wordList = createWordList(10)
    const manager = new RepeatLearningManager()
    
    await manager.start(dictId, wordList.map((word, index) => ({ ...word, index })))
    
    // 顺序更新
    for (let i = 1; i <= 5; i++) {
      await manager.updateIndex(dictId, i)
    }
    
    expect(manager.getCurrentIndex()).toBe(5)
    
    // 验证 IndexedDB
    const today = getTodayDate()
    const saved = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()
    
    expect(saved?.currentIndex).toBe(5)
    
    // 恢复
    const manager2 = new RepeatLearningManager()
    const restored = await manager2.initialize(dictId)
    
    expect(restored?.currentIndex).toBe(5)
  })

  it('学习完成后清除状态', async () => {
    const wordList = createWordList(10)
    const manager = new RepeatLearningManager()
    
    await manager.start(dictId, wordList.map((word, index) => ({ ...word, index })))
    await manager.updateIndex(dictId, 5)
    
    expect(manager.isRepeatLearning()).toBe(true)
    expect(manager.getCurrentIndex()).toBe(5)
    
    // 清除
    await manager.clear(dictId)
    
    expect(manager.isRepeatLearning()).toBe(false)
    expect(manager.getCurrentIndex()).toBe(0)
    
    // 验证 IndexedDB
    const today = getTodayDate()
    const saved = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()
    
    expect(saved?.isRepeatLearning).toBe(false)
    expect(saved?.currentIndex).toBe(0)
  })

  it('跨天场景：第二天无法恢复状态', async () => {
    const wordList = createWordList(10)
    const manager = new RepeatLearningManager()
    
    await manager.start(dictId, wordList.map((word, index) => ({ ...word, index })))
    await manager.updateIndex(dictId, 5)
    
    // 今天可以恢复
    const manager2 = new RepeatLearningManager()
    const todayState = await manager2.initialize(dictId)
    expect(todayState?.currentIndex).toBe(5)
    
    // 模拟第二天：修改日期
    const today = getTodayDate()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]
    
    await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .modify({ date: tomorrowString })
    
    // 第二天无法恢复
    const manager3 = new RepeatLearningManager()
    const tomorrowState = await manager3.initialize(dictId)
    
    expect(tomorrowState).toBeNull()
    expect(manager3.isRepeatLearning()).toBe(false)
  })

  it('不同词库隔离', async () => {
    const dictId1 = 'dict-1'
    const dictId2 = 'dict-2'
    const wordList1 = createWordList(10)
    const wordList2 = createWordList(15)
    
    const manager = new RepeatLearningManager()
    
    // 词库 1
    await manager.start(dictId1, wordList1.map((word, index) => ({ ...word, index })))
    await manager.updateIndex(dictId1, 5)
    
    // 词库 2
    await manager.start(dictId2, wordList2.map((word, index) => ({ ...word, index })))
    await manager.updateIndex(dictId2, 8)
    
    // 当前是词库 2
    expect(manager.getCurrentIndex()).toBe(8)
    expect(manager.getLearningWords().length).toBe(15)
    
    // 分别恢复
    const manager1 = new RepeatLearningManager()
    const manager2 = new RepeatLearningManager()
    
    const state1 = await manager1.initialize(dictId1)
    const state2 = await manager2.initialize(dictId2)
    
    expect(state1?.currentIndex).toBe(5)
    expect(state1?.learningWords.length).toBe(10)
    
    expect(state2?.currentIndex).toBe(8)
    expect(state2?.learningWords.length).toBe(15)
  })
})

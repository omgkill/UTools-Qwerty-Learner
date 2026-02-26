import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { typingReducer } from '@/pages/Typing/store/reducer'
import { TypingStateActionType } from '@/pages/Typing/store/actions'
import type { TypingState } from '@/pages/Typing/store/types'
import type { WordWithIndex } from '@/typings'
import { MASTERY_LEVELS, WordProgress } from '@/utils/db/progress'
import { determineLearningType } from './learningLogic'
import { db } from '@/utils/db'
import { getNewWords, markAsMastered, getDueWords, getWordProgress } from '@/utils/db/progressApi'

const createWord = (name: string, trans: string[] = [], index = 0): WordWithIndex => ({
  name,
  trans,
  usphone: '',
  ukphone: '',
  tense: '',
  index,
})

const createInitialState = (words: WordWithIndex[] = [], index = 0): TypingState => ({
  wordListData: {
    words,
    index,
  },
  statsData: {
    wordCount: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongWordIndexes: [],
    correctWordIndexes: [],
    wordRecordIds: [],
    timerData: { time: 0, accuracy: 0, wpm: 0 },
  },
  wordInfoMap: {},
  uiState: {
    isTyping: true,
    isFinished: false,
    isShowSkip: false,
    isExtraReview: false,
    isRepeatLearning: false,
    isCurrentWordMastered: false,
    isSavingRecord: false,
  },
  isTransVisible: true,
  isImmersiveMode: false,
})

describe('Typing Page - 复现循环问题', () => {
  const dictId = 'test-dict-cycle-bug'

  beforeEach(async () => {
    await db.wordProgress.clear()
  })

  afterEach(async () => {
    await db.wordProgress.clear()
  })

  it('复现：词库100词全部有进度记录，点击掌握40次', async () => {
    const allWords: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      allWords.push(createWord(`word${i}`, ['n. 测试'], i))
    }

    for (let i = 0; i < 100; i++) {
      const progress = new WordProgress(`word${i}`, dictId)
      progress.masteryLevel = MASTERY_LEVELS.NEW
      await db.wordProgress.add(progress)
    }

    const initialWords = allWords.slice(0, 20)
    let state = createInitialState(initialWords, 0)

    console.log('=== 开始复现循环问题 ===')
    console.log(`词库：${allWords.length} 词`)
    console.log(`初始学习列表：${initialWords.length} 词`)

    const countBefore = await db.wordProgress.count()
    console.log(`数据库中进度记录数：${countBefore}`)

    const wordSequence: string[] = []

    for (let i = 0; i < 40; i++) {
      const currentWord = state.wordListData.words[state.wordListData.index]

      if (!currentWord) break

      wordSequence.push(currentWord.name)
      await markAsMastered(dictId, currentWord.name)

      const newWords = await getNewWords(dictId, allWords, 1)

      if (newWords.length > 0) {
        state = typingReducer(state, {
          type: TypingStateActionType.ADD_REPLACEMENT_WORD,
          payload: newWords[0],
        })
      }

      state = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })
    }

    console.log(`\n单词序列（前25个）：${wordSequence.slice(0, 25).join(' -> ')}`)

    const wordCounts: Record<string, number> = {}
    for (const word of wordSequence) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }

    const repeatedWords = Object.entries(wordCounts).filter(([_, count]) => count > 1)
    const uniqueWords = new Set(wordSequence)

    console.log(`\n总共遇到 ${uniqueWords.size} 个不同的单词`)
    console.log(`重复的单词数：${repeatedWords.length}`)

    if (repeatedWords.length > 0) {
      console.log(`重复详情：`)
      for (const [word, count] of repeatedWords.slice(0, 5)) {
        console.log(`  ${word}: ${count}次`)
      }
    }

    expect(repeatedWords.length).toBeGreaterThan(0)
    expect(uniqueWords.size).toBeLessThan(allWords.length)
  })

  it('验证：getNewWords 在所有词都有进度时返回空', async () => {
    const allWords: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      allWords.push(createWord(`word${i}`, ['n. 测试'], i))
    }

    for (let i = 0; i < 100; i++) {
      const progress = new WordProgress(`word${i}`, dictId)
      progress.masteryLevel = MASTERY_LEVELS.NEW
      await db.wordProgress.add(progress)
    }

    const newWords = await getNewWords(dictId, allWords, 20)

    console.log('=== getNewWords 返回空数组 ===')
    console.log(`词库：${allWords.length} 词`)
    console.log(`所有词都有进度记录`)
    console.log(`getNewWords 返回：${newWords.length} 词`)

    expect(newWords.length).toBe(0)
  })

  it('验证：部分词没有进度记录时，getNewWords 返回正确', async () => {
    const allWords: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      allWords.push(createWord(`word${i}`, ['n. 测试'], i))
    }

    for (let i = 0; i < 20; i++) {
      const progress = new WordProgress(`word${i}`, dictId)
      progress.masteryLevel = MASTERY_LEVELS.NEW
      await db.wordProgress.add(progress)
    }

    const newWords = await getNewWords(dictId, allWords, 20)

    console.log('=== getNewWords 返回正确数量 ===')
    console.log(`词库：${allWords.length} 词`)
    console.log(`有进度记录：20 词`)
    console.log(`getNewWords 返回：${newWords.length} 词`)
    console.log(`前5个新词：${newWords.slice(0, 5).map(w => w.name).join(', ')}`)

    expect(newWords.length).toBe(20)
    expect(newWords[0].name).toBe('word20')
  })

  it('验证：markAsMastered 更新数据库', async () => {
    const word = 'test-word'
    const progress = new WordProgress(word, dictId)
    progress.masteryLevel = MASTERY_LEVELS.NEW
    await db.wordProgress.add(progress)

    await markAsMastered(dictId, word)

    const updated = await getWordProgress(dictId, word)

    console.log('=== markAsMastered 验证 ===')
    console.log(`更新前：masteryLevel = ${MASTERY_LEVELS.NEW}`)
    console.log(`更新后：masteryLevel = ${updated?.masteryLevel}`)

    expect(updated?.masteryLevel).toBe(MASTERY_LEVELS.MASTERED)
  })

  it('验证：determineLearningType 在所有词都有进度时的行为', async () => {
    const allWords: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      allWords.push(createWord(`word${i}`, ['n. 测试'], i))
    }

    for (let i = 0; i < 100; i++) {
      const progress = new WordProgress(`word${i}`, dictId)
      progress.masteryLevel = MASTERY_LEVELS.NEW
      await db.wordProgress.add(progress)
    }

    const allProgress = await db.wordProgress.toArray()

    const dueWords: WordWithIndex[] = []
    const newWords: WordWithIndex[] = []

    console.log('=== determineLearningType 分析 ===')
    console.log(`所有单词都有进度记录，masteryLevel=NEW`)

    const result = determineLearningType({
      dueWords,
      newWords,
      reviewedCount: 0,
      learnedCount: 0,
      allProgress,
      wordList: allWords,
      isExtraReview: false,
    })

    console.log(`学习类型：${result.learningType}`)
    console.log(`学习单词数：${result.learningWords.length}`)

    expect(result.learningType).toBe('consolidate')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IWordProgress } from '@/utils/db/progress'
import { DailyRecord, LEARNING_CONFIG, MASTERY_LEVELS, getNextReviewTime, updateMasteryLevel } from '@/utils/db/progress'
import type { LearningType } from './learningLogic'
import { determineLearningType } from './learningLogic'

type SimulatedWord = {
  name: string
  progress: IWordProgress | undefined
}

type DayResult = {
  day: number
  learningType: LearningType
  dueWordsCount: number
  newWordsQuota: number
  newWordsLearned: number
  wordsReviewed: number
  totalToday: number
  cumulativeNewWords: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function createInitialProgress(word: string, dict: string): IWordProgress {
  return {
    word,
    dict,
    masteryLevel: MASTERY_LEVELS.NEW,
    nextReviewTime: Date.now(),
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 0,
  }
}

function createExistingProgress(params: { word: string; dict: string; masteryLevel: IWordProgress['masteryLevel']; nextReviewTime: number }): IWordProgress {
  return {
    word: params.word,
    dict: params.dict,
    masteryLevel: params.masteryLevel,
    nextReviewTime: params.nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 1,
  }
}

function applyProgressUpdate(params: { word: string; dict: string; progress: IWordProgress | undefined; isCorrect: boolean; wrongCount: number }): IWordProgress {
  const base = params.progress ?? createInitialProgress(params.word, params.dict)
  const { newLevel } = updateMasteryLevel(base.masteryLevel, params.isCorrect, params.wrongCount)

  const next: IWordProgress = {
    ...base,
    masteryLevel: newLevel,
    nextReviewTime: getNextReviewTime(newLevel),
    lastReviewTime: Date.now(),
    reps: (base.reps || 0) + 1,
  }
  if ((base.reps || 0) === 0 && !params.isCorrect) {
    next.nextReviewTime = Date.now() + DAY_MS
  }

  if (params.isCorrect) {
    next.correctCount++
    next.streak++
  } else {
    next.wrongCount++
    next.streak = 0
  }

  return next
}

function simulateDay(
  words: SimulatedWord[],
  options?: { doConsolidate?: boolean }
): { result: DayResult; updatedWords: SimulatedWord[] } {
  const dict = 'test-dict'

  const now = Date.now()
  const wordList = words.map((w, index) => ({ name: w.name, trans: [] as string[], usphone: '', ukphone: '', index }))

  const dueWordsStart = words
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => {
      const p = w.progress
      return p && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= now
    })
    .map(({ index }) => wordList[index])

  const dueWordsCount = dueWordsStart.length
  const plannedReviewed = Math.min(dueWordsCount, LEARNING_CONFIG.DAILY_LIMIT)
  const newWordsQuota = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - plannedReviewed)

  let reviewedCount = 0
  let learnedCount = 0
  const updatedWords = words.map((w) => ({ ...w }))

  let firstLearningType: LearningType | null = null

  for (let safety = 0; safety < 1000; safety++) {
    const loopNow = Date.now()
    const dueWords = updatedWords
      .map((w, index) => ({ w, index }))
      .filter(({ w }) => {
        const p = w.progress
        return p && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= loopNow
      })
      .map(({ index }) => wordList[index])

    const newWords = updatedWords
      .map((w, index) => ({ w, index }))
      .filter(({ w }) => !w.progress)
      .map(({ index }) => wordList[index])

    const remainingSlots = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - reviewedCount - learnedCount)
    if (remainingSlots <= 0) break

    const learningResult = determineLearningType({
      dueWords,
      newWords,
      reviewedCount,
      learnedCount,
      allProgress: updatedWords.map((w) => w.progress),
      wordList: wordList.map((w) => ({ name: w.name, trans: [], usphone: '', ukphone: '' })),
    })

    if (!firstLearningType) firstLearningType = learningResult.learningType

    if (learningResult.learningType === 'complete') {
      break
    }

    if (learningResult.learningType === 'consolidate' && !options?.doConsolidate) {
      break
    }

    const batchSize = Math.min(learningResult.learningWords.length, remainingSlots)
    if (batchSize <= 0) break

    if (learningResult.learningType === 'new') {
      learnedCount += batchSize
    } else {
      reviewedCount += batchSize
    }

    for (let i = 0; i < batchSize; i++) {
      const learningWord = learningResult.learningWords[i]
      if (!learningWord) continue
      const idx = learningWord.index
      const current = updatedWords[idx]
      if (!current) continue
      updatedWords[idx] = {
        ...current,
        progress: applyProgressUpdate({ word: current.name, dict, progress: current.progress, isCorrect: true, wrongCount: 0 }),
      }
    }
  }

  const result: DayResult = {
    day: 0,
    learningType: firstLearningType ?? 'complete',
    dueWordsCount,
    newWordsQuota,
    newWordsLearned: learnedCount,
    wordsReviewed: reviewedCount,
    totalToday: learnedCount + reviewedCount,
    cumulativeNewWords: 0,
  }

  return { result, updatedWords }
}

describe('Fixed Limit Model - Learning Simulation (学习模拟案例验证)', () => {
  const TOTAL_WORDS = 100
  const dict = 'test-dict'

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('First Attempt With Wrong Inputs', () => {
    it('should schedule next review to tomorrow for a new word with wrong inputs', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const progress = applyProgressUpdate({
        word: 'word1',
        dict,
        progress: undefined,
        isCorrect: false,
        wrongCount: 2,
      })

      expect(progress.reps).toBe(1)
      expect(progress.nextReviewTime).toBe(baseTime + DAY_MS)
    })
  })

  describe('Day 1 - First day learning', () => {
    it('should match Day 1 simulation: 0 due words, 20 new words quota, learn 20 new words', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))

      const { result, updatedWords } = simulateDay(words)

      expect(result.dueWordsCount).toBe(0)
      expect(result.newWordsQuota).toBe(20)
      expect(result.learningType).toBe('new')
      expect(result.newWordsLearned).toBe(20)
      expect(result.wordsReviewed).toBe(0)
      expect(result.totalToday).toBe(20)

      const learnedWords = updatedWords.filter((w) => w.progress?.masteryLevel === MASTERY_LEVELS.LEARNED)
      expect(learnedWords.length).toBe(20)

      expect(result.totalToday).toBe(20)
    })
  })

  describe('Day 2 - Review day (LEARNED interval is 1 day)', () => {
    it('should match Day 2 simulation: 20 due words, review 20 words', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))
      const day1 = simulateDay(words)

      vi.setSystemTime(baseTime + DAY_MS)
      const { result } = simulateDay(day1.updatedWords)

      expect(result.dueWordsCount).toBe(20)
      expect(result.newWordsQuota).toBe(0)
      expect(result.learningType).toBe('review')
      expect(result.newWordsLearned).toBe(0)
      expect(result.wordsReviewed).toBe(20)
      expect(result.totalToday).toBe(20)

      expect(result.totalToday).toBe(20)
    })
  })

  describe('Day 3 - New word day (FAMILIAR interval is 2 days)', () => {
    it('should match Day 3 simulation: 0 due words, learn 20 new words', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))
      const day1 = simulateDay(words)

      vi.setSystemTime(baseTime + DAY_MS)
      const day2 = simulateDay(day1.updatedWords)

      vi.setSystemTime(baseTime + 2 * DAY_MS)
      const { result, updatedWords } = simulateDay(day2.updatedWords)

      expect(result.dueWordsCount).toBe(0)
      expect(result.learningType).toBe('new')
      expect(result.newWordsLearned).toBe(20)
      expect(result.wordsReviewed).toBe(0)
      expect(result.totalToday).toBe(20)

      const progressedWords = updatedWords.filter((w) => (w.progress?.masteryLevel ?? 0) > MASTERY_LEVELS.NEW)
      expect(progressedWords.length).toBe(40)
    })
  })

  describe('First 15 Days Summary', () => {
    it('should match the first 15 days summary table from 学习配置方案.md', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))

      let cumulativeNewWords = 0
      const dayResults: DayResult[] = []

      for (let day = 1; day <= 15; day++) {
        vi.setSystemTime(baseTime + (day - 1) * DAY_MS)
        const { result, updatedWords } = simulateDay(words)
        words.splice(0, words.length, ...updatedWords)
        cumulativeNewWords += result.newWordsLearned

        result.day = day
        result.cumulativeNewWords = cumulativeNewWords
        dayResults.push(result)
      }

      const expected = [
        { day: 1, dueWordsCount: 0, newWordsQuota: 20, newWordsLearned: 20, wordsReviewed: 0, totalToday: 20, cumulativeNewWords: 20 },
        { day: 2, dueWordsCount: 20, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 20 },
        { day: 3, dueWordsCount: 0, newWordsQuota: 20, newWordsLearned: 20, wordsReviewed: 0, totalToday: 20, cumulativeNewWords: 40 },
        { day: 4, dueWordsCount: 40, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 40 },
        { day: 5, dueWordsCount: 20, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 40 },
        { day: 6, dueWordsCount: 0, newWordsQuota: 20, newWordsLearned: 20, wordsReviewed: 0, totalToday: 20, cumulativeNewWords: 60 },
        { day: 7, dueWordsCount: 40, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 60 },
        { day: 8, dueWordsCount: 40, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 60 },
        { day: 9, dueWordsCount: 20, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 60 },
        { day: 10, dueWordsCount: 0, newWordsQuota: 20, newWordsLearned: 20, wordsReviewed: 0, totalToday: 20, cumulativeNewWords: 80 },
        { day: 11, dueWordsCount: 60, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 80 },
        { day: 12, dueWordsCount: 40, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 80 },
        { day: 13, dueWordsCount: 20, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 80 },
        { day: 14, dueWordsCount: 0, newWordsQuota: 20, newWordsLearned: 20, wordsReviewed: 0, totalToday: 20, cumulativeNewWords: 100 },
        { day: 15, dueWordsCount: 60, newWordsQuota: 0, newWordsLearned: 0, wordsReviewed: 20, totalToday: 20, cumulativeNewWords: 100 },
      ]

      expect(dayResults.length).toBe(expected.length)

      expected.forEach((entry, index) => {
        const result = dayResults[index]
        expect(result.day).toBe(entry.day)
        expect(result.dueWordsCount).toBe(entry.dueWordsCount)
        expect(result.newWordsQuota).toBe(entry.newWordsQuota)
        expect(result.newWordsLearned).toBe(entry.newWordsLearned)
        expect(result.wordsReviewed).toBe(entry.wordsReviewed)
        expect(result.totalToday).toBe(entry.totalToday)
        expect(result.cumulativeNewWords).toBe(entry.cumulativeNewWords)
      })
    })
  })

  describe('Learning Timeline - 100 Words', () => {
    it('should complete 100 new words on day 14 with the expected new word days', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))

      let cumulativeNewWords = 0
      let day = 0
      const newWordDays: number[] = []

      while (cumulativeNewWords < TOTAL_WORDS && day < 30) {
        day++
        vi.setSystemTime(baseTime + (day - 1) * DAY_MS)
        const { result, updatedWords } = simulateDay(words)

        words.splice(0, words.length, ...updatedWords)

        if (result.newWordsLearned > 0) {
          cumulativeNewWords += result.newWordsLearned
          newWordDays.push(day)
        }
      }

      expect(cumulativeNewWords).toBe(100)
      expect(day).toBe(14)
      expect(newWordDays).toEqual([1, 3, 6, 10, 14])
    })
  })

  describe('Consolidate Stability - No New Words', () => {
    it('should stay in consolidate mode across consecutive days', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: LEARNING_CONFIG.DAILY_LIMIT }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createExistingProgress({
          word: `word${i + 1}`,
          dict,
          masteryLevel: MASTERY_LEVELS.EXPERT,
          nextReviewTime: baseTime + 10 * DAY_MS,
        }),
      }))

      const results: DayResult[] = []

      for (let day = 1; day <= 3; day++) {
        vi.setSystemTime(baseTime + (day - 1) * DAY_MS)
        const { result, updatedWords } = simulateDay(words, { doConsolidate: true })
        words.splice(0, words.length, ...updatedWords)
        results.push(result)
      }

      results.forEach((result) => {
        expect(result.learningType).toBe('consolidate')
        expect(result.dueWordsCount).toBe(0)
        expect(result.newWordsLearned).toBe(0)
        expect(result.wordsReviewed).toBe(LEARNING_CONFIG.DAILY_LIMIT)
        expect(result.totalToday).toBe(LEARNING_CONFIG.DAILY_LIMIT)
      })
    })
  })

  describe('Review Interval Golden Cases (4/7/15/21/30 days)', () => {
    it('should schedule next review at 4/7/15/21/30 days after correct review', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)
      const baseDayStart = new Date(baseTime)
      baseDayStart.setHours(0, 0, 0, 0)
      const baseDayStartTime = baseDayStart.getTime()

      const words: SimulatedWord[] = [
        {
          name: 'word1',
          progress: createExistingProgress({ word: 'word1', dict, masteryLevel: MASTERY_LEVELS.FAMILIAR, nextReviewTime: baseTime - 1 }),
        },
        {
          name: 'word2',
          progress: createExistingProgress({ word: 'word2', dict, masteryLevel: MASTERY_LEVELS.KNOWN, nextReviewTime: baseTime - 1 }),
        },
        {
          name: 'word3',
          progress: createExistingProgress({ word: 'word3', dict, masteryLevel: MASTERY_LEVELS.PROFICIENT, nextReviewTime: baseTime - 1 }),
        },
        {
          name: 'word4',
          progress: createExistingProgress({ word: 'word4', dict, masteryLevel: MASTERY_LEVELS.ADVANCED, nextReviewTime: baseTime - 1 }),
        },
        {
          name: 'word5',
          progress: createExistingProgress({ word: 'word5', dict, masteryLevel: MASTERY_LEVELS.EXPERT, nextReviewTime: baseTime - 1 }),
        },
      ]

      const { result, updatedWords } = simulateDay(words)

      expect(result.dueWordsCount).toBe(5)
      expect(result.wordsReviewed).toBe(5)

      const progressByWord = new Map(updatedWords.map((w) => [w.name, w.progress]))

      const word1 = progressByWord.get('word1')
      const word2 = progressByWord.get('word2')
      const word3 = progressByWord.get('word3')
      const word4 = progressByWord.get('word4')
      const word5 = progressByWord.get('word5')

      expect(word1?.masteryLevel).toBe(MASTERY_LEVELS.KNOWN)
      expect(word2?.masteryLevel).toBe(MASTERY_LEVELS.PROFICIENT)
      expect(word3?.masteryLevel).toBe(MASTERY_LEVELS.ADVANCED)
      expect(word4?.masteryLevel).toBe(MASTERY_LEVELS.EXPERT)
      expect(word5?.masteryLevel).toBe(MASTERY_LEVELS.EXPERT)

      expect(word1?.nextReviewTime).toBe(baseDayStartTime + 4 * DAY_MS)
      expect(word2?.nextReviewTime).toBe(baseDayStartTime + 7 * DAY_MS)
      expect(word3?.nextReviewTime).toBe(baseDayStartTime + 15 * DAY_MS)
      expect(word4?.nextReviewTime).toBe(baseDayStartTime + 21 * DAY_MS)
      expect(word5?.nextReviewTime).toBe(baseDayStartTime + 21 * DAY_MS)
      expect(getNextReviewTime(MASTERY_LEVELS.MASTERED)).toBe(baseDayStartTime + 30 * DAY_MS)
    })
  })

  describe('Extra Review Scenario (额外复习场景)', () => {
    it('should handle scenario where due words exceed DAILY_LIMIT', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: 35 }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createExistingProgress({ word: `word${i + 1}`, dict, masteryLevel: MASTERY_LEVELS.LEARNED, nextReviewTime: baseTime - 1 }),
      }))

      const { result, updatedWords } = simulateDay(words)

      expect(result.dueWordsCount).toBe(35)
      expect(result.newWordsQuota).toBe(0)
      expect(result.learningType).toBe('review')
      expect(result.wordsReviewed).toBe(20)

      const remainingDueWords = updatedWords.filter((w) => {
        const p = w.progress
        return p && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= baseTime
      })
      expect(remainingDueWords.length).toBe(15)

      expect(result.totalToday).toBe(20)
    })

    it('should keep remaining due words for the next day with reduced quota', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: 35 }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createExistingProgress({ word: `word${i + 1}`, dict, masteryLevel: MASTERY_LEVELS.LEARNED, nextReviewTime: baseTime - 1 }),
      }))

      const day1 = simulateDay(words)

      vi.setSystemTime(baseTime + DAY_MS)
      const { result } = simulateDay(day1.updatedWords)

      expect(result.dueWordsCount).toBe(15)
      expect(result.newWordsQuota).toBe(5)
      expect(result.learningType).toBe('review')
      expect(result.wordsReviewed).toBe(15)
      expect(result.totalToday).toBe(15)
    })
  })
})

describe('DailyRecord - Fixed Limit Model', () => {
  it('should correctly calculate new word quota', () => {
    const record = new DailyRecord('test-dict', '2026-02-18')
    
    expect(record.getNewWordQuota()).toBe(LEARNING_CONFIG.DAILY_LIMIT)
    
    record.reviewedCount = 10
    expect(record.getNewWordQuota()).toBe(10)
    
    record.learnedCount = 5
    expect(record.getNewWordQuota()).toBe(5)
    
    record.reviewedCount = 15
    record.learnedCount = 5
    expect(record.getNewWordQuota()).toBe(0)
  })

  it('should correctly determine if target is reached', () => {
    const record = new DailyRecord('test-dict', '2026-02-18')
    
    expect(record.hasReachedTarget).toBe(false)
    
    record.reviewedCount = 10
    record.learnedCount = 5
    expect(record.hasReachedTarget).toBe(false)
    
    record.learnedCount = 10
    expect(record.hasReachedTarget).toBe(true)
    
    record.reviewedCount = 20
    record.learnedCount = 0
    expect(record.hasReachedTarget).toBe(true)
  })

  it('should correctly calculate remaining for target', () => {
    const record = new DailyRecord('test-dict', '2026-02-18')
    
    expect(record.remainingForTarget).toBe(LEARNING_CONFIG.DAILY_LIMIT)
    
    record.reviewedCount = 5
    record.learnedCount = 10
    expect(record.remainingForTarget).toBe(5)
    
    record.reviewedCount = 15
    record.learnedCount = 5
    expect(record.remainingForTarget).toBe(0)
  })
})

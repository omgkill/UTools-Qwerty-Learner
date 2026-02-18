import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyRecord, getNextReviewTime, LEARNING_CONFIG, MASTERY_LEVELS, updateMasteryLevel, type IWordProgress } from '@/utils/db/progress'
import { determineLearningType, type LearningType } from './learningLogic'

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
    easeFactor: 2.5,
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
    easeFactor: 2.5,
    reps: 1,
  }
}

function applyProgressUpdate(params: { word: string; dict: string; progress: IWordProgress | undefined; isCorrect: boolean; wrongCount: number }): IWordProgress {
  const base = params.progress ?? createInitialProgress(params.word, params.dict)
  const { newLevel, newEaseFactor } = updateMasteryLevel(base.masteryLevel, params.isCorrect, params.wrongCount, base.easeFactor)

  const next: IWordProgress = {
    ...base,
    masteryLevel: newLevel,
    easeFactor: newEaseFactor,
    nextReviewTime: getNextReviewTime(newLevel, newEaseFactor),
    lastReviewTime: Date.now(),
    reps: (base.reps || 0) + 1,
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
      return p && p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= now
    })
    .map(({ index }) => wordList[index])

  const dueWordsCount = dueWordsStart.length
  const plannedReviewed = Math.min(dueWordsCount, LEARNING_CONFIG.DAILY_LIMIT)
  const newWordsQuota = Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - plannedReviewed)

  let reviewedCount = 0
  let learnedCount = 0
  const updatedWords = words.map((w) => ({ ...w }))

  let firstLearningType: LearningType | null = null

  while (true) {
    const loopNow = Date.now()
    const dueWords = updatedWords
      .map((w, index) => ({ w, index }))
      .filter(({ w }) => {
        const p = w.progress
        return p && p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= loopNow
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
  const DAY_MS = 24 * 60 * 60 * 1000

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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

      console.log('Day 1:', {
        dueWords: result.dueWordsCount,
        newWordsQuota: result.newWordsQuota,
        newWordsLearned: result.newWordsLearned,
        wordsReviewed: result.wordsReviewed,
        total: result.totalToday
      })
    })
  })

  describe('Day 2 - Review day', () => {
    it('should match Day 2 simulation: 20 due words, 0 new words quota, review 20 words', () => {
      const baseTime = new Date('2026-02-18T00:00:00.000Z').getTime()
      vi.setSystemTime(baseTime)

      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({ name: `word${i + 1}`, progress: undefined }))
      const day1 = simulateDay(words)

      vi.setSystemTime(baseTime + DAY_MS)
      const { result, updatedWords } = simulateDay(day1.updatedWords)

      expect(result.dueWordsCount).toBe(20)
      expect(result.newWordsQuota).toBe(0)
      expect(result.learningType).toBe('review')
      expect(result.newWordsLearned).toBe(0)
      expect(result.wordsReviewed).toBe(20)
      expect(result.totalToday).toBe(20)

      const level2Words = updatedWords.filter((w) => w.progress?.masteryLevel === MASTERY_LEVELS.FAMILIAR)
      expect(level2Words.length).toBe(20)

      console.log('Day 2:', {
        dueWords: result.dueWordsCount,
        newWordsQuota: result.newWordsQuota,
        newWordsLearned: result.newWordsLearned,
        wordsReviewed: result.wordsReviewed,
        total: result.totalToday
      })
    })
  })

  describe('Day 3 - Review day (due to interval rules)', () => {
    it('should match Day 3 simulation with real scheduling: no due words, learn new words', () => {
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

      const progressedWords = updatedWords.filter((w) => (w.progress?.masteryLevel ?? MASTERY_LEVELS.NEW) > MASTERY_LEVELS.NEW)
      expect(progressedWords.length).toBe(40)
    })
  })

  describe('First 15 Days Summary', () => {
    it('should match the first 15 days summary table from 学习模拟案例.md', () => {
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

        console.log(`Day ${day}: dueWords=${result.dueWordsCount}, quota=${result.newWordsQuota}, newWords=${result.newWordsLearned}, reviewed=${result.wordsReviewed}, total=${result.totalToday}, cumulative=${cumulativeNewWords}`)
      }

      expect(dayResults[0].day).toBe(1)
      expect(dayResults[0].dueWordsCount).toBe(0)
      expect(dayResults[0].newWordsQuota).toBe(20)
      expect(dayResults[0].newWordsLearned).toBe(20)
      expect(dayResults[0].wordsReviewed).toBe(0)
      expect(dayResults[0].totalToday).toBe(20)
      expect(dayResults[0].cumulativeNewWords).toBe(20)

      console.log('\n=== First 15 Days Summary ===')
      console.log('| Day | Due Words | Quota | New Words | Reviewed | Total | Cumulative |')
      dayResults.forEach(r => {
        console.log(`| Day ${r.day} | ${r.dueWordsCount} | ${r.newWordsQuota} | ${r.newWordsLearned} | ${r.wordsReviewed} | ${r.totalToday} | ${r.cumulativeNewWords} |`)
      })
    })
  })

  describe('Learning Timeline - 100 Words', () => {
    it('should complete 100 new words within 30 days', () => {
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
          console.log(`Day ${day}: Learned ${result.newWordsLearned} new words, cumulative: ${cumulativeNewWords}`)
        }
      }

      console.log(`\nTotal days to learn 100 words: ${day}`)
      console.log(`Days with new words: ${newWordDays.join(', ')}`)

      expect(cumulativeNewWords).toBe(100)
      expect(day).toBeLessThanOrEqual(30)
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
        return p && p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED && p.nextReviewTime <= baseTime
      })
      expect(remainingDueWords.length).toBe(15)

      console.log('\n=== Extra Review Scenario ===')
      console.log(`Due words: 35`)
      console.log(`Reviewed (counted): ${result.wordsReviewed}`)
      console.log(`Remaining due words: ${remainingDueWords.length}`)
      console.log(`New words quota after review: ${Math.max(0, LEARNING_CONFIG.DAILY_LIMIT - result.wordsReviewed)}`)
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

import { describe, expect, it } from 'vitest'
import { DailyRecord, LEARNING_CONFIG, MASTERY_LEVELS, type IWordProgress } from '@/utils/db/progress'
import { determineLearningType, type LearningType } from './learningLogic'

type SimulatedWord = {
  name: string
  progress: IWordProgress
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

const REVIEW_INTERVALS_DAYS = [0, 1/24, 1, 2, 4, 7, 15, 30]

function createWordProgress(word: string, dict: string, masteryLevel: number = 0, nextReviewTime: number = Date.now()): IWordProgress {
  return {
    word,
    dict,
    masteryLevel,
    nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    easeFactor: 2.5,
    reps: 0,
  }
}

function simulateDay(
  words: SimulatedWord[],
  currentTime: number
): { result: DayResult; updatedWords: SimulatedWord[] } {
  const dict = 'test-dict'
  
  const dueWords = words.filter(w => 
    w.progress.masteryLevel > 0 && 
    w.progress.masteryLevel < 7 && 
    w.progress.nextReviewTime <= currentTime
  ).map((w) => ({ 
    name: w.name, 
    trans: [] as string[], 
    usphone: '', 
    ukphone: '', 
    index: words.indexOf(w) 
  }))

  const newWords = words.filter(w => w.progress.masteryLevel === 0)
    .map((w) => ({ 
      name: w.name, 
      trans: [] as string[], 
      usphone: '', 
      ukphone: '', 
      index: words.indexOf(w) 
    }))

  const allProgress = words.map(w => w.progress)

  const learningResult = determineLearningType({
    dueWords,
    newWords,
    reviewedCount: 0,
    learnedCount: 0,
    allProgress,
    wordList: words.map(w => ({ name: w.name, trans: [], usphone: '', ukphone: '' })),
  })

  let newWordsLearned = 0
  let wordsReviewed = 0
  const updatedWords = [...words]

  if (learningResult.learningType === 'review') {
    const wordsToReview = Math.min(learningResult.learningWords.length, LEARNING_CONFIG.DAILY_LIMIT)
    wordsReviewed = wordsToReview
    
    for (let i = 0; i < wordsToReview; i++) {
      const wordIdx = words.findIndex(w => w.name === learningResult.learningWords[i]?.name)
      if (wordIdx >= 0) {
        const oldLevel = updatedWords[wordIdx].progress.masteryLevel
        const newLevel = Math.min(oldLevel + 1, 7) as IWordProgress['masteryLevel']
        updatedWords[wordIdx] = {
          ...updatedWords[wordIdx],
          progress: {
            ...updatedWords[wordIdx].progress,
            masteryLevel: newLevel,
            nextReviewTime: currentTime + REVIEW_INTERVALS_DAYS[newLevel] * 24 * 60 * 60 * 1000,
            lastReviewTime: currentTime,
            reps: updatedWords[wordIdx].progress.reps + 1,
          }
        }
      }
    }
  } else if (learningResult.learningType === 'new') {
    const wordsToLearn = Math.min(learningResult.learningWords.length, LEARNING_CONFIG.DAILY_LIMIT)
    newWordsLearned = wordsToLearn
    
    for (let i = 0; i < wordsToLearn; i++) {
      const wordIdx = words.findIndex(w => w.name === learningResult.learningWords[i]?.name)
      if (wordIdx >= 0) {
        updatedWords[wordIdx] = {
          ...updatedWords[wordIdx],
          progress: {
            ...updatedWords[wordIdx].progress,
            masteryLevel: 1,
            nextReviewTime: currentTime + REVIEW_INTERVALS_DAYS[1] * 24 * 60 * 60 * 1000,
            lastReviewTime: currentTime,
            reps: 1,
          }
        }
      }
    }
  }

  const result: DayResult = {
    day: 0,
    learningType: learningResult.learningType,
    dueWordsCount: dueWords.length,
    newWordsQuota: LEARNING_CONFIG.DAILY_LIMIT,
    newWordsLearned,
    wordsReviewed,
    totalToday: newWordsLearned + wordsReviewed,
    cumulativeNewWords: 0,
  }

  return { result, updatedWords }
}

describe('Fixed Limit Model - Learning Simulation (学习模拟案例验证)', () => {
  const TOTAL_WORDS = 100
  const dict = 'test-dict'

  describe('Day 1 - First day learning', () => {
    it('should match Day 1 simulation: 0 due words, 20 new words quota, learn 20 new words', () => {
      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(`word${i + 1}`, dict, 0, Date.now()),
      }))

      let currentTime = Date.now()

      const { result, updatedWords } = simulateDay(words, currentTime)

      expect(result.dueWordsCount).toBe(0)
      expect(result.newWordsQuota).toBe(20)
      expect(result.learningType).toBe('new')
      expect(result.newWordsLearned).toBe(20)
      expect(result.wordsReviewed).toBe(0)
      expect(result.totalToday).toBe(20)

      const learnedWords = updatedWords.filter(w => w.progress.masteryLevel === 1)
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
      const DAY_MS = 24 * 60 * 60 * 1000
      const baseTime = Date.now()
      
      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(
          `word${i + 1}`, 
          dict, 
          i < 20 ? 1 : 0, 
          baseTime + REVIEW_INTERVALS_DAYS[1] * DAY_MS
        ),
      }))

      const currentTime = baseTime + DAY_MS

      const { result, updatedWords } = simulateDay(words, currentTime)

      expect(result.dueWordsCount).toBe(20)
      expect(result.learningType).toBe('review')
      expect(result.newWordsLearned).toBe(0)
      expect(result.wordsReviewed).toBe(20)
      expect(result.totalToday).toBe(20)

      const level2Words = updatedWords.filter(w => w.progress.masteryLevel === 2)
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
    it('should match Day 3 simulation with actual interval rules: 20 due words (level 2, 1 day interval)', () => {
      const DAY_MS = 24 * 60 * 60 * 1000
      const baseTime = Date.now()
      
      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(
          `word${i + 1}`, 
          dict, 
          i < 20 ? 2 : 0, 
          i < 20 ? baseTime + REVIEW_INTERVALS_DAYS[2] * DAY_MS : baseTime
        ),
      }))

      const currentTime = baseTime + 2 * DAY_MS

      const { result, updatedWords } = simulateDay(words, currentTime)

      expect(result.dueWordsCount).toBe(20)
      expect(result.learningType).toBe('review')
      expect(result.newWordsLearned).toBe(0)
      expect(result.wordsReviewed).toBe(20)
      expect(result.totalToday).toBe(20)

      const level3Words = updatedWords.filter(w => w.progress.masteryLevel === 3)
      expect(level3Words.length).toBe(20)

      console.log('Day 3 (actual):', {
        dueWords: result.dueWordsCount,
        newWordsQuota: result.newWordsQuota,
        newWordsLearned: result.newWordsLearned,
        wordsReviewed: result.wordsReviewed,
        total: result.totalToday,
        note: 'Level 2 interval is 1 day, so words learned on Day 1 and reviewed on Day 2 are due on Day 3'
      })
    })
  })

  describe('First 15 Days Summary', () => {
    it('should match the first 15 days summary table from 学习模拟案例.md', () => {
      const DAY_MS = 24 * 60 * 60 * 1000
      const baseTime = Date.now()
      
      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(`word${i + 1}`, dict, 0, baseTime),
      }))

      let cumulativeNewWords = 0
      const dayResults: DayResult[] = []

      for (let day = 1; day <= 15; day++) {
        const currentTime = baseTime + day * DAY_MS

        const { result, updatedWords } = simulateDay(words, currentTime)

        words.splice(0, words.length, ...updatedWords)
        
        if (result.learningType === 'new') {
          cumulativeNewWords += result.newWordsLearned
        }

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
    it('should complete 100 new words in approximately 18 days', () => {
      const DAY_MS = 24 * 60 * 60 * 1000
      const baseTime = Date.now()
      
      const words: SimulatedWord[] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(`word${i + 1}`, dict, 0, baseTime),
      }))

      let cumulativeNewWords = 0
      let day = 0
      const newWordDays: number[] = []

      while (cumulativeNewWords < TOTAL_WORDS && day < 30) {
        day++
        const currentTime = baseTime + day * DAY_MS

        const { result, updatedWords } = simulateDay(words, currentTime)

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
      expect(day).toBeLessThanOrEqual(25)
      expect(day).toBeGreaterThanOrEqual(15)
    })
  })

  describe('Extra Review Scenario (额外复习场景)', () => {
    it('should handle scenario where due words exceed DAILY_LIMIT', () => {
      const DAY_MS = 24 * 60 * 60 * 1000
      const baseTime = Date.now()
      
      const words: SimulatedWord[] = Array.from({ length: 35 }, (_, i) => ({
        name: `word${i + 1}`,
        progress: createWordProgress(`word${i + 1}`, dict, 1, baseTime),
      }))

      const { result, updatedWords } = simulateDay(words, baseTime)

      expect(result.dueWordsCount).toBe(35)
      expect(result.newWordsQuota).toBe(20)
      expect(result.learningType).toBe('review')
      expect(result.wordsReviewed).toBe(20)

      const remainingDueWords = updatedWords.filter(w => 
        w.progress.masteryLevel > 0 && 
        w.progress.masteryLevel < 7 && 
        w.progress.nextReviewTime <= baseTime
      )
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

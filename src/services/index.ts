import type { IDailyRecord, IWordProgress } from '@/utils/db/progress'
import { DailyRecord, MASTERY_LEVELS, WordProgress, getNextReviewTime, getTodayDate, updateMasteryLevel } from '@/utils/db/progress'
import type { Word, WordWithIndex } from '@/typings'
import { determineLearningType } from '@/pages/Typing/hooks/learningLogic'
import type { LearningType } from '@/pages/Typing/hooks/learningLogic'
import type Dexie from 'dexie'
import type { Table } from 'dexie'
import { now } from '@/utils/timeService'

type WordProgressTables = {
  wordProgress: Table<IWordProgress, number>
  dailyRecords: Table<IDailyRecord, number>
}

export class WordProgressService {
  constructor(private db: Dexie) {}

  private get wordProgress(): Table<IWordProgress, number> {
    return (this.db as Dexie & WordProgressTables).wordProgress
  }

  private get dailyRecords(): Table<IDailyRecord, number> {
    return (this.db as Dexie & WordProgressTables).dailyRecords
  }

  async getProgress(dictID: string, word: string): Promise<IWordProgress | undefined> {
    return this.wordProgress.where('[dict+word]').equals([dictID, word]).first()
  }

  async getProgressBatch(dictID: string, words: string[]): Promise<Map<string, IWordProgress>> {
    const progressMap = new Map<string, IWordProgress>()
    if (words.length === 0) return progressMap

    const progressList = await this.wordProgress
      .where('[dict+word]')
      .anyOf(words.map((w) => [dictID, w]))
      .toArray()

    for (const progress of progressList) {
      progressMap.set(progress.word, progress)
    }
    return progressMap
  }

  async initProgress(dictID: string, word: string): Promise<IWordProgress> {
    const existing = await this.getProgress(dictID, word)
    if (existing) return existing

    const progress = new WordProgress(word, dictID)
    progress.id = await this.wordProgress.add(progress)
    return progress
  }

  async initProgressBatch(dictID: string, words: string[]): Promise<void> {
    if (words.length === 0) return

    const existingProgress = await this.getProgressBatch(dictID, words)
    const newWords = words.filter((w) => !existingProgress.has(w))

    if (newWords.length > 0) {
      const newProgressList = newWords.map((word) => new WordProgress(word, dictID))
      await this.wordProgress.bulkAdd(newProgressList)
    }
  }

  async markAsMastered(dictID: string, word: string): Promise<IWordProgress> {
    let progress = await this.getProgress(dictID, word)

    if (!progress) {
      progress = new WordProgress(word, dictID)
    }

    progress.masteryLevel = MASTERY_LEVELS.MASTERED
    progress.nextReviewTime = now() + 30 * 24 * 60 * 60 * 1000
    progress.lastReviewTime = now()
    progress.correctCount++
    progress.streak++

    if (progress.id) {
      await this.wordProgress.update(progress.id, progress)
    } else {
      progress.id = await this.wordProgress.add(progress)
    }

    return progress
  }

  async updateProgress(
    dictID: string,
    word: string,
    isCorrect: boolean,
    wrongCount: number,
  ): Promise<IWordProgress> {
    let progress = await this.getProgress(dictID, word)

    if (!progress) {
      progress = new WordProgress(word, dictID)
    }

    const wasFirstAttempt = (progress.reps || 0) === 0
    const { newLevel } = updateMasteryLevel(progress.masteryLevel, isCorrect, wrongCount)

    progress.masteryLevel = newLevel
    progress.nextReviewTime = getNextReviewTime(newLevel)
    progress.lastReviewTime = now()
    progress.reps = (progress.reps || 0) + 1

    if (wasFirstAttempt && !isCorrect) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      progress.nextReviewTime = tomorrow.getTime()
    }

    if (isCorrect) {
      progress.correctCount++
      progress.streak++
    } else {
      progress.wrongCount++
      progress.streak = 0
    }

    if (progress.id) {
      await this.wordProgress.update(progress.id, progress)
    } else {
      progress.id = await this.wordProgress.add(progress)
    }

    return progress
  }

  async getNewWords(dictID: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
    if (!dictID || allWords.length === 0) return []

    const existingProgress = await this.wordProgress.where('dict').equals(dictID).toArray()
    const progressMap = new Map(existingProgress.map((progress) => [progress.word, progress]))

    return allWords
      .map((word, index) => ({ ...word, index }))
      .filter((word) => {
        const progress = progressMap.get(word.name)
        return !progress || progress.masteryLevel === MASTERY_LEVELS.NEW
      })
      .slice(0, limit)
  }

  async getDueWords(dictID: string, limit = 20): Promise<IWordProgress[]> {
    const allDictProgress = await this.wordProgress.where('dict').equals(dictID).toArray()
    const dueWords = allDictProgress.filter(
      (p) => p.nextReviewTime <= now() && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED,
    )
    return dueWords.slice(0, limit)
  }

  async getDueWordsWithInfo(dictID: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
    const dueProgress = await this.getDueWords(dictID, limit)
    if (dueProgress.length === 0) return []

    const dueWordSet = new Set(dueProgress.map((p) => p.word))
    return allWords
      .map((word, index) => ({ ...word, index }))
      .filter((word) => dueWordSet.has(word.name))
  }

  async getAllProgress(dictID: string): Promise<IWordProgress[]> {
    return this.wordProgress.where('dict').equals(dictID).toArray()
  }

  async getStats(dictID: string): Promise<{
    total: number
    new: number
    learning: number
    mastered: number
    due: number
  }> {
    const allProgress = await this.getAllProgress(dictID)

    return {
      total: allProgress.length,
      new: allProgress.filter((p) => p.masteryLevel === MASTERY_LEVELS.NEW).length,
      learning: allProgress.filter((p) => p.masteryLevel > MASTERY_LEVELS.NEW && p.masteryLevel < MASTERY_LEVELS.MASTERED).length,
      mastered: allProgress.filter((p) => p.masteryLevel >= MASTERY_LEVELS.MASTERED).length,
      due: allProgress.filter((p) => p.nextReviewTime <= now() && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED).length,
    }
  }
}

export class DailyRecordService {
  constructor(private db: Dexie) {}

  private get dailyRecords(): Table<IDailyRecord, number> {
    return (this.db as Dexie & WordProgressTables).dailyRecords
  }

  async getTodayRecord(dictID: string): Promise<IDailyRecord> {
    const today = getTodayDate()
    let record = await this.dailyRecords.where('[dict+date]').equals([dictID, today]).first()

    if (!record) {
      record = new DailyRecord(dictID, today)
      record.id = await this.dailyRecords.add(record)
    }

    return record
  }

  async incrementReviewed(dictID: string, isExtra = false): Promise<IDailyRecord> {
    const record = await this.getTodayRecord(dictID)

    if (isExtra) {
      record.extraReviewedCount++
    } else {
      record.reviewedCount++
    }
    record.lastUpdateTime = now()

    if (record.id) {
      await this.dailyRecords.update(record.id, record)
    } else {
      record.id = await this.dailyRecords.add(record)
    }

    return record
  }

  async incrementLearned(dictID: string): Promise<IDailyRecord> {
    const record = await this.getTodayRecord(dictID)

    record.learnedCount++
    record.lastUpdateTime = now()

    if (record.id) {
      await this.dailyRecords.update(record.id, record)
    } else {
      record.id = await this.dailyRecords.add(record)
    }

    return record
  }

  async getRecord(dictID: string, date: string): Promise<IDailyRecord | undefined> {
    return this.dailyRecords.where('[dict+date]').equals([dictID, date]).first()
  }

  async getRecordsInRange(dictID: string, startDate: string, endDate: string): Promise<IDailyRecord[]> {
    return this.dailyRecords
      .where('[dict+date]')
      .between([dictID, startDate], [dictID, endDate])
      .toArray()
  }
}

export type TypingSessionParams = {
  wordList: Word[]
  reviewedCount: number
  learnedCount: number
  isExtraReview: boolean
  getDueWordsWithInfo: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
  getNewWords: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
  getWordProgress: (word: string) => Promise<IWordProgress | undefined>
}

export type TypingSessionResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
  masteredCount: number
  hasMoreDueWords: boolean
  remainingDueCount: number
}

export type ReplacementWordParams = {
  wordList: Word[]
  currentLearningWords: WordWithIndex[]
  getNewWords: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
}

export async function getNextReplacementWord(params: ReplacementWordParams): Promise<WordWithIndex | null> {
  const { wordList, currentLearningWords, getNewWords } = params
  if (wordList.length === 0) return null

  const existing = new Set(currentLearningWords.map((word) => word.name))
  const candidates = await getNewWords(wordList, 100)
  const next = candidates.find((word) => !existing.has(word.name))

  return next ?? null
}

export async function loadTypingSession(params: TypingSessionParams): Promise<TypingSessionResult> {
  const { wordList, reviewedCount, learnedCount, isExtraReview, getDueWordsWithInfo, getNewWords, getWordProgress } = params
  const [dueWords, newWords] = await Promise.all([
    getDueWordsWithInfo(wordList, 100),
    getNewWords(wordList, 100),
  ])

  const allProgress = await Promise.all(
    wordList.slice(0, 200).map(async (word) => getWordProgress(word.name)),
  )

  const mastered = allProgress.filter((p) => p && p.masteryLevel >= 7).length

  const result = determineLearningType({
    dueWords,
    newWords,
    reviewedCount,
    learnedCount,
    allProgress,
    wordList,
    isExtraReview,
  })

  return {
    learningType: result.learningType,
    learningWords: result.learningWords,
    dueCount: dueWords.length,
    newCount: newWords.length,
    masteredCount: mastered,
    hasMoreDueWords: result.hasMoreDueWords ?? false,
    remainingDueCount: result.remainingDueCount ?? 0,
  }
}

export type RepeatLearningParams = {
  currentDictId: string
  wordList: Word[]
  listWordRecordsInRange: (dictId: string, start: number, end: number) => Promise<{ word: string }[]>
}

export async function getRepeatLearningWords(params: RepeatLearningParams): Promise<WordWithIndex[]> {
  const { currentDictId, wordList, listWordRecordsInRange } = params
  if (!currentDictId || wordList.length === 0) {
    return []
  }

  const today = getTodayDate()
  const todayStart = Math.floor(new Date(today).getTime() / 1000) // 转换为秒级时间戳
  const todayEnd = todayStart + 24 * 60 * 60 // 24小时的秒数

  const todayRecords = await listWordRecordsInRange(currentDictId, todayStart, todayEnd)
  const todayWordNames = [...new Set(todayRecords.map((record) => record.word))]
  if (todayWordNames.length === 0) {
    return []
  }

  const repeatWords: WordWithIndex[] = []
  todayWordNames.forEach((wordName) => {
    const index = wordList.findIndex((word) => word.name === wordName)
    if (index !== -1) {
      repeatWords.push({ ...wordList[index], index })
    }
  })

  if (repeatWords.length === 0) {
    return []
  }

  return [...repeatWords].sort(() => Math.random() - 0.5)
}

export type MasteredFlowParams = {
  currentWord: WordWithIndex | undefined
  markAsMastered: (word: string) => Promise<IWordProgress>
  getNextNewWord: () => Promise<WordWithIndex | null>
  createWordRecord?: (word: string) => Promise<void>
}

export type MasteredFlowResult = {
  replacementWord: WordWithIndex | null
  shouldSkip: boolean
}

export async function handleMasteredFlow(params: MasteredFlowParams): Promise<MasteredFlowResult> {
  const { currentWord, markAsMastered, getNextNewWord, createWordRecord } = params
  if (!currentWord) {
    return { replacementWord: null, shouldSkip: false }
  }

  await markAsMastered(currentWord.name)
  
  // 创建掌握单词的记录
  if (createWordRecord) {
    await createWordRecord(currentWord.name)
  }
  
  const replacementWord = await getNextNewWord()

  return {
    replacementWord,
    shouldSkip: true,
  }
}

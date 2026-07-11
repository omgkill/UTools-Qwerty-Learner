import type { WordProgressRepository } from '@/features/typing/application/ports'
import type { TypingWordProgress } from '@/features/typing/domain'
import type { Word, WordWithIndex } from '@/typings'
import { db as defaultDb } from '@/utils/db'
import { MASTERY_LEVELS, WordProgress, getNextReviewTime, updateMasteryLevel } from '@/utils/db/progress'
import type { IWordProgress } from '@/utils/db/progress'
import { getTodayStartTime, now } from '@/utils/timeService'
import type Dexie from 'dexie'
import type { Table } from 'dexie'

type WordProgressTables = {
  wordProgress: Table<IWordProgress, number>
}

export class DexieWordProgressRepository implements WordProgressRepository {
  constructor(private db: Dexie) {}

  private get wordProgress(): Table<IWordProgress, number> {
    return (this.db as Dexie & WordProgressTables).wordProgress
  }

  async getProgress(dictId: string, word: string): Promise<TypingWordProgress | undefined> {
    return this.wordProgress.where('[dict+word]').equals([dictId, word]).first()
  }

  async getProgressBatch(dictId: string, words: string[]): Promise<Map<string, TypingWordProgress>> {
    const progressMap = new Map<string, TypingWordProgress>()
    if (words.length === 0) return progressMap

    const progressList = await this.wordProgress
      .where('[dict+word]')
      .anyOf(words.map((word) => [dictId, word]))
      .toArray()

    for (const progress of progressList) {
      progressMap.set(progress.word, progress)
    }
    return progressMap
  }

  async initProgress(dictId: string, word: string): Promise<TypingWordProgress> {
    const existing = await this.getProgress(dictId, word)
    if (existing) return existing

    const progress = new WordProgress(word, dictId)
    progress.id = await this.wordProgress.put(progress)
    return progress
  }

  async initProgressBatch(dictId: string, words: string[]): Promise<void> {
    if (words.length === 0) return

    const existingProgress = await this.getProgressBatch(dictId, words)
    const newWords = words.filter((word) => !existingProgress.has(word))

    if (newWords.length > 0) {
      const newProgressList = newWords.map((word) => new WordProgress(word, dictId))
      await this.wordProgress.bulkAdd(newProgressList)
    }
  }

  async markAsMastered(dictId: string, word: string): Promise<TypingWordProgress> {
    let progress = await this.wordProgress.where('[dict+word]').equals([dictId, word]).first()

    if (!progress) {
      progress = new WordProgress(word, dictId)
    }

    progress.masteryLevel = MASTERY_LEVELS.MASTERED
    progress.nextReviewTime = now() + 30 * 24 * 60 * 60 * 1000
    progress.lastReviewTime = now()
    progress.correctCount++
    progress.streak++
    progress.id = await this.wordProgress.put(progress)

    return progress
  }

  async updateProgress(dictId: string, word: string, isCorrect: boolean, wrongCount: number): Promise<TypingWordProgress> {
    const progress = (await this.wordProgress.where('[dict+word]').equals([dictId, word]).first()) ?? new WordProgress(word, dictId)

    const wasFirstAttempt = (progress.reps || 0) === 0
    const { newLevel } = updateMasteryLevel(progress.masteryLevel, isCorrect, wrongCount)

    progress.masteryLevel = newLevel
    progress.nextReviewTime = getNextReviewTime(newLevel)
    progress.lastReviewTime = now()
    progress.reps = (progress.reps || 0) + 1

    if (wasFirstAttempt && !isCorrect) {
      progress.nextReviewTime = getTodayStartTime() + 24 * 60 * 60 * 1000
    }

    if (isCorrect) {
      progress.correctCount++
      progress.streak++
    } else {
      progress.wrongCount++
      progress.streak = 0
    }

    progress.id = await this.wordProgress.put(progress)

    return progress
  }

  async getNewWords(dictId: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
    if (!dictId || allWords.length === 0) return []

    const existingProgress = await this.wordProgress.where('dict').equals(dictId).toArray()
    const progressMap = new Map(existingProgress.map((progress) => [progress.word, progress]))

    return allWords
      .map((word, index) => ({ ...word, index }))
      .filter((word) => {
        const progress = progressMap.get(word.name)
        return !progress || progress.masteryLevel === MASTERY_LEVELS.NEW
      })
      .slice(0, limit)
  }

  async getDueWords(dictId: string, limit = 20): Promise<TypingWordProgress[]> {
    const allDictProgress = await this.wordProgress.where('dict').equals(dictId).toArray()
    const dueWords = allDictProgress.filter(
      (progress) => progress.nextReviewTime <= now() && progress.reps > 0 && progress.masteryLevel < MASTERY_LEVELS.MASTERED,
    )
    return dueWords.slice(0, limit)
  }

  async getDueWordsWithInfo(dictId: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
    const dueProgress = await this.getDueWords(dictId, limit)
    if (dueProgress.length === 0) return []

    const dueWordSet = new Set(dueProgress.map((progress) => progress.word))
    return allWords.map((word, index) => ({ ...word, index })).filter((word) => dueWordSet.has(word.name))
  }

  async getAllProgress(dictId: string): Promise<TypingWordProgress[]> {
    return this.wordProgress.where('dict').equals(dictId).toArray()
  }

  async getStats(dictId: string): Promise<{
    total: number
    new: number
    learning: number
    mastered: number
    due: number
  }> {
    const allProgress = await this.getAllProgress(dictId)

    return {
      total: allProgress.length,
      new: allProgress.filter((progress) => progress.masteryLevel === MASTERY_LEVELS.NEW).length,
      learning: allProgress.filter(
        (progress) => progress.masteryLevel > MASTERY_LEVELS.NEW && progress.masteryLevel < MASTERY_LEVELS.MASTERED,
      ).length,
      mastered: allProgress.filter((progress) => progress.masteryLevel >= MASTERY_LEVELS.MASTERED).length,
      due: allProgress.filter(
        (progress) => progress.nextReviewTime <= now() && progress.reps > 0 && progress.masteryLevel < MASTERY_LEVELS.MASTERED,
      ).length,
    }
  }
}

export const dexieWordProgressRepository = new DexieWordProgressRepository(defaultDb)

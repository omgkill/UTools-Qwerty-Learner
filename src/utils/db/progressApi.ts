import type { IWordProgress } from './progress'
import { MASTERY_LEVELS, WordProgress, getNextReviewTime, updateMasteryLevel } from './progress'
import type { Word, WordWithIndex } from '@/typings'
import { db } from './index'

export async function getWordProgress(dictID: string, word: string): Promise<IWordProgress | undefined> {
  return db.wordProgress.where('[dict+word]').equals([dictID, word]).first()
}

export async function getWordsProgress(dictID: string, words: string[]): Promise<Map<string, IWordProgress>> {
  const progressMap = new Map<string, IWordProgress>()
  if (!dictID || words.length === 0) return progressMap

  const progressList = await db.wordProgress
    .where('[dict+word]')
    .anyOf(words.map((w) => [dictID, w]))
    .toArray()

  for (const progress of progressList) {
    progressMap.set(progress.word, progress)
  }
  return progressMap
}

export async function updateWordProgress(
  dictID: string,
  word: string,
  isCorrect: boolean,
  wrongCount: number,
): Promise<IWordProgress> {
  let progress = await getWordProgress(dictID, word)

  if (!progress) {
    progress = new WordProgress(word, dictID)
  }

  const wasFirstAttempt = (progress.reps || 0) === 0
  const { newLevel } = updateMasteryLevel(progress.masteryLevel, isCorrect, wrongCount)

  progress.masteryLevel = newLevel
  progress.nextReviewTime = getNextReviewTime(newLevel)
  progress.lastReviewTime = Date.now()
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
    await db.wordProgress.update(progress.id, progress)
  } else {
    progress.id = await db.wordProgress.add(progress)
  }

  return progress
}

export async function initWordProgress(dictID: string, word: string): Promise<IWordProgress> {
  const existing = await getWordProgress(dictID, word)
  if (existing) return existing

  const progress = new WordProgress(word, dictID)
  progress.id = await db.wordProgress.add(progress)
  return progress
}

export async function batchInitWordProgress(dictID: string, words: string[]): Promise<void> {
  if (!dictID || words.length === 0) return

  const existingProgress = await getWordsProgress(dictID, words)
  const newWords = words.filter((w) => !existingProgress.has(w))

  if (newWords.length > 0) {
    const newProgressList = newWords.map((word) => new WordProgress(word, dictID))
    await db.wordProgress.bulkAdd(newProgressList)
  }
}

export async function markAsMastered(dictID: string, word: string): Promise<IWordProgress> {
  let progress = await getWordProgress(dictID, word)

  if (!progress) {
    progress = new WordProgress(word, dictID)
  }

  progress.masteryLevel = MASTERY_LEVELS.MASTERED
  progress.nextReviewTime = Date.now() + 30 * 24 * 60 * 60 * 1000
  progress.lastReviewTime = Date.now()
  progress.correctCount++
  progress.streak++

  if (progress.id) {
    await db.wordProgress.update(progress.id, progress)
  } else {
    progress.id = await db.wordProgress.add(progress)
  }

  return progress
}

export async function getDueWords(dictID: string, limit = 20): Promise<IWordProgress[]> {
  const now = Date.now()
  const allDictProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
  const dueWords = allDictProgress.filter(
    (p) => p.nextReviewTime <= now && p.reps > 0 && p.masteryLevel < MASTERY_LEVELS.MASTERED,
  )
  return dueWords.slice(0, limit)
}

export async function getDueWordsWithInfo(dictID: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
  const dueProgress = await getDueWords(dictID, limit)
  if (dueProgress.length === 0) return []

  const dueWordSet = new Set(dueProgress.map((p) => p.word))
  return allWords
    .map((word, index) => ({ ...word, index }))
    .filter((word) => dueWordSet.has(word.name))
}

export async function getNewWords(dictID: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
  if (!dictID || allWords.length === 0) return []

  const existingProgress = await db.wordProgress.where('dict').equals(dictID).toArray()
  const existingWords = new Set(existingProgress.map((p) => p.word))

  return allWords
    .map((word, index) => ({ ...word, index }))
    .filter((word) => !existingWords.has(word.name))
    .slice(0, limit)
}

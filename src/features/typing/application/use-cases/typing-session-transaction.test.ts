import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyRecordRepository, TypingStateRepository, WordProgressRepository } from '../ports'
import { completeCurrentWord, loadNormalTypingSession, markCurrentWordMastered, saveNormalTypingSession, startTypingSession } from '.'
import type { TypingDailyRecord, TypingStateSnapshot, TypingWordProgress } from '../../domain'
import type { Word, WordWithIndex } from '@/typings'
import type { MasteryLevel } from '@/utils/db/progress'
import { DailyRecord, MASTERY_LEVELS, WordProgress, getNextReviewTime, getTodayDate, updateMasteryLevel } from '@/utils/db/progress'
import { getTodayStartTime, now, resetTimeDiff, setTimeTo } from '@/utils/timeService'

const dictId = 'typing-session-test'

function createWordList(count: number): Word[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `word${index + 1}`,
    trans: [`meaning-${index + 1}`],
    usphone: '',
    ukphone: '',
  }))
}

class InMemoryWordProgressRepository implements WordProgressRepository {
  private progressMap = new Map<string, TypingWordProgress>()

  async getProgress(_dictId: string, word: string): Promise<TypingWordProgress | undefined> {
    return this.progressMap.get(word)
  }

  async getProgressBatch(_dictId: string, words: string[]): Promise<Map<string, TypingWordProgress>> {
    return new Map(words.flatMap((word) => {
      const progress = this.progressMap.get(word)
      return progress ? [[word, progress] as const] : []
    }))
  }

  async initProgress(dictIdValue: string, word: string): Promise<TypingWordProgress> {
    const existing = this.progressMap.get(word)
    if (existing) {
      return existing
    }

    const progress = new WordProgress(word, dictIdValue)
    this.progressMap.set(word, progress)
    return progress
  }

  async initProgressBatch(dictIdValue: string, words: string[]): Promise<void> {
    await Promise.all(words.map((word) => this.initProgress(dictIdValue, word)))
  }

  async markAsMastered(dictIdValue: string, word: string): Promise<TypingWordProgress> {
    const progress = (await this.getProgress(dictIdValue, word)) ?? new WordProgress(word, dictIdValue)
    progress.masteryLevel = MASTERY_LEVELS.MASTERED
    progress.nextReviewTime = now() + 30 * 24 * 60 * 60 * 1000
    progress.lastReviewTime = now()
    progress.correctCount += 1
    progress.streak += 1
    this.progressMap.set(word, progress)
    return progress
  }

  async updateProgress(dictIdValue: string, word: string, isCorrect: boolean, wrongCount: number): Promise<TypingWordProgress> {
    const progress = (await this.getProgress(dictIdValue, word)) ?? new WordProgress(word, dictIdValue)
    const wasFirstAttempt = progress.reps === 0
    const { newLevel } = updateMasteryLevel(progress.masteryLevel as MasteryLevel, isCorrect, wrongCount)

    progress.masteryLevel = newLevel
    progress.nextReviewTime = getNextReviewTime(newLevel)
    progress.lastReviewTime = now()
    progress.reps += 1

    if (wasFirstAttempt && !isCorrect) {
      progress.nextReviewTime = getTodayStartTime() + 24 * 60 * 60 * 1000
    }

    if (isCorrect) {
      progress.correctCount += 1
      progress.streak += 1
    } else {
      progress.wrongCount += 1
      progress.streak = 0
    }

    this.progressMap.set(word, progress)
    return progress
  }

  async getNewWords(_dictId: string, allWords: Word[], limit = 20): Promise<WordWithIndex[]> {
    return allWords.map((word, index) => ({ ...word, index })).slice(0, limit)
  }

  async getAllProgress(): Promise<TypingWordProgress[]> {
    return [...this.progressMap.values()]
  }

  async getStats(): Promise<{ total: number; new: number; learning: number; mastered: number; due: number }> {
    const allProgress = await this.getAllProgress()
    return {
      total: allProgress.length,
      new: allProgress.filter((progress) => progress.masteryLevel === MASTERY_LEVELS.NEW).length,
      learning: allProgress.filter((progress) => progress.masteryLevel > MASTERY_LEVELS.NEW && progress.masteryLevel < MASTERY_LEVELS.MASTERED).length,
      mastered: allProgress.filter((progress) => progress.masteryLevel >= MASTERY_LEVELS.MASTERED).length,
      due: allProgress.filter((progress) => progress.nextReviewTime <= now() && progress.reps > 0 && progress.masteryLevel < MASTERY_LEVELS.MASTERED).length,
    }
  }

  seedDueWord(word: string, masteryLevel: MasteryLevel = MASTERY_LEVELS.LEARNED) {
    const progress = new WordProgress(word, dictId)
    progress.masteryLevel = masteryLevel
    progress.reps = Math.max(1, masteryLevel)
    progress.nextReviewTime = now() - 1000
    this.progressMap.set(word, progress)
  }
}

class InMemoryDailyRecordRepository implements DailyRecordRepository {
  private record: TypingDailyRecord = new DailyRecord(dictId, getTodayDate())

  async getTodayRecord(): Promise<TypingDailyRecord> {
    return this.record
  }

  async ensureTodayRecord(): Promise<TypingDailyRecord> {
    return this.record
  }

  async incrementReviewed(_dictId: string, isExtra = false): Promise<TypingDailyRecord> {
    if (isExtra) {
      this.record.extraReviewedCount += 1
    } else {
      this.record.reviewedCount += 1
    }
    return this.record
  }

  async incrementLearned(): Promise<TypingDailyRecord> {
    this.record.learnedCount += 1
    return this.record
  }

  async incrementMastered(): Promise<TypingDailyRecord> {
    this.record.masteredCount += 1
    return this.record
  }

  async getRecord(): Promise<TypingDailyRecord | undefined> {
    return this.record
  }

  async getRecordsInRange(): Promise<TypingDailyRecord[]> {
    return [this.record]
  }

  seed(partial: Partial<TypingDailyRecord>) {
    this.record = { ...this.record, ...partial }
  }
}

class InMemoryTypingStateRepository implements TypingStateRepository {
  private states: TypingStateSnapshot[] = []
  private nextId = 1

  async getStates(dictId: string, date: string, sessionType?: 'normal' | 'repeat' | 'consolidate'): Promise<TypingStateSnapshot[]> {
    return this.states.filter((state) => {
      if (state.dict !== dictId || state.date !== date) {
        return false
      }
      if (!sessionType) {
        return true
      }
      return state.sessionType === sessionType
    })
  }

  async deleteStates(ids: number[]): Promise<void> {
    this.states = this.states.filter((state) => !ids.includes(state.id ?? -1))
  }

  async saveState(state: TypingStateSnapshot): Promise<number> {
    const id = state.id ?? this.nextId++
    this.states = this.states.filter((item) => item.id !== id)
    this.states.push({ ...state, id })
    return id
  }
}

describe('typing session transactions', () => {
  let wordProgressRepository: InMemoryWordProgressRepository
  let dailyRecordRepository: InMemoryDailyRecordRepository
  let typingStateRepository: InMemoryTypingStateRepository

  beforeEach(() => {
    resetTimeDiff()
    setTimeTo('2026-07-11T09:00:00.000Z')
    wordProgressRepository = new InMemoryWordProgressRepository()
    dailyRecordRepository = new InMemoryDailyRecordRepository()
    typingStateRepository = new InMemoryTypingStateRepository()
  })

  afterEach(() => {
    resetTimeDiff()
  })

  it('completes a new word using session word kind instead of inferring from reps', async () => {
    const wordList = createWordList(3)
    const session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(session.currentWordKind).toBe('new')

    const result = await completeCurrentWord({
      session,
      wordList,
      isCorrect: true,
      wrongCount: 0,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(result.progress?.reps).toBe(1)
    expect(result.session.todayCounts.learned).toBe(1)
    expect(result.session.currentIndex).toBe(1)
    expect(result.session.currentWord?.name).toBe('word2')
    expect(result.session.currentWordKind).toBe('new')
  })

  it('counts due words as reviewed and advances within the same session queue', async () => {
    const wordList = createWordList(3)
    wordProgressRepository.seedDueWord('word1')

    const session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(session.currentWordKind).toBe('review')

    const result = await completeCurrentWord({
      session,
      wordList,
      isCorrect: true,
      wrongCount: 0,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(result.session.todayCounts.reviewed).toBe(1)
    expect(result.session.currentWord?.name).toBe('word2')
  })

  it('counts a wrong-then-correct new word exactly once and still advances the session', async () => {
    const wordList = createWordList(2)
    const session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    const result = await completeCurrentWord({
      session,
      wordList,
      isCorrect: true,
      wrongCount: 3,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(result.progress?.reps).toBe(1)
    expect(result.progress?.correctCount).toBe(1)
    expect(result.session.todayCounts.learned).toBe(1)
    expect(result.session.todayCounts.reviewed).toBe(0)
    expect(result.session.currentWord?.name).toBe('word2')
  })

  it('marks current word mastered, appends a replacement word, and moves to the replacement', async () => {
    const wordList = createWordList(3)
    wordProgressRepository.seedDueWord('word1')
    dailyRecordRepository.seed({
      reviewedCount: 19,
      learnedCount: 0,
      masteredCount: 0,
    })

    const session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(session.queueWords.map((entry) => entry.word.name)).toEqual(['word1'])

    const result = await markCurrentWordMastered({
      session,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(result.session.todayCounts.mastered).toBe(1)
    expect(result.session.masteredCount).toBe(1)
    expect(result.session.currentWord?.name).toBe('word2')
    expect(result.session.currentWordKind).toBe('replacement')
    expect(result.session.queueWords.map((entry) => entry.word.name)).toEqual(['word1', 'word2'])
  })

  it('rebuilds the next batch after 20 due words without repeating completed words', async () => {
    const wordList = createWordList(25)
    wordList.forEach((word) => {
      wordProgressRepository.seedDueWord(word.name)
    })

    let session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    expect(session.queueWords).toHaveLength(20)
    expect(session.queueWords[0]?.word.name).toBe('word1')
    expect(session.queueWords[19]?.word.name).toBe('word20')

    for (let index = 0; index < 20; index += 1) {
      const result = await completeCurrentWord({
        session,
        wordList,
        isCorrect: true,
        wrongCount: 0,
        wordProgressRepository,
        dailyRecordRepository,
      })
      session = result.session
    }

    expect(session.queueWords.map((entry) => entry.word.name)).toEqual(['word21', 'word22', 'word23', 'word24', 'word25'])
    expect(session.currentIndex).toBe(0)
    expect(session.currentWord?.name).toBe('word21')
    expect(session.todayCounts.reviewed).toBe(20)
  })

  it('continues rolling due-word batches when more than 20 reviews are pending', async () => {
    const wordList = createWordList(45)
    wordList.forEach((word) => {
      wordProgressRepository.seedDueWord(word.name)
    })

    let session = await startTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    for (let index = 0; index < 20; index += 1) {
      const result = await completeCurrentWord({
        session,
        wordList,
        isCorrect: true,
        wrongCount: 0,
        wordProgressRepository,
        dailyRecordRepository,
      })
      session = result.session
    }

    expect(session.queueWords.map((entry) => entry.word.name)).toEqual([
      'word21',
      'word22',
      'word23',
      'word24',
      'word25',
      'word26',
      'word27',
      'word28',
      'word29',
      'word30',
      'word31',
      'word32',
      'word33',
      'word34',
      'word35',
      'word36',
      'word37',
      'word38',
      'word39',
      'word40',
    ])
    expect(session.currentIndex).toBe(0)
    expect(session.todayCounts.reviewed).toBe(20)
  })

  it('restores the normal session snapshot after refresh', async () => {
    const wordList = createWordList(3)

    let session = await loadNormalTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
      typingStateRepository,
      date: '2026-07-11',
    })

    const completed = await completeCurrentWord({
      session,
      wordList,
      isCorrect: true,
      wrongCount: 1,
      wordProgressRepository,
      dailyRecordRepository,
    })
    session = completed.session

    await saveNormalTypingSession({
      session,
      typingStateRepository,
      date: '2026-07-11',
    })

    const restored = await loadNormalTypingSession({
      dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
      typingStateRepository,
      date: '2026-07-11',
    })

    expect(restored.currentIndex).toBe(1)
    expect(restored.currentWord?.name).toBe('word2')
    expect(restored.currentWordKind).toBe('new')
    expect(restored.queueWords.map((entry) => `${entry.word.name}:${entry.kind}`)).toEqual([
      'word1:new',
      'word2:new',
      'word3:new',
    ])
    expect(restored.todayCounts.learned).toBe(1)
  })
})

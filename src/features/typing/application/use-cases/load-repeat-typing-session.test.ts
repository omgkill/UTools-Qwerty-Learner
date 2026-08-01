import { describe, expect, it } from 'vitest'
import type { TypingStateRepository, WordProgressRepository } from '../ports'
import { loadRepeatTypingSession } from './load-repeat-typing-session'
import type { TypingStateSessionType, TypingStateSnapshot, TypingWordProgress } from '../../domain'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'

class InMemoryWordProgressRepository implements WordProgressRepository {
  constructor(private readonly progressList: TypingWordProgress[]) {}

  async getAllProgress(): Promise<TypingWordProgress[]> {
    return this.progressList
  }

  async getProgress(): Promise<TypingWordProgress | undefined> {
    throw new Error('Method not implemented.')
  }

  async getProgressBatch(): Promise<Map<string, TypingWordProgress>> {
    throw new Error('Method not implemented.')
  }

  async initProgress(): Promise<TypingWordProgress> {
    throw new Error('Method not implemented.')
  }

  async initProgressBatch(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async markAsMastered(): Promise<TypingWordProgress> {
    throw new Error('Method not implemented.')
  }

  async updateProgress(): Promise<TypingWordProgress> {
    throw new Error('Method not implemented.')
  }

  async getNewWords(): Promise<WordWithIndex[]> {
    throw new Error('Method not implemented.')
  }

  async getStats(): Promise<{ total: number; new: number; learning: number; mastered: number; due: number }> {
    throw new Error('Method not implemented.')
  }
}

class InMemoryTypingStateRepository implements TypingStateRepository {
  private states: TypingStateSnapshot[] = []
  private nextId = 1

  async getStates(dictId: string, date: string, sessionType?: TypingStateSessionType): Promise<TypingStateSnapshot[]> {
    return this.states.filter((state) => {
      if (state.dict !== dictId || state.date !== date) {
        return false
      }

      return sessionType ? (state.sessionType ?? 'repeat') === sessionType : true
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

  seed(state: TypingStateSnapshot) {
    const id = state.id ?? this.nextId++
    this.states.push({ ...state, id })
  }
}

function createWord(name: string, index: number): WordWithIndex {
  return {
    name,
    index,
    trans: [],
    usphone: '',
    ukphone: '',
  }
}

function createProgress(word: string, lastReviewTime: number): TypingWordProgress {
  return {
    word,
    dict: 'dict-1',
    masteryLevel: 1,
    nextReviewTime: lastReviewTime,
    lastReviewTime,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 0,
  }
}

describe('loadRepeatTypingSession', () => {
  it('builds and persists a repeat queue when no saved queue exists', async () => {
    const typingStateRepository = new InMemoryTypingStateRepository()
    const now = Date.now()
    const wordList: Word[] = [createWord('alpha', 0), createWord('beta', 1), createWord('gamma', 2)]

    const result = await loadRepeatTypingSession({
      dictId: 'dict-1',
      wordList,
      wordProgressRepository: new InMemoryWordProgressRepository([
        createProgress('beta', now),
        createProgress('gamma', now),
      ]),
      typingStateRepository,
    })

    expect(result?.words.map((word) => word.name)).toEqual(['beta', 'gamma'])
    expect(result?.currentIndex).toBe(0)

    const saved = await typingStateRepository.getStates('dict-1', getTodayDate(), 'repeat')
    expect(saved[0]?.learningWords.map((word) => word.name)).toEqual(['beta', 'gamma'])
  })
})

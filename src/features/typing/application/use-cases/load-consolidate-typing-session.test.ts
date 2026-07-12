import { describe, expect, it, vi } from 'vitest'
import type { TypingStateRepository, WordProgressRepository } from '../ports'
import {
  type LegacyConsolidateProgress,
  loadConsolidateTypingSession,
} from './load-consolidate-typing-session'
import type { TypingStateSessionType, TypingStateSnapshot, TypingWordProgress } from '../../domain'
import type { Word, WordWithIndex } from '@/typings'

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

function createProgress(word: string, masteryLevel: number): TypingWordProgress {
  return {
    word,
    dict: 'dict-1',
    masteryLevel,
    nextReviewTime: 0,
    lastReviewTime: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps: 0,
  }
}

describe('loadConsolidateTypingSession', () => {
  it('restores the saved queue order and clamps the index to the remaining words', async () => {
    const typingStateRepository = new InMemoryTypingStateRepository()
    typingStateRepository.seed({
      id: 1,
      dict: 'dict-1',
      date: '2026-07-12',
      sessionType: 'consolidate',
      isRepeatLearning: true,
      learningWords: [createWord('gamma', 2), createWord('alpha', 0), createWord('missing', 7)],
      currentIndex: 4,
    })

    const result = await loadConsolidateTypingSession({
      dictId: 'dict-1',
      date: '2026-07-12',
      wordList: [createWord('alpha', 0), createWord('beta', 1), createWord('gamma', 2)],
      wordProgressRepository: new InMemoryWordProgressRepository([
        createProgress('alpha', 1),
        createProgress('gamma', 2),
      ]),
      typingStateRepository,
    })

    expect(result).toEqual({
      words: [createWord('gamma', 2), createWord('alpha', 0)],
      currentIndex: 1,
    })
  })

  it('falls back to legacy local progress and clears it after migration', async () => {
    const typingStateRepository = new InMemoryTypingStateRepository()
    const clearLegacyProgress = vi.fn()
    const legacyProgress: LegacyConsolidateProgress = {
      dictId: 'dict-1',
      date: '2026-07-12',
      index: 1,
      wordNames: ['beta', 'alpha'],
    }

    const result = await loadConsolidateTypingSession({
      dictId: 'dict-1',
      date: '2026-07-12',
      wordList: [createWord('alpha', 0), createWord('beta', 1)],
      wordProgressRepository: new InMemoryWordProgressRepository([
        createProgress('alpha', 2),
        createProgress('beta', 3),
      ]),
      legacyProgress,
      clearLegacyProgress,
      typingStateRepository,
    })

    expect(result).toEqual({
      words: [createWord('beta', 1), createWord('alpha', 0)],
      currentIndex: 1,
    })
    expect(clearLegacyProgress).toHaveBeenCalledOnce()

    const saved = await typingStateRepository.getStates('dict-1', '2026-07-12', 'consolidate')
    expect(saved[0]?.learningWords.map((word) => word.name)).toEqual(['beta', 'alpha'])
  })

  it('creates a deterministic shuffled queue when no saved progress exists', async () => {
    const typingStateRepository = new InMemoryTypingStateRepository()
    const wordList: Word[] = [createWord('alpha', 0), createWord('beta', 1), createWord('gamma', 2), createWord('delta', 3)]
    const progressRepository = new InMemoryWordProgressRepository([
      createProgress('alpha', 1),
      createProgress('beta', 2),
      createProgress('gamma', 3),
      createProgress('delta', 4),
    ])

    const first = await loadConsolidateTypingSession({
      dictId: 'dict-1',
      date: '2026-07-12',
      wordList,
      wordProgressRepository: progressRepository,
      typingStateRepository,
    })

    const second = await loadConsolidateTypingSession({
      dictId: 'dict-2',
      date: '2026-07-12',
      wordList,
      wordProgressRepository: new InMemoryWordProgressRepository([
        { ...createProgress('alpha', 1), dict: 'dict-2' },
        { ...createProgress('beta', 2), dict: 'dict-2' },
        { ...createProgress('gamma', 3), dict: 'dict-2' },
        { ...createProgress('delta', 4), dict: 'dict-2' },
      ]),
      typingStateRepository: new InMemoryTypingStateRepository(),
    })

    expect(first?.words.map((word) => word.name)).not.toEqual(wordList.map((word) => word.name))
    expect(first?.words.map((word) => word.name)).not.toEqual(second?.words.map((word) => word.name))
  })
})

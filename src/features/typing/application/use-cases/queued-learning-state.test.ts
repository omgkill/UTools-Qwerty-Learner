import { describe, expect, it } from 'vitest'
import type { TypingStateRepository } from '../ports'
import { clearQueuedLearningState, getSavedQueuedLearningState, saveQueuedLearningState } from './queued-learning-state'
import type { TypingStateSessionType, TypingStateSnapshot } from '../../domain'
import type { WordWithIndex } from '@/typings'

class InMemoryTypingStateRepository implements TypingStateRepository {
  private states: TypingStateSnapshot[] = []
  private nextId = 1

  async getStates(dictId: string, date: string, sessionType?: TypingStateSessionType): Promise<TypingStateSnapshot[]> {
    return this.states.filter((state) => {
      if (state.dict !== dictId || state.date !== date) {
        return false
      }
      if (!sessionType) {
        return true
      }
      return (state.sessionType ?? 'repeat') === sessionType
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

describe('queued learning state use cases', () => {
  it('saves and restores repeat learning state', async () => {
    const repository = new InMemoryTypingStateRepository()

    await saveQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      learningWords: [createWord('alpha', 0), createWord('beta', 1)],
      currentIndex: 1,
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    const saved = await getSavedQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    expect(saved?.sessionType).toBe('repeat')
    expect(saved?.currentIndex).toBe(1)
    expect(saved?.learningWords.map((word) => word.name)).toEqual(['alpha', 'beta'])
  })

  it('keeps repeat and consolidate sessions isolated for the same dict and date', async () => {
    const repository = new InMemoryTypingStateRepository()

    await saveQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      learningWords: [createWord('alpha', 0)],
      currentIndex: 0,
      date: '2026-07-11',
      typingStateRepository: repository,
    })
    await saveQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'consolidate',
      learningWords: [createWord('beta', 1)],
      currentIndex: 0,
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    const repeat = await getSavedQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      date: '2026-07-11',
      typingStateRepository: repository,
    })
    const consolidate = await getSavedQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'consolidate',
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    expect(repeat?.learningWords.map((word) => word.name)).toEqual(['alpha'])
    expect(consolidate?.learningWords.map((word) => word.name)).toEqual(['beta'])
  })

  it('returns the latest snapshot and removes stale duplicates', async () => {
    const repository = new InMemoryTypingStateRepository()
    repository.seed({
      id: 1,
      dict: 'dict-1',
      date: '2026-07-11',
      sessionType: 'repeat',
      isRepeatLearning: true,
      learningWords: [createWord('alpha', 0)],
      currentIndex: 0,
    })
    repository.seed({
      id: 2,
      dict: 'dict-1',
      date: '2026-07-11',
      sessionType: 'repeat',
      isRepeatLearning: true,
      learningWords: [createWord('beta', 1)],
      currentIndex: 1,
    })

    const saved = await getSavedQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    const remaining = await repository.getStates('dict-1', '2026-07-11', 'repeat')

    expect(saved?.learningWords.map((word) => word.name)).toEqual(['beta'])
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.id).toBe(2)
  })

  it('clears a queued learning state by saving an empty inactive snapshot', async () => {
    const repository = new InMemoryTypingStateRepository()

    await saveQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      learningWords: [createWord('alpha', 0)],
      currentIndex: 0,
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    await clearQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    const saved = await getSavedQueuedLearningState({
      dictId: 'dict-1',
      sessionType: 'repeat',
      date: '2026-07-11',
      typingStateRepository: repository,
    })

    expect(saved?.isRepeatLearning).toBe(false)
    expect(saved?.learningWords).toEqual([])
    expect(saved?.currentIndex).toBe(0)
  })
})

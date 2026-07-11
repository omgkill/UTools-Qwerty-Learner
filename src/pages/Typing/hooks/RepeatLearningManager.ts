import { recordDataWrite } from '@/features/backup/application'
import type { TypingStateRepository } from '@/features/typing/application/ports'
import type { TypingStateSnapshot } from '@/features/typing/domain'
import { dexieTypingStateRepository } from '@/infra/repositories/typing-state.repository.dexie'
import type { WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'

export type SavedRepeatLearningState = TypingStateSnapshot

export type RepeatLearningState = {
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
}

const emptyState: RepeatLearningState = {
  isRepeatLearning: false,
  learningWords: [],
  currentIndex: 0,
}

const findLatestState = (states: SavedRepeatLearningState[]): SavedRepeatLearningState | null => {
  if (states.length === 0) return null

  return states.reduce((latest, current) => {
    const latestId = latest.id ?? 0
    const currentId = current.id ?? 0
    return currentId >= latestId ? current : latest
  })
}

export async function getSavedRepeatLearningState(
  dictId: string,
  date = getTodayDate(),
  typingStateRepository: TypingStateRepository = dexieTypingStateRepository,
): Promise<SavedRepeatLearningState | null> {
  const states = await typingStateRepository.getStates(dictId, date)

  const latest = findLatestState(states)
  if (!latest) return null

  const staleIds = states
    .filter((state) => state.id !== latest.id)
    .map((state) => state.id)
    .filter((id): id is number => typeof id === 'number')

  if (staleIds.length > 0) {
    await typingStateRepository.deleteStates(staleIds)
    recordDataWrite()
  }

  return latest
}

export class RepeatLearningManager {
  private state: RepeatLearningState = emptyState

  constructor(private typingStateRepository: TypingStateRepository = dexieTypingStateRepository) {}

  async initialize(dictId: string): Promise<SavedRepeatLearningState | null> {
    const saved = await getSavedRepeatLearningState(dictId, getTodayDate(), this.typingStateRepository)

    if (!saved || !saved.isRepeatLearning || saved.learningWords.length === 0) {
      this.state = emptyState
      return null
    }

    this.state = {
      isRepeatLearning: true,
      learningWords: saved.learningWords,
      currentIndex: saved.currentIndex,
    }

    return saved
  }

  async start(dictId: string, learningWords: WordWithIndex[]): Promise<void> {
    const nextState: SavedRepeatLearningState = {
      dict: dictId,
      date: getTodayDate(),
      isRepeatLearning: learningWords.length > 0,
      learningWords,
      currentIndex: 0,
    }

    this.state = {
      isRepeatLearning: nextState.isRepeatLearning,
      learningWords,
      currentIndex: 0,
    }

    await this.save(nextState)
  }

  async updateIndex(dictId: string, currentIndex: number): Promise<void> {
    if (!this.state.isRepeatLearning) return

    const nextState: SavedRepeatLearningState = {
      dict: dictId,
      date: getTodayDate(),
      isRepeatLearning: true,
      learningWords: this.state.learningWords,
      currentIndex,
    }

    this.state = {
      ...this.state,
      currentIndex,
    }

    await this.save(nextState)
  }

  async clear(dictId: string): Promise<void> {
    const nextState: SavedRepeatLearningState = {
      dict: dictId,
      date: getTodayDate(),
      isRepeatLearning: false,
      learningWords: [],
      currentIndex: 0,
    }

    this.state = {
      isRepeatLearning: false,
      learningWords: [],
      currentIndex: 0,
    }

    await this.save(nextState)
  }

  isRepeatLearning(): boolean {
    return this.state.isRepeatLearning
  }

  getLearningWords(): WordWithIndex[] {
    return this.state.learningWords
  }

  getCurrentIndex(): number {
    return this.state.currentIndex
  }

  getState(): RepeatLearningState | null {
    return this.state.isRepeatLearning ? this.state : null
  }

  private async save(state: SavedRepeatLearningState): Promise<void> {
    const existing = await getSavedRepeatLearningState(state.dict, state.date, this.typingStateRepository)

    const nextState = existing ? { ...state, id: existing.id } : state

    await this.typingStateRepository.saveState(nextState)
    recordDataWrite()
  }
}

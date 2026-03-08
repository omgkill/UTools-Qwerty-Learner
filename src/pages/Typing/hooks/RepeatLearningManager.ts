import type { WordWithIndex } from '@/types'
import { getTodayWords } from '@/utils/storage'
import { getTodayString } from '@/utils/timeService'

export type RepeatLearningState = {
  words: WordWithIndex[]
  index: number
}

export type SavedRepeatLearningState = {
  dictId: string
  words: WordWithIndex[]
  index: number
  savedAt: number
}

export class RepeatLearningManager {
  private state: Map<string, RepeatLearningState> = new Map()

  getState(dictId: string): RepeatLearningState | undefined {
    return this.state.get(dictId)
  }

  setState(dictId: string, state: RepeatLearningState): void {
    this.state.set(dictId, state)
  }

  clearState(dictId: string): void {
    this.state.delete(dictId)
  }

  updateIndex(dictId: string, index: number): void {
    const state = this.state.get(dictId)
    if (state) {
      state.index = index
    }
  }

  async initialize(dictId: string): Promise<{ learningWords: WordWithIndex[]; currentIndex: number } | null> {
    return null
  }

  async start(dictId: string, words: WordWithIndex[]): Promise<void> {
    const state: RepeatLearningState = {
      words,
      index: 0,
    }
    this.state.set(dictId, state)
  }
}

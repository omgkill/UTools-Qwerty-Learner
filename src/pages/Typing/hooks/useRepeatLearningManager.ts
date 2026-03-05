import { RepeatLearningManager } from './RepeatLearningManager'

export type { RepeatLearningState, SavedRepeatLearningState } from './RepeatLearningManager'

const globalManager = new RepeatLearningManager()

export function useRepeatLearningManager(): RepeatLearningManager {
  return globalManager
}

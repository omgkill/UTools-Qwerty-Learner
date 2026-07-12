export {
  completeCurrentWord,
  type CompleteCurrentWordParams,
  type CompleteCurrentWordResult,
} from './complete-current-word'
export { getConsolidateWords, type GetConsolidateWordsParams } from './get-consolidate-words'
export { getNextReplacementWord, type GetNextReplacementWordParams } from './get-next-replacement-word'
export {
  loadConsolidateTypingSession,
  type LegacyConsolidateProgress,
  type LoadConsolidateTypingSessionParams,
} from './load-consolidate-typing-session'
export { loadRepeatTypingSession, type LoadRepeatTypingSessionParams } from './load-repeat-typing-session'
export {
  clearNormalTypingSession,
  getSavedNormalTypingSession,
  loadNormalTypingSession,
  saveNormalTypingSession,
  type LoadNormalTypingSessionParams,
  type SavedNormalTypingSession,
} from './normal-typing-state'
export {
  clearQueuedLearningState,
  getSavedQueuedLearningState,
  saveQueuedLearningState,
  type SavedQueuedLearningState,
} from './queued-learning-state'
export { getRepeatLearningWords, type GetRepeatLearningWordsParams } from './get-repeat-learning-words'
export {
  markCurrentWordMastered,
  type MarkCurrentWordMasteredParams,
  type MarkCurrentWordMasteredResult,
} from './mark-current-word-mastered'
export { startTypingSession, type StartTypingSessionParams } from './start-typing-session'

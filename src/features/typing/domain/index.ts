export type {
  DetermineLearningTypeParams,
  DetermineLearningTypeResult,
  LearningState,
  LearningType,
  LetterMistakes,
  TypingDailyRecord,
  TypingWordProgress,
  TypingWordRecord,
  WordProgressInfo,
} from './types'
export { calculateNewWordQuota, calculateRemainingForTarget, determineLearningType, hasReachedDailyTarget } from './learning-rules'
export { DEFAULT_DAILY_LIMIT, LEARNING_CONFIG, MASTERY_LEVELS, REVIEW_INTERVALS, getDailyLimit, setDailyLimit } from './learning-config'

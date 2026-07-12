import { getSavedQueuedLearningState, saveQueuedLearningState } from './queued-learning-state'
import { getRepeatLearningWords } from './get-repeat-learning-words'
import type { TypingStateRepository, WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'

export type LoadedQueuedTypingSession = {
  words: WordWithIndex[]
  currentIndex: number
}

export type LoadRepeatTypingSessionParams = {
  dictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
  typingStateRepository?: TypingStateRepository
}

export async function loadRepeatTypingSession(
  params: LoadRepeatTypingSessionParams,
): Promise<LoadedQueuedTypingSession | null> {
  const { dictId, wordList, wordProgressRepository, typingStateRepository } = params

  const savedState = await getSavedQueuedLearningState({
    dictId,
    sessionType: 'repeat',
    typingStateRepository,
  })

  if (savedState && savedState.learningWords.length > 0) {
    return {
      words: savedState.learningWords,
      currentIndex: clampIndex(savedState.currentIndex, savedState.learningWords.length),
    }
  }

  const words = await getRepeatLearningWords({
    currentDictId: dictId,
    wordList,
    wordProgressRepository,
  })

  if (words.length === 0) {
    return null
  }

  await saveQueuedLearningState({
    dictId,
    sessionType: 'repeat',
    learningWords: words,
    currentIndex: 0,
    typingStateRepository,
  })

  return {
    words,
    currentIndex: 0,
  }
}

function clampIndex(index: number, wordCount: number): number {
  if (wordCount <= 0) {
    return 0
  }

  return Math.min(index, wordCount - 1)
}

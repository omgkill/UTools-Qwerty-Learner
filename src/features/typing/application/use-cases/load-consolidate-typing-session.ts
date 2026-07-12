import { getConsolidateWords } from './get-consolidate-words'
import { getSavedQueuedLearningState, saveQueuedLearningState } from './queued-learning-state'
import type { TypingStateRepository, WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'

export type LegacyConsolidateProgress = {
  dictId: string
  date: string
  index: number
  wordNames: string[]
}

export type LoadConsolidateTypingSessionParams = {
  dictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
  date?: string
  legacyProgress?: LegacyConsolidateProgress | null
  clearLegacyProgress?: () => void
  typingStateRepository?: TypingStateRepository
}

export async function loadConsolidateTypingSession(
  params: LoadConsolidateTypingSessionParams,
): Promise<LoadedConsolidateTypingSession | null> {
  const {
    dictId,
    wordList,
    wordProgressRepository,
    date = getTodayDate(),
    legacyProgress,
    clearLegacyProgress,
    typingStateRepository,
  } = params

  const learnedWords = await getConsolidateWords({
    dictId,
    wordList,
    wordProgressRepository,
  })

  if (learnedWords.length === 0) {
    return null
  }

  const savedState = await getSavedQueuedLearningState({
    dictId,
    sessionType: 'consolidate',
    date,
    typingStateRepository,
  })

  const restoredSession = savedState
    ? restoreQueuedSession({
        availableWords: learnedWords,
        orderedNames: savedState.learningWords.map((word) => word.name),
        currentIndex: savedState.currentIndex,
      })
    : null

  if (restoredSession) {
    await saveQueuedLearningState({
      dictId,
      sessionType: 'consolidate',
      learningWords: restoredSession.words,
      currentIndex: restoredSession.currentIndex,
      date,
      typingStateRepository,
    })

    return restoredSession
  }

  const restoredLegacySession =
    legacyProgress && legacyProgress.wordNames.length > 0
      ? restoreQueuedSession({
          availableWords: learnedWords,
          orderedNames: legacyProgress.wordNames,
          currentIndex: legacyProgress.index,
        })
      : null

  if (restoredLegacySession) {
    await saveQueuedLearningState({
      dictId,
      sessionType: 'consolidate',
      learningWords: restoredLegacySession.words,
      currentIndex: restoredLegacySession.currentIndex,
      date,
      typingStateRepository,
    })
    clearLegacyProgress?.()
    return restoredLegacySession
  }

  const shuffledWords = shuffleWithSeed(learnedWords, `${dictId}-${date}`)

  await saveQueuedLearningState({
    dictId,
    sessionType: 'consolidate',
    learningWords: shuffledWords,
    currentIndex: 0,
    date,
    typingStateRepository,
  })

  return {
    words: shuffledWords,
    currentIndex: 0,
  }
}

type LoadedConsolidateTypingSession = {
  words: WordWithIndex[]
  currentIndex: number
}

function restoreQueuedSession(params: {
  availableWords: WordWithIndex[]
  orderedNames: string[]
  currentIndex: number
}): LoadedConsolidateTypingSession | null {
  const { availableWords, orderedNames, currentIndex } = params
  const wordsByName = new Map(availableWords.map((word) => [word.name, word]))
  const restoredWords = orderedNames
    .map((name) => wordsByName.get(name))
    .filter((word): word is WordWithIndex => word !== undefined)

  if (restoredWords.length === 0) {
    return null
  }

  return {
    words: restoredWords,
    currentIndex: clampIndex(currentIndex, restoredWords.length),
  }
}

function clampIndex(index: number, wordCount: number): number {
  if (wordCount <= 0) {
    return 0
  }

  return Math.min(index, wordCount - 1)
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash &= hash
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    const j = Math.abs(hash) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

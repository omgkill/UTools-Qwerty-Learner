import type { QueuedLearningSessionType, TypingStateSnapshot } from '../../domain'
import type { TypingStateRepository } from '../ports'
import { recordDataWrite } from '@/features/backup/application'
import { dexieTypingStateRepository } from '@/infra/repositories/typing-state.repository.dexie'
import type { WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'

export type SavedQueuedLearningState = TypingStateSnapshot & {
  sessionType: QueuedLearningSessionType
}

type GetSavedQueuedLearningStateParams = {
  dictId: string
  sessionType: QueuedLearningSessionType
  date?: string
  typingStateRepository?: TypingStateRepository
}

type SaveQueuedLearningStateParams = {
  dictId: string
  sessionType: QueuedLearningSessionType
  learningWords: WordWithIndex[]
  currentIndex: number
  date?: string
  typingStateRepository?: TypingStateRepository
}

type ClearQueuedLearningStateParams = {
  dictId: string
  sessionType: QueuedLearningSessionType
  date?: string
  typingStateRepository?: TypingStateRepository
}

export async function getSavedQueuedLearningState(
  params: GetSavedQueuedLearningStateParams,
): Promise<SavedQueuedLearningState | null> {
  const { dictId, sessionType, date = getTodayDate(), typingStateRepository = dexieTypingStateRepository } = params
  const states = await typingStateRepository.getStates(dictId, date, sessionType)

  const latest = findLatestState(states, sessionType)
  if (!latest) {
    return null
  }

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

export async function saveQueuedLearningState(params: SaveQueuedLearningStateParams): Promise<void> {
  const {
    dictId,
    sessionType,
    learningWords,
    currentIndex,
    date = getTodayDate(),
    typingStateRepository = dexieTypingStateRepository,
  } = params

  const existing = await getSavedQueuedLearningState({
    dictId,
    sessionType,
    date,
    typingStateRepository,
  })

  const nextState: SavedQueuedLearningState = {
    id: existing?.id,
    dict: dictId,
    date,
    sessionType,
    isRepeatLearning: learningWords.length > 0,
    learningWords,
    currentIndex,
  }

  await typingStateRepository.saveState(nextState)
  recordDataWrite()
}

export async function clearQueuedLearningState(params: ClearQueuedLearningStateParams): Promise<void> {
  const { dictId, sessionType, date = getTodayDate(), typingStateRepository = dexieTypingStateRepository } = params

  await saveQueuedLearningState({
    dictId,
    sessionType,
    learningWords: [],
    currentIndex: 0,
    date,
    typingStateRepository,
  })
}

function findLatestState(
  states: TypingStateSnapshot[],
  sessionType: QueuedLearningSessionType,
): SavedQueuedLearningState | null {
  if (states.length === 0) {
    return null
  }

  return states.reduce<SavedQueuedLearningState | null>((latest, current) => {
    const normalizedCurrent = normalizeState(current, sessionType)
    if (!latest) {
      return normalizedCurrent
    }

    const latestId = latest.id ?? 0
    const currentId = normalizedCurrent.id ?? 0
    return currentId >= latestId ? normalizedCurrent : latest
  }, null)
}

function normalizeState(state: TypingStateSnapshot, sessionType: QueuedLearningSessionType): SavedQueuedLearningState {
  return {
    ...state,
    sessionType,
  }
}

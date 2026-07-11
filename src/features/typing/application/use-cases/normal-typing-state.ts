import type { LearningType, TypingSession, TypingSessionQueueItem, TypingStateSnapshot } from '../../domain'
import type { DailyRecordRepository, TypingStateRepository, WordProgressRepository } from '../ports'
import { recordDataWrite } from '@/features/backup/application'
import { dexieTypingStateRepository } from '@/infra/repositories/typing-state.repository.dexie'
import type { Word } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'
import { startTypingSession } from './start-typing-session'

export type SavedNormalTypingSession = TypingStateSnapshot & {
  sessionType: 'normal'
  queueWords: TypingSessionQueueItem[]
  learningType: LearningType
  todayCounts: TypingSession['todayCounts']
  dueCount: number
  newCount: number
  masteredCount: number
  isFinished: boolean
}

export type LoadNormalTypingSessionParams = {
  dictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
  typingStateRepository?: TypingStateRepository
  date?: string
}

export async function loadNormalTypingSession(params: LoadNormalTypingSessionParams): Promise<TypingSession> {
  const { dictId, wordList, wordProgressRepository, dailyRecordRepository } = params

  const saved = await getSavedNormalTypingSession({
    dictId,
    typingStateRepository: params.typingStateRepository,
    date: params.date,
  })

  if (saved) {
    return saved
  }

  const session = await startTypingSession({
    dictId,
    wordList,
    wordProgressRepository,
    dailyRecordRepository,
  })

  if (!session.isFinished) {
    await saveNormalTypingSession({
      session,
      typingStateRepository: params.typingStateRepository,
      date: params.date,
    })
  }

  return session
}

export async function getSavedNormalTypingSession(params: {
  dictId: string
  typingStateRepository?: TypingStateRepository
  date?: string
}): Promise<TypingSession | null> {
  const { dictId, typingStateRepository = dexieTypingStateRepository, date = getTodayDate() } = params
  const states = await typingStateRepository.getStates(dictId, date, 'normal')
  const latest = findLatestNormalState(states)

  if (!latest || latest.queueWords.length === 0 || latest.isFinished) {
    const staleIds = states
      .map((state) => state.id)
      .filter((id): id is number => typeof id === 'number')

    if (staleIds.length > 0) {
      await typingStateRepository.deleteStates(staleIds)
      recordDataWrite()
    }
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

  return toTypingSession(latest)
}

export async function saveNormalTypingSession(params: {
  session: TypingSession
  typingStateRepository?: TypingStateRepository
  date?: string
}): Promise<void> {
  const { session, typingStateRepository = dexieTypingStateRepository, date = getTodayDate() } = params

  const existing = await getLatestNormalSnapshot({
    dictId: session.dictId,
    typingStateRepository,
    date,
  })

  const nextState: SavedNormalTypingSession = {
    id: existing?.id,
    dict: session.dictId,
    date,
    sessionType: 'normal',
    isRepeatLearning: false,
    learningWords: session.queueWords.map((entry) => entry.word),
    queueWords: session.queueWords,
    currentIndex: session.currentIndex,
    currentWordKind: session.currentWordKind,
    learningType: session.learningType,
    todayCounts: session.todayCounts,
    dueCount: session.dueCount,
    newCount: session.newCount,
    masteredCount: session.masteredCount,
    isFinished: session.isFinished,
  }

  await typingStateRepository.saveState(nextState)
  recordDataWrite()
}

export async function clearNormalTypingSession(params: {
  dictId: string
  typingStateRepository?: TypingStateRepository
  date?: string
}): Promise<void> {
  const { dictId, typingStateRepository = dexieTypingStateRepository, date = getTodayDate() } = params
  const latest = await getLatestNormalSnapshot({
    dictId,
    typingStateRepository,
    date,
  })

  if (!latest?.id) {
    return
  }

  await typingStateRepository.deleteStates([latest.id])
  recordDataWrite()
}

async function getLatestNormalSnapshot(params: {
  dictId: string
  typingStateRepository: TypingStateRepository
  date: string
}): Promise<SavedNormalTypingSession | null> {
  const states = await params.typingStateRepository.getStates(params.dictId, params.date, 'normal')
  return findLatestNormalState(states)
}

function findLatestNormalState(states: TypingStateSnapshot[]): SavedNormalTypingSession | null {
  if (states.length === 0) {
    return null
  }

  return states.reduce<SavedNormalTypingSession | null>((latest, state) => {
    const normalized = normalizeNormalState(state)
    if (!normalized) {
      return latest
    }

    if (!latest) {
      return normalized
    }

    const latestId = latest.id ?? 0
    const currentId = normalized.id ?? 0
    return currentId >= latestId ? normalized : latest
  }, null)
}

function normalizeNormalState(state: TypingStateSnapshot): SavedNormalTypingSession | null {
  if ((state.sessionType ?? 'repeat') !== 'normal') {
    return null
  }

  if (!state.queueWords || !state.learningType || !state.todayCounts) {
    return null
  }

  return {
    ...state,
    sessionType: 'normal',
    queueWords: state.queueWords,
    learningType: state.learningType,
    todayCounts: state.todayCounts,
    dueCount: state.dueCount ?? 0,
    newCount: state.newCount ?? 0,
    masteredCount: state.masteredCount ?? 0,
    isFinished: state.isFinished ?? state.queueWords.length === 0,
  }
}

function toTypingSession(snapshot: SavedNormalTypingSession): TypingSession {
  const safeIndex = Math.min(snapshot.currentIndex, Math.max(snapshot.queueWords.length - 1, 0))
  const currentEntry = snapshot.queueWords[safeIndex]

  return {
    dictId: snapshot.dict,
    mode: 'normal',
    learningType: snapshot.learningType,
    queueWords: snapshot.queueWords,
    currentIndex: safeIndex,
    currentWord: currentEntry?.word,
    currentWordKind: currentEntry?.kind,
    todayCounts: snapshot.todayCounts,
    dueCount: snapshot.dueCount,
    newCount: snapshot.newCount,
    masteredCount: snapshot.masteredCount,
    isFinished: snapshot.isFinished,
  }
}

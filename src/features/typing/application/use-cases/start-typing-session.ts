import type { TypingSession } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository } from '../ports'
import { buildTypingSession, createEmptyTypingSession } from './typing-session'
import type { Word } from '@/typings'

export type StartTypingSessionParams = {
  dictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
}

export async function startTypingSession(params: StartTypingSessionParams): Promise<TypingSession> {
  const { dictId, wordList, wordProgressRepository, dailyRecordRepository } = params

  if (!dictId || wordList.length === 0) {
    return createEmptyTypingSession(dictId)
  }

  const [dailyRecord, allProgress] = await Promise.all([
    dailyRecordRepository.ensureTodayRecord(dictId),
    wordProgressRepository.getAllProgress(dictId),
  ])

  return buildTypingSession({
    dictId,
    wordList,
    dailyRecord,
    allProgress,
  })
}

import type { TypingSession, TypingWordProgress } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository } from '../ports'
import { startTypingSession } from './start-typing-session'
import { advanceQueueSession } from './typing-session'
import type { Word } from '@/typings'

export type CompleteCurrentWordParams = {
  session: TypingSession
  wordList: Word[]
  isCorrect: boolean
  wrongCount: number
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
}

export type CompleteCurrentWordResult = {
  progress: TypingWordProgress | undefined
  session: TypingSession
}

export async function completeCurrentWord(params: CompleteCurrentWordParams): Promise<CompleteCurrentWordResult> {
  const { session, wordList, isCorrect, wrongCount, wordProgressRepository, dailyRecordRepository } = params
  const currentEntry = session.queueWords[session.currentIndex]

  if (!session.dictId || !currentEntry) {
    return {
      progress: undefined,
      session,
    }
  }

  const progress = await wordProgressRepository.updateProgress(session.dictId, currentEntry.word.name, isCorrect, wrongCount)

  let todayRecord = await dailyRecordRepository.ensureTodayRecord(session.dictId)
  if (isCorrect) {
    switch (currentEntry.kind) {
      case 'new':
      case 'replacement':
        todayRecord = await dailyRecordRepository.incrementLearned(session.dictId)
        break
      case 'review':
        todayRecord = await dailyRecordRepository.incrementReviewed(session.dictId, false)
        break
      case 'extra_review':
        todayRecord = await dailyRecordRepository.incrementReviewed(session.dictId, true)
        break
    }
  }

  const nextSession = advanceQueueSession(session, {
    todayCounts: todayRecord,
  })

  if (nextSession) {
    return {
      progress,
      session: nextSession,
    }
  }

  return {
    progress,
    session: await startTypingSession({
      dictId: session.dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    }),
  }
}

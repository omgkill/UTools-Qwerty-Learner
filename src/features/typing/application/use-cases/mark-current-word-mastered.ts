import type { TypingSession } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository } from '../ports'
import { getNextReplacementWord } from './get-next-replacement-word'
import { startTypingSession } from './start-typing-session'
import { advanceQueueSession } from './typing-session'
import type { Word } from '@/typings'

export type MarkCurrentWordMasteredParams = {
  session: TypingSession
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
}

export type MarkCurrentWordMasteredResult = {
  session: TypingSession
}

export async function markCurrentWordMastered(
  params: MarkCurrentWordMasteredParams,
): Promise<MarkCurrentWordMasteredResult> {
  const { session, wordList, wordProgressRepository, dailyRecordRepository } = params
  const currentEntry = session.queueWords[session.currentIndex]

  if (!session.dictId || !currentEntry) {
    return { session }
  }

  await wordProgressRepository.markAsMastered(session.dictId, currentEntry.word.name)
  const todayRecord = await dailyRecordRepository.incrementMastered(session.dictId)

  const replacementWord = await getNextReplacementWord({
    dictId: session.dictId,
    wordList,
    currentLearningWords: session.queueWords.map((entry) => entry.word),
    wordProgressRepository,
  })

  const nextQueueWords = replacementWord
    ? [...session.queueWords, { word: replacementWord, kind: 'replacement' as const }]
    : session.queueWords

  const nextSession = advanceQueueSession(session, {
    queueWords: nextQueueWords,
    todayCounts: todayRecord,
    masteredCount: session.masteredCount + 1,
  })

  if (nextSession) {
    return {
      session: nextSession,
    }
  }

  return {
    session: await startTypingSession({
      dictId: session.dictId,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    }),
  }
}

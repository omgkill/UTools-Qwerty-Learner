import type { TypingSession } from '../../domain'
import type { DailyRecordRepository, WordProgressRepository } from '../ports'
import { getNextReplacementWord } from './get-next-replacement-word'
import { startTypingSession } from './start-typing-session'
import { advanceQueueSession } from './typing-session'
import type { Word } from '@/typings'
import { now } from '@/utils/timeService'

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
  await dailyRecordRepository.incrementMastered(session.dictId)
  const todayRecord = await dailyRecordRepository.recordWordDetail(session.dictId, {
    word: currentEntry.word.name,
    wrongCount: 0,
    type: 'mastered',
    timeStamp: now(),
  })

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

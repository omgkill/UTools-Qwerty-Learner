import { determineLearningType, filterDueWords, isWordNew } from '../../domain'
import type {
  TypingDailyRecord,
  TypingSession,
  TypingSessionQueueItem,
  TypingWordKind,
  TypingWordProgress,
} from '../../domain'
import type { Word, WordWithIndex } from '@/typings'
import { MASTERY_LEVELS } from '@/utils/db/progress'
import { now } from '@/utils/timeService'

type BuildTypingSessionParams = {
  dictId: string
  wordList: Word[]
  dailyRecord: TypingDailyRecord
  allProgress: TypingWordProgress[]
}

export function createEmptyTypingSession(dictId: string): TypingSession {
  return {
    dictId,
    mode: 'normal',
    learningType: 'complete',
    queueWords: [],
    currentIndex: 0,
    currentWord: undefined,
    currentWordKind: undefined,
    todayCounts: {
      learned: 0,
      reviewed: 0,
      extraReviewed: 0,
      mastered: 0,
    },
    dueCount: 0,
    newCount: 0,
    masteredCount: 0,
    isFinished: true,
  }
}

export function buildTypingSession(params: BuildTypingSessionParams): TypingSession {
  const { dictId, wordList, dailyRecord, allProgress } = params
  const indexedWords = wordList.map((word, index) => ({ ...word, index }))
  const progressMap = new Map(allProgress.map((progress) => [progress.word, progress]))

  const dueProgress = filterDueWords(allProgress, now())
  const dueWordSet = new Set(dueProgress.map((progress) => progress.word))
  const dueWords = indexedWords.filter((word) => dueWordSet.has(word.name))
  const newWords = indexedWords.filter((word) => isWordNew(progressMap.get(word.name)))

  const result = determineLearningType({
    dueWords,
    newWords,
    reviewedCount: dailyRecord.reviewedCount,
    learnedCount: dailyRecord.learnedCount,
    allProgress,
    wordList,
  })

  const queueWords = result.learningWords.map<TypingSessionQueueItem>((word) => ({
    word,
    kind: getWordKind(word.name, dueWordSet),
  }))

  const currentEntry = queueWords[0]

  return {
    dictId,
    mode: 'normal',
    learningType: result.learningType,
    queueWords,
    currentIndex: 0,
    currentWord: currentEntry?.word,
    currentWordKind: currentEntry?.kind,
    todayCounts: {
      learned: dailyRecord.learnedCount,
      reviewed: dailyRecord.reviewedCount,
      extraReviewed: dailyRecord.extraReviewedCount,
      mastered: dailyRecord.masteredCount,
    },
    dueCount: result.dueCount,
    newCount: result.newCount,
    masteredCount: allProgress.filter((progress) => progress.masteryLevel >= MASTERY_LEVELS.MASTERED).length,
    isFinished: queueWords.length === 0,
  }
}

export function advanceQueueSession(
  session: TypingSession,
  options?: {
    queueWords?: TypingSessionQueueItem[]
    todayCounts?: TypingSessionTodayCountsInput
    masteredCount?: number
  },
): TypingSession | null {
  const queueWords = options?.queueWords ?? session.queueWords
  const nextIndex = session.currentIndex + 1
  if (nextIndex >= queueWords.length) {
    return null
  }

  const currentEntry = queueWords[nextIndex]
  return {
    ...session,
    queueWords,
    currentIndex: nextIndex,
    currentWord: currentEntry.word,
    currentWordKind: currentEntry.kind,
    todayCounts: options?.todayCounts ? normalizeTodayCounts(options.todayCounts) : session.todayCounts,
    masteredCount: options?.masteredCount ?? session.masteredCount,
    isFinished: false,
  }
}

export function withUpdatedSessionCounts(
  session: TypingSession,
  options: {
    todayCounts: TypingSessionTodayCountsInput
    masteredCount?: number
  },
): TypingSession {
  return {
    ...session,
    todayCounts: normalizeTodayCounts(options.todayCounts),
    masteredCount: options.masteredCount ?? session.masteredCount,
  }
}

type TypingSessionTodayCountsInput = {
  learnedCount?: number
  reviewedCount?: number
  extraReviewedCount?: number
  masteredCount?: number
  learned?: number
  reviewed?: number
  extraReviewed?: number
  mastered?: number
}

function normalizeTodayCounts(counts: TypingSessionTodayCountsInput): TypingSession['todayCounts'] {
  return {
    learned: counts.learned ?? counts.learnedCount ?? 0,
    reviewed: counts.reviewed ?? counts.reviewedCount ?? 0,
    extraReviewed: counts.extraReviewed ?? counts.extraReviewedCount ?? 0,
    mastered: counts.mastered ?? counts.masteredCount ?? 0,
  }
}

function getWordKind(wordName: string, dueWordSet: Set<string>): TypingWordKind {
  return dueWordSet.has(wordName) ? 'review' : 'new'
}

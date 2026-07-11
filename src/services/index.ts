import type { TypingWordProgress } from '@/features/typing/domain'
import { determineLearningType } from '@/features/typing/domain'
import type { LearningType } from '@/features/typing/domain'
import { DexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { DexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayStartTime } from '@/utils/timeService'

export class WordProgressService extends DexieWordProgressRepository {}

export class DailyRecordService extends DexieDailyRecordRepository {}

export type TypingSessionParams = {
  wordList: Word[]
  reviewedCount: number
  learnedCount: number
  getDueWordsWithInfo: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
  getNewWords: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
  getWordProgress: (word: string) => Promise<TypingWordProgress | undefined>
}

export type TypingSessionResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
  masteredCount: number
}

export type ReplacementWordParams = {
  wordList: Word[]
  currentLearningWords: WordWithIndex[]
  getNewWords: (wordList: Word[], limit: number) => Promise<WordWithIndex[]>
}

export async function getNextReplacementWord(params: ReplacementWordParams): Promise<WordWithIndex | null> {
  const { wordList, currentLearningWords, getNewWords } = params
  if (wordList.length === 0) return null

  const existing = new Set(currentLearningWords.map((word) => word.name))
  const candidates = await getNewWords(wordList, 100)
  const next = candidates.find((word) => !existing.has(word.name))

  return next ?? null
}

export async function loadTypingSession(params: TypingSessionParams): Promise<TypingSessionResult> {
  const { wordList, reviewedCount, learnedCount, getDueWordsWithInfo, getNewWords, getWordProgress } = params
  const [dueWords, newWords] = await Promise.all([getDueWordsWithInfo(wordList, 1000), getNewWords(wordList, 1000)])

  const allProgress = await Promise.all(wordList.slice(0, 500).map(async (word) => getWordProgress(word.name)))

  const mastered = allProgress.filter((progress) => progress && progress.masteryLevel >= 7).length

  const result = determineLearningType({
    dueWords,
    newWords,
    reviewedCount,
    learnedCount,
    allProgress,
    wordList,
  })

  return {
    learningType: result.learningType,
    learningWords: result.learningWords,
    dueCount: result.dueCount,
    newCount: result.newCount,
    masteredCount: mastered,
  }
}

export type RepeatLearningParams = {
  currentDictId: string
  wordList: Word[]
  listWordRecordsInRange: (dictId: string, start: number, end: number) => Promise<{ word: string }[]>
}

export async function getRepeatLearningWords(params: RepeatLearningParams): Promise<WordWithIndex[]> {
  const { currentDictId, wordList, listWordRecordsInRange } = params
  if (!currentDictId || wordList.length === 0) {
    return []
  }

  const todayStart = getTodayStartTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  const todayRecords = await listWordRecordsInRange(currentDictId, todayStart, todayEnd)
  const todayWordNames = [...new Set(todayRecords.map((record) => record.word))]
  if (todayWordNames.length === 0) {
    return []
  }

  const repeatWords: WordWithIndex[] = []
  todayWordNames.forEach((wordName) => {
    const index = wordList.findIndex((word) => word.name === wordName)
    if (index !== -1) {
      repeatWords.push({ ...wordList[index], index })
    }
  })

  return repeatWords
}

export type MasteredFlowParams = {
  currentWord: WordWithIndex | undefined
  markAsMastered: (word: string) => Promise<TypingWordProgress>
  getNextNewWord: () => Promise<WordWithIndex | null>
  createWordRecord?: (word: string) => Promise<void>
}

export type MasteredFlowResult = {
  replacementWord: WordWithIndex | null
  shouldSkip: boolean
}

export async function handleMasteredFlow(params: MasteredFlowParams): Promise<MasteredFlowResult> {
  const { currentWord, markAsMastered, getNextNewWord, createWordRecord } = params
  if (!currentWord) {
    return { replacementWord: null, shouldSkip: false }
  }

  await markAsMastered(currentWord.name)

  if (createWordRecord) {
    await createWordRecord(currentWord.name)
  }

  const replacementWord = await getNextNewWord()

  return {
    replacementWord,
    shouldSkip: true,
  }
}

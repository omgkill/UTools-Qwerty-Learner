import type { TypingWordProgress } from '@/features/typing/domain'
import { determineLearningType } from '@/features/typing/domain'
import type { LearningType } from '@/features/typing/domain'
import { DexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { DexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayStartTime, now } from '@/utils/timeService'

export class WordProgressService extends DexieWordProgressRepository {}

export class DailyRecordService extends DexieDailyRecordRepository {}

export type TypingSessionParams = {
  wordList: Word[]
  reviewedCount: number
  learnedCount: number
  getAllProgress: () => Promise<TypingWordProgress[]>
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
  getAllProgress: () => Promise<TypingWordProgress[]>
}

export async function getNextReplacementWord(params: ReplacementWordParams): Promise<WordWithIndex | null> {
  const { wordList, currentLearningWords, getAllProgress } = params
  if (wordList.length === 0) return null

  const existing = new Set(currentLearningWords.map((word) => word.name))
  const allProgress = await getAllProgress()
  const progressMap = new Map(allProgress.map((p) => [p.word, p]))

  // 使用 domain 层逻辑筛选新单词
  const candidates = wordList
    .map((word, index) => ({ ...word, index }))
    .filter((word) => {
      const progress = progressMap.get(word.name)
      return !progress || progress.masteryLevel < 7 // 未掌握的单词
    })

  const next = candidates.find((word) => !existing.has(word.name))
  return next ?? null
}

export async function loadTypingSession(params: TypingSessionParams): Promise<TypingSessionResult> {
  const { wordList, reviewedCount, learnedCount, getAllProgress } = params

  // 使用新的 domain 层逻辑
  const allProgress = await getAllProgress()
  const currentTime = now()  // ✅ 使用 timeService.now()，支持测试时间调整

  // 使用 domain 函数筛选到期单词
  const dueProgress = allProgress.filter(
    (progress) => progress.nextReviewTime <= currentTime && progress.reps > 0 && progress.masteryLevel < 7,
  )
  const dueWordSet = new Set(dueProgress.map((p) => p.word))
  const dueWords = wordList.map((word, index) => ({ ...word, index })).filter((word) => dueWordSet.has(word.name))

  // 使用 domain 函数筛选新单词
  const progressMap = new Map(allProgress.map((p) => [p.word, p]))
  const newWords = wordList
    .map((word, index) => ({ ...word, index }))
    .filter((word) => {
      const progress = progressMap.get(word.name)
      return !progress || progress.masteryLevel === 0
    })

  const mastered = allProgress.filter((progress) => progress.masteryLevel >= 7).length

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

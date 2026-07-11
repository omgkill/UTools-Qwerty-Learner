import { determineLearningType, filterDueWords, isWordNew } from '../../domain'
import type { LearningType } from '../../domain'
import type { WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'
import { now } from '@/utils/timeService'

export type GetTypingSessionParams = {
  dictId: string
  wordList: Word[]
  reviewedCount: number
  learnedCount: number
  wordProgressRepository: WordProgressRepository
}

export type TypingSessionResult = {
  learningType: LearningType
  learningWords: WordWithIndex[]
  dueCount: number
  newCount: number
  masteredCount: number
}

export async function getTypingSession(params: GetTypingSessionParams): Promise<TypingSessionResult> {
  const { dictId, wordList, reviewedCount, learnedCount, wordProgressRepository } = params

  // 获取所有进度数据（Repository只负责数据获取）
  const allProgress = await wordProgressRepository.getAllProgress(dictId)

  // Domain层逻辑：筛选到期单词
  const currentTime = now()
  const dueProgress = filterDueWords(allProgress, currentTime)
  const dueWordSet = new Set(dueProgress.map((p) => p.word))
  const dueWords = wordList.map((word, index) => ({ ...word, index })).filter((word) => dueWordSet.has(word.name))

  // Domain层逻辑：筛选新单词
  const progressMap = new Map(allProgress.map((p) => [p.word, p]))
  const newWords = wordList.map((word, index) => ({ ...word, index })).filter((word) => isWordNew(progressMap.get(word.name)))

  const mastered = allProgress.filter((progress) => progress.masteryLevel >= 7).length

  // Domain层逻辑：配额分配
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

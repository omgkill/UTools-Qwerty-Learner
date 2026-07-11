import { determineLearningType } from '../../domain'
import type { LearningType, TypingWordProgress } from '../../domain'
import type { WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'

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

  const [dueWords, newWords] = await Promise.all([
    wordProgressRepository.getDueWordsWithInfo(dictId, wordList, 1000),
    wordProgressRepository.getNewWords(dictId, wordList, 1000),
  ])

  const allProgress = await Promise.all(wordList.slice(0, 500).map(async (word) => wordProgressRepository.getProgress(dictId, word.name)))

  const mastered = allProgress.filter((progress) => progress && progress.masteryLevel >= 7).length

  const result = determineLearningType({
    dueWords,
    newWords,
    reviewedCount,
    learnedCount,
    allProgress: allProgress as (TypingWordProgress | undefined)[],
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

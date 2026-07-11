import type { WordProgressRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayStartTime } from '@/utils/timeService'

export type GetRepeatLearningWordsParams = {
  currentDictId: string
  wordList: Word[]
  wordProgressRepository: WordProgressRepository
}

export async function getRepeatLearningWords(params: GetRepeatLearningWordsParams): Promise<WordWithIndex[]> {
  const { currentDictId, wordList, wordProgressRepository } = params
  if (!currentDictId || wordList.length === 0) {
    return []
  }

  const todayStart = getTodayStartTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  // 基于 WordProgress.lastReviewTime 判断今天学过的单词
  const allProgress = await wordProgressRepository.getAllProgress(currentDictId)
  const todayLearnedWords = allProgress.filter((progress) => progress.lastReviewTime >= todayStart && progress.lastReviewTime < todayEnd)

  if (todayLearnedWords.length === 0) {
    return []
  }

  const todayWordNames = new Set(todayLearnedWords.map((progress) => progress.word))
  const repeatWords: WordWithIndex[] = []
  todayWordNames.forEach((wordName) => {
    const index = wordList.findIndex((word) => word.name === wordName)
    if (index !== -1) {
      repeatWords.push({ ...wordList[index], index })
    }
  })

  return repeatWords
}

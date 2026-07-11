import type { WordRecordRepository } from '../ports'
import type { Word, WordWithIndex } from '@/typings'
import { getTodayStartTime } from '@/utils/timeService'

export type GetRepeatLearningWordsParams = {
  currentDictId: string
  wordList: Word[]
  wordRecordRepository: WordRecordRepository
}

export async function getRepeatLearningWords(params: GetRepeatLearningWordsParams): Promise<WordWithIndex[]> {
  const { currentDictId, wordList, wordRecordRepository } = params
  if (!currentDictId || wordList.length === 0) {
    return []
  }

  const todayStart = getTodayStartTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000
  const todayRecords = await wordRecordRepository.listWordRecordsInRange(currentDictId, todayStart, todayEnd)
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

import type { LetterMistakes } from '../../domain'
import type { WordRecordRepository } from '../ports'

export type SaveWordRecordParams = {
  dictId: string
  word: string
  wrongCount: number
  letterTimeArray: number[]
  letterMistake: LetterMistakes
  wordRecordRepository: WordRecordRepository
}

export async function saveWordRecord(params: SaveWordRecordParams): Promise<number> {
  const { dictId, word, wrongCount, letterTimeArray, letterMistake, wordRecordRepository } = params

  if (!dictId) {
    return -1
  }

  const timing = []
  for (let i = 1; i < letterTimeArray.length; i++) {
    timing.push(letterTimeArray[i] - letterTimeArray[i - 1])
  }

  return wordRecordRepository.addWordRecord({
    word,
    dictId,
    timing,
    wrongCount,
    mistakes: letterMistake,
  })
}

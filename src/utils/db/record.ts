import { getUTCUnixTimestamp } from '../index'

export interface IWordRecord {
  word: string
  timeStamp: number
  dict: string
  learning: number | null
  timing: number[]
  wrongCount: number
  mistakes: LetterMistakes
}

export interface LetterMistakes {
  [index: number]: string[]
}

export class WordRecord implements IWordRecord {
  word: string
  timeStamp: number
  dict: string
  learning: number | null
  timing: number[]
  wrongCount: number
  mistakes: LetterMistakes

  constructor(word: string, dict: string, learning: number | null, timing: number[], wrongCount: number, mistakes: LetterMistakes) {
    this.word = word
    this.timeStamp = getUTCUnixTimestamp()
    this.dict = dict
    this.learning = learning
    this.timing = timing
    this.wrongCount = wrongCount
    this.mistakes = mistakes
  }

  get totalTime() {
    return this.timing.reduce((acc, curr) => acc + curr, 0)
  }
}

export interface ILearningRecord {
  dict: string
  learning: number | null
  timeStamp: number
  time: number
  correctCount: number
  wrongCount: number
  wordCount: number
  correctWordIndexes: number[]
  wordNumber: number
  wordRecordIds: number[]
}

export class LearningRecord implements ILearningRecord {
  dict: string
  learning: number | null
  timeStamp: number
  time: number
  correctCount: number
  wrongCount: number
  wordCount: number
  correctWordIndexes: number[]
  wordNumber: number
  wordRecordIds: number[]

  constructor(
    dict: string,
    learning: number | null,
    time: number,
    correctCount: number,
    wrongCount: number,
    wordCount: number,
    correctWordIndexes: number[],
    wordNumber: number,
    wordRecordIds: number[],
  ) {
    this.dict = dict
    this.learning = learning
    this.timeStamp = getUTCUnixTimestamp()
    this.time = time
    this.correctCount = correctCount
    this.wrongCount = wrongCount
    this.wordCount = wordCount
    this.correctWordIndexes = correctWordIndexes
    this.wordNumber = wordNumber
    this.wordRecordIds = wordRecordIds
  }

  get wpm() {
    if (this.time === 0) return 0
    return Math.round((this.wordCount / this.time) * 60)
  }

  get inputAccuracy() {
    const total = this.correctCount + this.wrongCount
    if (total === 0) return 0
    return Math.round((this.correctCount / total) * 100)
  }

  get wordAccuracy() {
    if (this.wordNumber === 0) return 0
    return Math.round((this.correctWordIndexes.length / this.wordNumber) * 100)
  }
}

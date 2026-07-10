import type { WordWithIndex } from '@/typings'

export interface ITypingState {
  id?: number
  dict: string
  date: string
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
}

export class TypingState implements ITypingState {
  id?: number
  dict: string
  date: string
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number

  constructor(dict: string, date: string, learningWords: WordWithIndex[] = [], currentIndex = 0) {
    this.dict = dict
    this.date = date
    this.isRepeatLearning = learningWords.length > 0
    this.learningWords = learningWords
    this.currentIndex = currentIndex
  }
}

import type { TypingStateSnapshot } from '@/features/typing/domain'
import type { WordWithIndex } from '@/typings'

export type ITypingState = TypingStateSnapshot

export class TypingState implements ITypingState {
  id?: number
  dict: string
  date: string
  sessionType?: 'normal' | 'repeat' | 'consolidate'
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number

  constructor(dict: string, date: string, learningWords: WordWithIndex[] = [], currentIndex = 0, sessionType: 'normal' | 'repeat' | 'consolidate' = 'repeat') {
    this.dict = dict
    this.date = date
    this.sessionType = sessionType
    this.isRepeatLearning = learningWords.length > 0
    this.learningWords = learningWords
    this.currentIndex = currentIndex
  }
}

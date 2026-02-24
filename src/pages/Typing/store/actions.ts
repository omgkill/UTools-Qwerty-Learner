import type { WordWithIndex } from '@/typings'
import type { WordInfo } from './types'

export enum TypingStateActionType {
  SET_WORDS = 'SET_WORDS',
  RESET_PROGRESS = 'RESET_PROGRESS',
  SET_IS_SKIP = 'SET_IS_SKIP',
  SET_IS_TYPING = 'SET_IS_TYPING',
  TOGGLE_IS_TYPING = 'TOGGLE_IS_TYPING',
  REPORT_WRONG_WORD = 'REPORT_WRONG_WORD',
  REPORT_CORRECT_WORD = 'REPORT_CORRECT_WORD',
  NEXT_WORD = 'NEXT_WORD',
  FINISH_WORDS = 'FINISH_WORDS',
  INCREASE_CORRECT_COUNT = 'INCREASE_CORRECT_COUNT',
  INCREASE_WRONG_COUNT = 'INCREASE_WRONG_COUNT',
  SKIP_WORD = 'SKIP_WORD',
  SKIP_2_WORD_INDEX = 'SKIP_2_WORD_INDEX',
  FINISH_LEARNING = 'FINISH_LEARNING',
  TOGGLE_TRANS_VISIBLE = 'TOGGLE_TRANS_VISIBLE',
  TICK_TIMER = 'TICK_TIMER',
  ADD_WORD_RECORD_ID = 'ADD_WORD_RECORD_ID',
  SET_IS_SAVING_RECORD = 'SET_IS_SAVING_RECORD',
  TOGGLE_IMMERSIVE_MODE = 'TOGGLE_IMMERSIVE_MODE',
  UPDATE_WORD_INFO = 'UPDATE_WORD_INFO',
  SET_IS_EXTRA_REVIEW = 'SET_IS_EXTRA_REVIEW',
  SET_IS_CURRENT_WORD_MASTERED = 'SET_IS_CURRENT_WORD_MASTERED',
  ADD_REPLACEMENT_WORD = 'ADD_REPLACEMENT_WORD',
  CLEAR_WORD_INFO_MAP = 'CLEAR_WORD_INFO_MAP',
  RESET_STATS = 'RESET_STATS',
}

export type TypingStateAction =
  | { type: TypingStateActionType.SET_WORDS; payload: { words: WordWithIndex[] } }
  | { type: TypingStateActionType.RESET_PROGRESS }
  | { type: TypingStateActionType.SET_IS_SKIP; payload: boolean }
  | { type: TypingStateActionType.SET_IS_TYPING; payload: boolean }
  | { type: TypingStateActionType.TOGGLE_IS_TYPING }
  | { type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE; payload?: boolean }
  | { type: TypingStateActionType.REPORT_WRONG_WORD }
  | { type: TypingStateActionType.REPORT_CORRECT_WORD }
  | { type: TypingStateActionType.NEXT_WORD }
  | { type: TypingStateActionType.FINISH_WORDS }
  | { type: TypingStateActionType.INCREASE_CORRECT_COUNT }
  | { type: TypingStateActionType.INCREASE_WRONG_COUNT }
  | { type: TypingStateActionType.SKIP_WORD }
  | { type: TypingStateActionType.SKIP_2_WORD_INDEX; newIndex: number }
  | { type: TypingStateActionType.FINISH_LEARNING }
  | { type: TypingStateActionType.TOGGLE_TRANS_VISIBLE }
  | { type: TypingStateActionType.TICK_TIMER; addTime?: number }
  | { type: TypingStateActionType.ADD_WORD_RECORD_ID; payload: number }
  | { type: TypingStateActionType.SET_IS_SAVING_RECORD; payload: boolean }
  | { type: TypingStateActionType.UPDATE_WORD_INFO; payload: { wordName: string; data: WordInfo } }
  | { type: TypingStateActionType.SET_IS_EXTRA_REVIEW; payload: boolean }
  | { type: TypingStateActionType.SET_IS_CURRENT_WORD_MASTERED; payload: boolean }
  | { type: TypingStateActionType.ADD_REPLACEMENT_WORD; payload: WordWithIndex }
  | { type: TypingStateActionType.CLEAR_WORD_INFO_MAP }
  | { type: TypingStateActionType.RESET_STATS }

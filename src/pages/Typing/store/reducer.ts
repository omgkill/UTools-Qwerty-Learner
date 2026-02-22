import type { TypingState } from './types'
import { initialStatsData, initialUIState } from './initialState'
import type { TypingStateAction } from './actions'
import { TypingStateActionType } from './actions'

export function typingReducer(state: TypingState, action: TypingStateAction): TypingState {
  switch (action.type) {
    case TypingStateActionType.SET_WORDS: {
      const newWords = action.payload.words
      const currentWordName = state.wordListData.words[state.wordListData.index]?.name
      const newIndex = currentWordName 
        ? newWords.findIndex(w => w.name === currentWordName)
        : 0
      
      return {
        ...state,
        wordListData: {
          words: newWords,
          index: newIndex >= 0 ? newIndex : 0,
        },
        uiState: {
          ...state.uiState,
          isTyping: true,
        },
      }
    }

    case TypingStateActionType.RESET_PROGRESS: {
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          index: 0,
        },
        uiState: {
          ...initialUIState,
          isTyping: true,
        },
      }
    }

    case TypingStateActionType.SET_IS_SKIP:
      state.uiState.isShowSkip = action.payload
      break

    case TypingStateActionType.SET_IS_TYPING:
      state.uiState.isTyping = action.payload
      break

    case TypingStateActionType.TOGGLE_IS_TYPING:
      state.uiState.isTyping = !state.uiState.isTyping
      break

    case TypingStateActionType.TOGGLE_IMMERSIVE_MODE: {
      if (typeof action.payload === 'boolean') {
        state.isImmersiveMode = action.payload
      } else {
        state.isImmersiveMode = !state.isImmersiveMode
      }
      break
    }

    case TypingStateActionType.REPORT_WRONG_WORD: {
      const wordIndex = state.wordListData.words[state.wordListData.index].index
      const prevIndex = state.statsData.wrongWordIndexes.indexOf(wordIndex)
      if (prevIndex === -1) {
        state.statsData.wrongWordIndexes.push(wordIndex)
      }
      break
    }

    case TypingStateActionType.REPORT_CORRECT_WORD: {
      const wordIndex = state.wordListData.words[state.wordListData.index].index
      const prevWrongIndex = state.statsData.wrongWordIndexes.indexOf(wordIndex)
      const prevCorrectIndex = state.statsData.correctWordIndexes.indexOf(wordIndex)

      if (prevCorrectIndex === -1 && prevWrongIndex === -1) {
        state.statsData.correctWordIndexes.push(wordIndex)
      }
      break
    }

    case TypingStateActionType.NEXT_WORD:
      state.wordListData.index += 1
      state.statsData.wordCount += 1
      state.uiState.isShowSkip = false
      state.uiState.isCurrentWordMastered = false
      break

    case TypingStateActionType.FINISH_WORDS:
      state.statsData.wordCount += 1
      state.uiState.isTyping = false
      state.uiState.isFinished = true
      state.uiState.isShowSkip = false
      state.uiState.isCurrentWordMastered = false
      break

    case TypingStateActionType.INCREASE_CORRECT_COUNT:
      state.statsData.correctCount += 1
      break

    case TypingStateActionType.INCREASE_WRONG_COUNT:
      state.statsData.wrongCount += 1
      break

    case TypingStateActionType.SKIP_WORD: {
      const newIndex = state.wordListData.index + 1
      if (newIndex >= state.wordListData.words.length) {
        state.uiState.isTyping = false
        state.uiState.isFinished = true
      } else {
        state.wordListData.index = newIndex
      }
      state.uiState.isShowSkip = false
      break
    }

    case TypingStateActionType.SKIP_2_WORD_INDEX: {
      const newIndex = action.newIndex
      if (newIndex >= state.wordListData.words.length) {
        state.uiState.isTyping = false
        state.uiState.isFinished = true
      }
      state.wordListData.index = newIndex
      break
    }

    case TypingStateActionType.FINISH_LEARNING: {
      state.uiState.isTyping = false
      state.uiState.isFinished = true
      break
    }

    case TypingStateActionType.TOGGLE_TRANS_VISIBLE:
      state.isTransVisible = !state.isTransVisible
      break

    case TypingStateActionType.TICK_TIMER: {
      const increment = action.addTime === undefined ? 1 : action.addTime
      const newTime = state.statsData.timerData.time + increment
      const inputSum =
        state.statsData.correctCount + state.statsData.wrongCount === 0
          ? 1
          : state.statsData.correctCount + state.statsData.wrongCount

      state.statsData.timerData.time = newTime
      state.statsData.timerData.accuracy = Math.round((state.statsData.correctCount / inputSum) * 100)
      state.statsData.timerData.wpm = Math.round((state.statsData.wordCount / newTime) * 60)
      break
    }

    case TypingStateActionType.ADD_WORD_RECORD_ID: {
      state.statsData.wordRecordIds.push(action.payload)
      break
    }

    case TypingStateActionType.UPDATE_WORD_INFO: {
      const existing = state.wordInfoMap[action.payload.wordName] || {}
      state.wordInfoMap[action.payload.wordName] = { ...existing, ...action.payload.data }
      break
    }

    case TypingStateActionType.SET_IS_SAVING_RECORD: {
      state.uiState.isSavingRecord = action.payload
      break
    }

    case TypingStateActionType.SET_IS_EXTRA_REVIEW: {
      state.uiState.isExtraReview = action.payload
      break
    }

    case TypingStateActionType.SET_IS_CURRENT_WORD_MASTERED: {
      state.uiState.isCurrentWordMastered = action.payload
      break
    }

    case TypingStateActionType.ADD_REPLACEMENT_WORD: {
      state.wordListData.words.push(action.payload)
      break
    }

    case TypingStateActionType.CLEAR_WORD_INFO_MAP: {
      state.wordInfoMap = {}
      break
    }

    case TypingStateActionType.RESET_STATS: {
      state.statsData = structuredClone(initialStatsData)
      break
    }

    default: {
      return state
    }
  }
  
  return state
}

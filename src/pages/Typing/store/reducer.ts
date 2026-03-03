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
      return {
        ...state,
        uiState: { ...state.uiState, isShowSkip: action.payload },
      }

    case TypingStateActionType.SET_IS_TYPING:
      return {
        ...state,
        uiState: { ...state.uiState, isTyping: action.payload },
      }

    case TypingStateActionType.TOGGLE_IS_TYPING:
      return {
        ...state,
        uiState: { ...state.uiState, isTyping: !state.uiState.isTyping },
      }

    case TypingStateActionType.TOGGLE_IMMERSIVE_MODE:
      return {
        ...state,
        isImmersiveMode: typeof action.payload === 'boolean' ? action.payload : !state.isImmersiveMode,
      }

    case TypingStateActionType.REPORT_WRONG_WORD: {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) return state
      const wordIndex = currentWord.index
      if (state.statsData.wrongWordIndexes.indexOf(wordIndex) !== -1) return state
      return {
        ...state,
        statsData: {
          ...state.statsData,
          wrongWordIndexes: [...state.statsData.wrongWordIndexes, wordIndex],
        },
      }
    }

    case TypingStateActionType.REPORT_CORRECT_WORD: {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) return state
      const wordIndex = currentWord.index
      if (
        state.statsData.correctWordIndexes.indexOf(wordIndex) !== -1 ||
        state.statsData.wrongWordIndexes.indexOf(wordIndex) !== -1
      ) {
        return state
      }
      return {
        ...state,
        statsData: {
          ...state.statsData,
          correctWordIndexes: [...state.statsData.correctWordIndexes, wordIndex],
        },
      }
    }

    case TypingStateActionType.NEXT_WORD: {
      const newIndex = state.wordListData.index + 1
      const isEnd = newIndex >= state.wordListData.words.length
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          index: isEnd ? state.wordListData.index : newIndex,
        },
        statsData: { ...state.statsData, wordCount: state.statsData.wordCount + 1 },
        uiState: {
          ...state.uiState,
          isShowSkip: false,
          isCurrentWordMastered: false,
          isTyping: isEnd ? false : state.uiState.isTyping,
          isFinished: isEnd ? true : state.uiState.isFinished,
        },
      }
    }

    case TypingStateActionType.FINISH_WORDS: {
      // 重复学习模式下循环学习，不结束
      if (state.uiState.isRepeatLearning) {
        return {
          ...state,
          wordListData: { ...state.wordListData, index: 0 },
          statsData: { ...state.statsData, wordCount: state.statsData.wordCount + 1 },
          uiState: {
            ...state.uiState,
            isShowSkip: false,
            isCurrentWordMastered: false,
          },
        }
      }
      return {
        ...state,
        statsData: { ...state.statsData, wordCount: state.statsData.wordCount + 1 },
        uiState: {
          ...state.uiState,
          isTyping: false,
          isFinished: true,
          isShowSkip: false,
          isCurrentWordMastered: false,
        },
      }
    }

    case TypingStateActionType.INCREASE_CORRECT_COUNT:
      return {
        ...state,
        statsData: { ...state.statsData, correctCount: state.statsData.correctCount + 1 },
      }

    case TypingStateActionType.INCREASE_WRONG_COUNT:
      return {
        ...state,
        statsData: { ...state.statsData, wrongCount: state.statsData.wrongCount + 1 },
      }

    case TypingStateActionType.SKIP_WORD: {
      const newIndex = state.wordListData.index + 1
      const isEnd = newIndex >= state.wordListData.words.length
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          index: isEnd ? state.wordListData.index : newIndex,
        },
        uiState: {
          ...state.uiState,
          isShowSkip: false,
          isTyping: isEnd ? false : state.uiState.isTyping,
          isFinished: isEnd ? true : state.uiState.isFinished,
        },
      }
    }

    case TypingStateActionType.SKIP_2_WORD_INDEX: {
      const newIndex = action.newIndex
      const isEnd = newIndex >= state.wordListData.words.length
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          index: isEnd ? state.wordListData.index : newIndex,
        },
        uiState: {
          ...state.uiState,
          isTyping: isEnd ? false : state.uiState.isTyping,
          isFinished: isEnd ? true : state.uiState.isFinished,
        },
      }
    }

    case TypingStateActionType.FINISH_LEARNING:
      return {
        ...state,
        uiState: { ...state.uiState, isTyping: false, isFinished: true },
      }

    case TypingStateActionType.TOGGLE_TRANS_VISIBLE:
      return {
        ...state,
        isTransVisible: !state.isTransVisible,
      }

    case TypingStateActionType.TICK_TIMER: {
      const increment = action.addTime === undefined ? 1 : action.addTime
      const newTime = state.statsData.timerData.time + increment
      const inputSum =
        state.statsData.correctCount + state.statsData.wrongCount === 0
          ? 1
          : state.statsData.correctCount + state.statsData.wrongCount
      return {
        ...state,
        statsData: {
          ...state.statsData,
          timerData: {
            time: newTime,
            accuracy: Math.round((state.statsData.correctCount / inputSum) * 100),
            wpm: newTime === 0 ? 0 : Math.round((state.statsData.wordCount / newTime) * 60),
          },
        },
      }
    }

    case TypingStateActionType.ADD_WORD_RECORD_ID:
      return {
        ...state,
        statsData: {
          ...state.statsData,
          wordRecordIds: [...state.statsData.wordRecordIds, action.payload],
        },
      }

    case TypingStateActionType.UPDATE_WORD_INFO: {
      const existing = state.wordInfoMap[action.payload.wordName] || {}
      return {
        ...state,
        wordInfoMap: {
          ...state.wordInfoMap,
          [action.payload.wordName]: { ...existing, ...action.payload.data },
        },
      }
    }

    case TypingStateActionType.SET_IS_SAVING_RECORD:
      return {
        ...state,
        uiState: { ...state.uiState, isSavingRecord: action.payload },
      }

    case TypingStateActionType.SET_IS_CURRENT_WORD_MASTERED:
      return {
        ...state,
        uiState: { ...state.uiState, isCurrentWordMastered: action.payload },
      }

    case TypingStateActionType.ADD_REPLACEMENT_WORD:
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          words: [...state.wordListData.words, action.payload],
        },
      }

    case TypingStateActionType.CLEAR_WORD_INFO_MAP:
      return {
        ...state,
        wordInfoMap: {},
      }

    case TypingStateActionType.RESET_STATS:
      return {
        ...state,
        statsData: structuredClone(initialStatsData),
      }

    case TypingStateActionType.SET_IS_REPEAT_LEARNING:
      return {
        ...state,
        uiState: { ...state.uiState, isRepeatLearning: action.payload },
      }

    case TypingStateActionType.SET_CURRENT_INDEX:
      return {
        ...state,
        wordListData: {
          ...state.wordListData,
          index: action.payload,
        },
      }

    default:
      return state
  }
}

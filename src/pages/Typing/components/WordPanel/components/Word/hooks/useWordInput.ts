import type { WordUpdateAction } from '../../InputHandler'
import type { WordState } from './useWordState'
import { EXPLICIT_SPACE } from '@/constants'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { isIgnoreCaseAtom } from '@/store'
import { getUtcStringForMixpanel } from '@/utils/mixpanel'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect } from 'react'

export function useWordInput(
  wordState: WordState,
  setWordState: (updater: (draft: WordState) => void) => void,
) {
  const typingContext = useContext(TypingContext)
  const dispatch = typingContext?.dispatch
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)

  const updateInput = useCallback(
    (updateAction: WordUpdateAction) => {
      switch (updateAction.type) {
        case 'add':
          if (wordState.hasWrong) return

          if (updateAction.value === ' ') {
            updateAction.event.preventDefault()
            setWordState((state) => {
              state.inputWord = state.inputWord + EXPLICIT_SPACE
            })
          } else {
            setWordState((state) => {
              state.inputWord = state.inputWord + updateAction.value
            })
          }
          break

        case 'delete':
          setWordState((state) => {
            if (state.inputWord.length > 0) {
              state.inputWord = state.inputWord.slice(0, -1)
              state.letterStates = state.letterStates.map((s, i) =>
                i === state.inputWord.length ? 'normal' : s,
              )
            }
          })
          break

        case 'composition':
          setWordState((state) => {
            state.inputWord = updateAction.value
          })
          break

        default:
          console.warn('unknown update type', updateAction)
      }
    },
    [wordState.hasWrong, setWordState],
  )

  useEffect(() => {
    const inputLength = wordState.inputWord.length
    if (wordState.hasWrong || inputLength === 0 || wordState.displayWord.length === 0) {
      return
    }

    const inputChar = wordState.inputWord[inputLength - 1]
    const correctChar = wordState.displayWord[inputLength - 1]

    let isEqual = false
    if (inputChar != undefined && correctChar != undefined) {
      isEqual = isIgnoreCase ? inputChar.toLowerCase() === correctChar.toLowerCase() : inputChar === correctChar
    }

    if (isEqual) {
      if (!dispatch) return
      setWordState((state) => {
        state.letterTimeArray.push(Date.now())
        state.correctCount += 1
      })

      if (inputLength >= wordState.displayWord.length) {
        setWordState((state) => {
          state.letterStates[inputLength - 1] = 'correct'
          state.isFinished = true
          state.endTime = getUtcStringForMixpanel()
        })
      } else {
        setWordState((state) => {
          state.letterStates[inputLength - 1] = 'correct'
        })
      }

      dispatch({ type: TypingStateActionType.INCREASE_CORRECT_COUNT })
    } else {
      if (!dispatch) return
      setWordState((state) => {
        state.letterStates[inputLength - 1] = 'wrong'
        state.hasWrong = true
        state.hasMadeInputWrong = true
        state.wrongCount += 1
        state.letterTimeArray = []
        if (state.letterMistake[inputLength - 1]) {
          state.letterMistake[inputLength - 1].push(inputChar)
        } else {
          state.letterMistake[inputLength - 1] = [inputChar]
        }
      })

      dispatch({ type: TypingStateActionType.INCREASE_WRONG_COUNT })
      dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD })
    }
  }, [wordState.inputWord, wordState.hasWrong, wordState.displayWord, isIgnoreCase, setWordState, dispatch])

  useEffect(() => {
    if (wordState.hasWrong) {
      const timer = setTimeout(() => {
        setWordState((state) => {
          state.inputWord = ''
          state.letterStates = new Array(state.letterStates.length).fill('normal')
          state.hasWrong = false
        })
      }, 300)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [wordState.hasWrong, setWordState])

  return { updateInput }
}

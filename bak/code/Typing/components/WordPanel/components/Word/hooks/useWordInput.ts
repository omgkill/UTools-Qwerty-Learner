import type { WordUpdateAction } from '../../InputHandler'
import { EXPLICIT_SPACE } from '@/constants'
import { isIgnoreCaseAtom } from '@/store'
import { getLocalTimeString, now } from '@/utils/timeService'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import {
  increaseCorrectCountAtom,
  increaseWrongCountAtom,
  reportWrongWordAtom,
  wordInputStateAtom,
} from '../../../../../store'

export function useWordInput() {
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const increaseCorrectCount = useSetAtom(increaseCorrectCountAtom)
  const increaseWrongCount = useSetAtom(increaseWrongCountAtom)
  const reportWrongWord = useSetAtom(reportWrongWordAtom)

  const wordState = useAtomValue(wordInputStateAtom)
  const setWordState = useSetAtom(wordInputStateAtom)

  const updateInput = useCallback(
    (updateAction: WordUpdateAction) => {
      switch (updateAction.type) {
        case 'add':
          if (wordState.hasWrong) return

          if (updateAction.value === ' ') {
            updateAction.event.preventDefault()
            setWordState((draft) => {
              draft.inputWord = draft.inputWord + EXPLICIT_SPACE
            })
          } else {
            setWordState((draft) => {
              draft.inputWord = draft.inputWord + updateAction.value
            })
          }
          break

        case 'delete':
          setWordState((draft) => {
            if (draft.inputWord.length > 0) {
              draft.inputWord = draft.inputWord.slice(0, -1)
              draft.letterStates = draft.letterStates.map((s, i) =>
                i === draft.inputWord.length ? 'normal' : s,
              )
            }
          })
          break

        case 'composition':
          setWordState((draft) => {
            draft.inputWord = updateAction.value
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
      setWordState((draft) => {
        draft.letterTimeArray.push(now())
        draft.correctCount += 1
      })

      if (inputLength >= wordState.displayWord.length) {
        setWordState((draft) => {
          draft.letterStates[inputLength - 1] = 'correct'
          draft.isFinished = true
          draft.endTime = getLocalTimeString()
        })
      } else {
        setWordState((draft) => {
          draft.letterStates[inputLength - 1] = 'correct'
        })
      }

      increaseCorrectCount()
    } else {
      setWordState((draft) => {
        draft.letterStates[inputLength - 1] = 'wrong'
        draft.hasWrong = true
        draft.hasMadeInputWrong = true
        draft.wrongCount += 1
        draft.letterTimeArray = []
        if (draft.letterMistake[inputLength - 1]) {
          draft.letterMistake[inputLength - 1].push(inputChar)
        } else {
          draft.letterMistake[inputLength - 1] = [inputChar]
        }
      })

      increaseWrongCount()
      reportWrongWord()
    }
  }, [wordState.inputWord, wordState.hasWrong, wordState.displayWord, isIgnoreCase, setWordState, increaseCorrectCount, increaseWrongCount, reportWrongWord])

  useEffect(() => {
    if (wordState.hasWrong) {
      const timer = setTimeout(() => {
        setWordState((draft) => {
          draft.inputWord = ''
          draft.letterStates = new Array(draft.letterStates.length).fill('normal')
          draft.hasWrong = false
        })
      }, 300)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [wordState.hasWrong, setWordState])

  return { updateInput }
}

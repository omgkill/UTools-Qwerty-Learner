import type { Word } from '@/types'
import { addLearnedWord, updateProgress } from '@/utils/storage'
import { useEffect } from 'react'
import { currentWordBankIdAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { reportCorrectWordAtom, wordInputStateAtom } from '../../../../../store'

const onFinishCalledRef = { current: false }

export function useWordCompletion(
  word: Word,
  onFinish: () => void,
  isExtraReview: boolean,
  isRepeatLearning = false,
) {
  const dictID = useAtomValue(currentWordBankIdAtom)
  const reportCorrectWord = useSetAtom(reportCorrectWordAtom)
  const wordState = useAtomValue(wordInputStateAtom)

  useEffect(() => {
    onFinishCalledRef.current = false
  }, [word.name])

  useEffect(() => {
    if (wordState.isFinished) {
      if (onFinishCalledRef.current) return
      if (wordState.wordName !== word.name) {
        return
      }
      onFinishCalledRef.current = true
      if (!wordState.hasMadeInputWrong) {
        reportCorrectWord()
      }
      if (!isRepeatLearning && dictID) {
        try {
          const result = updateProgress(dictID, word.name)
          const isNew = result.wasNew
          addLearnedWord(dictID, word.name, isNew)
        } catch (e) {
          console.error('Failed to save word progress:', e)
        }
      }
      onFinish()
    }
  }, [
    wordState.isFinished,
    wordState.hasMadeInputWrong,
    wordState.wordName,
    word.name,
    reportCorrectWord,
    dictID,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}

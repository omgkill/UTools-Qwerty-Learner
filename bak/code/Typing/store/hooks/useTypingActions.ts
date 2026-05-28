import { useAtomValue, useSetAtom } from 'jotai'
import {
  incrementWordCountAtom,
  isFinishedAtom,
  isRepeatLearningAtom,
  nextWordAtom,
  resetProgressAtom,
  resetUIStateAtom,
  setIsShowSkipAtom,
  setIsTypingAtom,
  skipToIndexAtom,
  skipWordAtom,
} from '../atoms/index'

export function useTypingActions() {
  const nextWord = useSetAtom(nextWordAtom)
  const skipWord = useSetAtom(skipWordAtom)
  const skipToIndex = useSetAtom(skipToIndexAtom)
  const incrementWordCount = useSetAtom(incrementWordCountAtom)
  const setIsShowSkip = useSetAtom(setIsShowSkipAtom)
  const setIsTyping = useSetAtom(setIsTypingAtom)
  const setIsFinished = useSetAtom(isFinishedAtom)
  const isRepeatLearning = useAtomValue(isRepeatLearningAtom)
  const resetUIState = useSetAtom(resetUIStateAtom)
  const resetProgress = useSetAtom(resetProgressAtom)

  const goToNextWord = () => {
    const isEnd = nextWord()
    if (isEnd) {
      if (isRepeatLearning) {
        resetProgress()
        resetUIState()
        return { finished: false }
      }
      setIsTyping(false)
      setIsFinished(true)
    }
    incrementWordCount()
    setIsShowSkip(false)
    return { finished: isEnd && !isRepeatLearning }
  }

  const skipCurrentWord = () => {
    const isEnd = skipWord()
    if (isEnd) {
      setIsTyping(false)
      setIsFinished(true)
    }
    setIsShowSkip(false)
    return { finished: isEnd }
  }

  const skipToWordIndex = (newIndex: number) => {
    const isEnd = skipToIndex(newIndex)
    if (isEnd) {
      setIsTyping(false)
      setIsFinished(true)
    }
    return { finished: isEnd }
  }

  return {
    goToNextWord,
    skipCurrentWord,
    skipToWordIndex,
  }
}

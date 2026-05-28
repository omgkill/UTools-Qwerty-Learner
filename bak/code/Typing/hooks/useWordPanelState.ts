import { useAtomValue, useSetAtom } from 'jotai'
import { phoneticConfigAtom, isShowPrevAndNextWordAtom } from '@/store'
import {
  currentWordAtom,
  prevWordAtom,
  nextWordDisplayAtom,
  isImmersiveModeAtom,
  isTypingAtom,
  isTransVisibleAtom,
  wordDisplayInfoMapAtom,
  timerDataAtom,
  isExtraReviewAtom,
  isRepeatLearningAtom,
  nextWordAtom,
  finishLearningAtom,
} from '../store'

/**
 * 封装 WordPanel 所需的所有状态
 */
export function useWordPanelState() {
  // 全局配置
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)

  // 单词状态
  const currentWord = useAtomValue(currentWordAtom)
  const prevWord = useAtomValue(prevWordAtom)
  const nextWord = useAtomValue(nextWordDisplayAtom)

  // UI 状态
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const isTyping = useAtomValue(isTypingAtom)
  const isTransVisible = useAtomValue(isTransVisibleAtom)
  const timerData = useAtomValue(timerDataAtom)

  // 学习模式状态
  const isExtraReview = useAtomValue(isExtraReviewAtom)
  const isRepeatLearning = useAtomValue(isRepeatLearningAtom)

  // 显示数据
  const wordDisplayInfoMap = useAtomValue(wordDisplayInfoMapAtom)
  const wordDisplayInfo = currentWord ? wordDisplayInfoMap[currentWord.name] : undefined
  const displayTrans = wordDisplayInfo?.trans || currentWord?.trans || []
  const displayUkphone = wordDisplayInfo?.ukphone || currentWord?.ukphone || ''
  const displayTense = wordDisplayInfo?.tense || currentWord?.tense
  const wordWithInfo = currentWord
    ? { ...currentWord, trans: displayTrans, ukphone: displayUkphone, tense: displayTense }
    : null

  // Actions
  const goToNextWord = useSetAtom(nextWordAtom)
  const finishLearning = useSetAtom(finishLearningAtom)

  const onFinish = () => {
    const finished = goToNextWord()
    if (finished) {
      finishLearning()
    }
  }

  return {
    // 全局配置
    phoneticConfig,
    isShowPrevAndNextWord,
    // 单词
    currentWord,
    prevWord,
    nextWord,
    wordWithInfo,
    // 显示数据
    displayTrans,
    displayTense,
    // UI 状态
    isImmersiveMode,
    isTyping,
    isTransVisible,
    timerData,
    // 学习模式
    isExtraReview,
    isRepeatLearning,
    // Actions
    onFinish,
  }
}
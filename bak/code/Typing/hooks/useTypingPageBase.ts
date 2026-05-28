import { useTypingTimer } from './useTypingTimer'
import { useKeyboardStartListener } from './useKeyboardStartListener'
import { useTypingHotkeys } from './useTypingHotkeys'
import { useUtoolsMode } from './useUtoolsMode'
import { useWindowBlur } from './useWindowBlur'
import { useAtomValue } from 'jotai'
import {
  isImmersiveModeAtom,
  isTypingAtom,
} from '../store/atoms/index'

export interface UseTypingPageBaseResult {
  isTyping: boolean
  isImmersiveMode: boolean
}

/**
 * 学习页面的基础 hook
 * 整合了所有页面共用的基础逻辑：计时、快捷键、模式切换等
 */
export function useTypingPageBase(): UseTypingPageBaseResult {
  const isTyping = useAtomValue(isTypingAtom)
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)

  // 基础 hooks
  useUtoolsMode()
  useWindowBlur()
  useTypingHotkeys(isImmersiveMode)
  useTypingTimer(isTyping)
  useKeyboardStartListener(isTyping, false)

  return {
    isTyping,
    isImmersiveMode,
  }
}

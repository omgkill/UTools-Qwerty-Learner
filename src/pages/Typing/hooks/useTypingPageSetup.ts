import { useTypingInitializer } from './useTypingInitializer'
import { useTypingPageBase, type UseTypingPageBaseResult } from './useTypingPageBase'
import { useConfetti } from './useConfetti'
import type { WordBank, LearningMode } from '@/types'

export interface UseTypingPageSetupOptions {
  mode: LearningMode
}

export interface UseTypingPageSetupResult extends UseTypingPageBaseResult {
  isInitialized: boolean
  currentWordBank: WordBank | null
}

/**
 * 统一的学习页面初始化 hook
 * 整合了所有页面共用的初始化逻辑
 *
 * @param options.mode - 学习模式 ('normal' | 'repeat' | 'consolidate')
 */
export function useTypingPageSetup(options: UseTypingPageSetupOptions): UseTypingPageSetupResult {
  const { mode } = options

  const { isInitialized, currentWordBank } = useTypingInitializer()
  const pageBase = useTypingPageBase()

  // Normal 模式特有的彩带效果（完成时触发）
  useConfetti(
    mode === 'normal' && pageBase.isTyping === false && !pageBase.isImmersiveMode
  )

  return {
    ...pageBase,
    isInitialized,
    currentWordBank,
  }
}
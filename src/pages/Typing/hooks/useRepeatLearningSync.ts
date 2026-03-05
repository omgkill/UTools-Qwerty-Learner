import { useCallback, useEffect, useRef } from 'react'
import type { WordWithIndex } from '@/typings'
import type { TypingAction } from '../store'

interface UseRepeatLearningSyncProps {
  isActive: boolean
  dictId: string | null
  dispatch: React.Dispatch<TypingAction>
  onStateRestored?: (words: WordWithIndex[], index: number) => void
}

export function useRepeatLearningSync({
  isActive,
  dictId,
  dispatch,
  onStateRestored,
}: UseRepeatLearningSyncProps) {
  const isRestoredRef = useRef(false)
  const isActiveRef = useRef(isActive)
  const hasCheckedForRestoreRef = useRef(false)
  const repeatLearningStateRef = useRef<{ words: WordWithIndex[]; index: number } | null>(null)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // 检查是否有重复学习记录（通过 context 或其他方式传入）
  useEffect(() => {
    if (!dictId) return
    if (hasCheckedForRestoreRef.current) return

    const checkAndRestore = async () => {
      if (repeatLearningStateRef.current && repeatLearningStateRef.current.words.length > 0) {
        // 发现有重复学习记录，通知父组件
        onStateRestored?.(repeatLearningStateRef.current.words, repeatLearningStateRef.current.index)
        hasCheckedForRestoreRef.current = true
      }
    }
    checkAndRestore()
  }, [dictId, onStateRestored])

  useEffect(() => {
    if (!isActive) {
      isRestoredRef.current = false
      return
    }
    if (!dictId) return
    if (isRestoredRef.current) return

    const restore = async () => {
      if (repeatLearningStateRef.current && repeatLearningStateRef.current.words.length > 0) {
        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: repeatLearningStateRef.current.words },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: repeatLearningStateRef.current.index,
        })
        isRestoredRef.current = true
      }
    }
    restore()
  }, [isActive, dictId, dispatch])

  const saveProgress = useCallback(async (index: number) => {
    // 内存中保存进度
    if (!dictId || !isActiveRef.current || !repeatLearningStateRef.current) return
    repeatLearningStateRef.current.index = index
  }, [dictId])

  const clearState = useCallback(async () => {
    repeatLearningStateRef.current = null
    isRestoredRef.current = false
  }, [])

  const startNew = useCallback(async (words: WordWithIndex[]) => {
    if (!dictId || words.length === 0) return
    repeatLearningStateRef.current = { words, index: 0 }
    isRestoredRef.current = true
  }, [dictId])

  return {
    saveProgress,
    clearState,
    startNew,
  }
}

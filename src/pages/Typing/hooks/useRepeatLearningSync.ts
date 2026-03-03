import { useCallback, useEffect, useRef } from 'react'
import type { WordWithIndex } from '@/typings'
import { TypingStateActionType } from '../store'
import { RepeatLearningManager } from './RepeatLearningManager'

interface UseRepeatLearningSyncProps {
  isActive: boolean
  dictId: string | null
  dispatch: React.Dispatch<any>
  onStateRestored?: (words: WordWithIndex[], index: number) => void
}

export function useRepeatLearningSync({
  isActive,
  dictId,
  dispatch,
  onStateRestored,
}: UseRepeatLearningSyncProps) {
  const managerRef = useRef(new RepeatLearningManager())
  const isRestoredRef = useRef(false)
  const isActiveRef = useRef(isActive)
  const hasCheckedForRestoreRef = useRef(false)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // 检查是否有重复学习记录，如果有，通知父组件
  useEffect(() => {
    if (!dictId) return
    if (hasCheckedForRestoreRef.current) return

    const checkAndRestore = async () => {
      const state = await managerRef.current.initialize(dictId)
      if (state && state.learningWords.length > 0) {
        // 发现有重复学习记录，通知父组件
        onStateRestored?.(state.learningWords, state.currentIndex)
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
      const state = await managerRef.current.initialize(dictId)
      if (state && state.learningWords.length > 0) {
        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: state.learningWords },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: state.currentIndex,
        })
        isRestoredRef.current = true
      }
    }
    restore()
  }, [isActive, dictId, dispatch])

  const saveProgress = useCallback(async (index: number) => {
    if (!dictId || !isActiveRef.current) return
    await managerRef.current.updateIndex(dictId, index)
  }, [dictId])

  const clearState = useCallback(async () => {
    if (!dictId) return
    await managerRef.current.clear(dictId)
    isRestoredRef.current = false
  }, [dictId])

  const startNew = useCallback(async (words: WordWithIndex[]) => {
    if (!dictId || words.length === 0) return
    await managerRef.current.start(dictId, words)
    isRestoredRef.current = true
  }, [dictId])

  return {
    saveProgress,
    clearState,
    startNew,
  }
}

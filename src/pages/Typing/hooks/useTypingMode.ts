import { useCallback, useEffect, useRef, useState } from 'react'
import { RepeatLearningManager } from './RepeatLearningManager'

export type LearningMode = 'normal' | 'repeat'

export function useTypingMode(dictId: string | null, forceRepeatMode: boolean = false) {
  const [mode, setMode] = useState<LearningMode | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const managerRef = useRef(new RepeatLearningManager())

  useEffect(() => {
    if (!dictId) {
      setMode('normal')
      setIsInitialized(true)
      return
    }

    const checkMode = async () => {
      // 如果强制进入重复学习模式，直接检查是否有重复学习记录
      if (forceRepeatMode) {
        const saved = await managerRef.current.initialize(dictId)
        if (saved && saved.learningWords.length > 0) {
          setMode('repeat')
        } else {
          // 没有重复学习记录，回退到正常模式
          setMode('normal')
        }
      } else {
        // 正常流程：检查是否有重复学习记录
        const saved = await managerRef.current.initialize(dictId)
        if (saved && saved.learningWords.length > 0) {
          setMode('repeat')
        } else {
          setMode('normal')
        }
      }
      setIsInitialized(true)
    }
    checkMode()
  }, [dictId, forceRepeatMode])

  const switchToNormal = useCallback(() => {
    setMode('normal')
  }, [])

  const switchToRepeat = useCallback(() => {
    setMode('repeat')
  }, [])

  return {
    mode,
    isInitialized,
    switchToNormal,
    switchToRepeat,
  }
}

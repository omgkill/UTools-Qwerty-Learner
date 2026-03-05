import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/utils/db'
import { getTodayDate } from '@/utils/db/progress'

export type LearningMode = 'normal' | 'repeat'

export function useTypingMode(dictId: string | null, forceRepeatMode = false) {
  const [mode, setMode] = useState<LearningMode | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const isRepeatLearningRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!dictId) {
      setMode('normal')
      setIsInitialized(true)
      return
    }

    const checkMode = async () => {
      if (forceRepeatMode) {
        // 强制重复学习模式：检查是否有重复学习记录
        const today = getTodayDate()
        const saved = await db.typingStates
          .where('[dict+date]')
          .equals([dictId, today])
          .first()

        if (saved && saved.isRepeatLearning && saved.learningWords && (saved.learningWords as unknown[]).length > 0) {
          setMode('repeat')
        } else {
          setMode('normal')
        }
      } else {
        // 正常流程：检查是否有重复学习记录
        const today = getTodayDate()
        const saved = await db.typingStates
          .where('[dict+date]')
          .equals([dictId, today])
          .first()

        if (saved && saved.isRepeatLearning && saved.learningWords && (saved.learningWords as unknown[]).length > 0) {
          isRepeatLearningRef.current = true
          setMode('repeat')
        } else {
          isRepeatLearningRef.current = false
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
    isRepeatLearning: isRepeatLearningRef.current,
  }
}

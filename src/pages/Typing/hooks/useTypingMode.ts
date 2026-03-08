import { useCallback, useEffect, useRef, useState } from 'react'
import { getTodayWords } from '@/utils/storage'
import type { LearningMode } from '@/types'

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

    const checkMode = () => {
      if (forceRepeatMode) {
        const todayWords = getTodayWords(dictId)
        if (todayWords.length > 0) {
          setMode('repeat')
        } else {
          setMode('normal')
        }
      } else {
        const todayWords = getTodayWords(dictId)
        if (todayWords.length > 0) {
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

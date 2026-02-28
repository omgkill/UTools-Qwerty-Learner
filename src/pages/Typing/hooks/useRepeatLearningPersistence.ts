import type { WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'
import { db } from '@/utils/db'
import { useCallback } from 'react'

export type RepeatLearningState = {
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
}

export type SavedRepeatLearningState = {
  isRepeatLearning: boolean
  learningWords: unknown[]
  currentIndex: number
  dictId: string
  date: string
}

export function useRepeatLearningPersistence() {
  const loadRepeatLearningState = useCallback(async (dictId: string): Promise<RepeatLearningState | null> => {
    try {
      if (typeof window === 'undefined' || !db.typingStates) {
        return null
      }

      const allStates = await db.typingStates.toArray()
      const saved = allStates.find(item => item.dictId === dictId && item.date === getTodayDate())

      if (!saved) {
        return null
      }

      const today = getTodayDate()
      if (saved.date !== today || saved.dictId !== dictId) {
        return null
      }

      if (saved.isRepeatLearning && saved.learningWords && saved.learningWords.length > 0) {
        return {
          isRepeatLearning: true,
          learningWords: saved.learningWords as WordWithIndex[],
          currentIndex: saved.currentIndex ?? 0,
        }
      }

      return null
    } catch (e) {
      console.error('Failed to load repeat learning state:', e)
      return null
    }
  }, [])

  const saveRepeatLearningState = useCallback(async (dictId: string, state: RepeatLearningState): Promise<void> => {
    try {
      if (typeof window === 'undefined' || !db.typingStates) {
        return
      }

      const today = getTodayDate()
      const allStates = await db.typingStates.toArray()
      const existing = allStates.find(item => item.dictId === dictId && item.date === today)

      const record: SavedRepeatLearningState = {
        isRepeatLearning: state.isRepeatLearning,
        learningWords: state.isRepeatLearning ? state.learningWords : [],
        currentIndex: state.isRepeatLearning ? state.currentIndex : 0,
        dictId,
        date: today,
      }

      if (existing) {
        await db.typingStates.update(existing.id!, record)
      } else {
        await db.typingStates.add(record)
      }
    } catch (e) {
      console.error('Failed to save repeat learning state:', e)
    }
  }, [])

  const clearRepeatLearningState = useCallback(async (dictId: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' || !db.typingStates) {
        return
      }

      const today = getTodayDate()
      const allStates = await db.typingStates.toArray()
      const existing = allStates.find(item => item.dictId === dictId && item.date === today)

      if (existing) {
        await db.typingStates.update(existing.id!, {
          isRepeatLearning: false,
          learningWords: [],
          currentIndex: 0,
          dictId,
          date: today,
        })
      }
    } catch (e) {
      console.error('Failed to clear repeat learning state:', e)
    }
  }, [])

  return {
    loadRepeatLearningState,
    saveRepeatLearningState,
    clearRepeatLearningState,
  }
}

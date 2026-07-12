import { loadConsolidateTypingSession, saveQueuedLearningState } from '@/features/typing/application/use-cases'
import { useQueuedTypingSession } from '@/features/typing/presentation/hooks/useQueuedTypingSession'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { currentDictIdAtom } from '@/store'
import type { WordBank } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { loadTypingWordList } from './load-typing-word-list'

const LEGACY_CONSOLIDATE_PROGRESS_KEY = 'consolidate-learning-progress'

type LegacyConsolidateProgress = {
  dictId: string
  date: string
  index: number
  wordNames: string[]
}

type UseConsolidateTypingSessionParams = {
  stateIndex: number
  currentWordBank: WordBank
  syncSession: Parameters<typeof useQueuedTypingSession>[0]['syncSession']
  setRepeatLearning: Parameters<typeof useQueuedTypingSession>[0]['setRepeatLearning']
}

export function useConsolidateTypingSession(params: UseConsolidateTypingSessionParams) {
  const { stateIndex, currentWordBank, syncSession, setRepeatLearning } = params
  const currentDictId = useAtomValue(currentDictIdAtom)

  const loadSession = useCallback(async () => {
    if (!currentDictId) {
      return null
    }

    const wordList = await loadTypingWordList(currentWordBank)
    if (!wordList || wordList.length === 0) {
      return null
    }

    const date = getTodayDate()

    return loadConsolidateTypingSession({
      dictId: currentDictId,
      wordList,
      wordProgressRepository: dexieWordProgressRepository,
      date,
      legacyProgress: loadLegacyConsolidateProgress(currentDictId, date),
      clearLegacyProgress,
    })
  }, [currentDictId, currentWordBank])

  return useQueuedTypingSession({
    stateIndex,
    syncSession,
    setRepeatLearning,
    loadSession: async () => {
      const loaded = await loadSession()
      if (!loaded) {
        return null
      }

      return {
        words: loaded.words,
        initialIndex: loaded.currentIndex,
      }
    },
    persistIndex: currentDictId
      ? (index, words) =>
          saveQueuedLearningState({
            dictId: currentDictId,
            sessionType: 'consolidate',
            learningWords: words,
            currentIndex: index,
            date: getTodayDate(),
          })
      : undefined,
  })
}

function loadLegacyConsolidateProgress(dictId: string, date: string): LegacyConsolidateProgress | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(LEGACY_CONSOLIDATE_PROGRESS_KEY)
    if (!saved) {
      return null
    }

    const progress = JSON.parse(saved) as LegacyConsolidateProgress
    if (progress.dictId !== dictId || progress.date !== date) {
      return null
    }

    return progress
  } catch {
    return null
  }
}

function clearLegacyProgress() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(LEGACY_CONSOLIDATE_PROGRESS_KEY)
  } catch {
    // Ignore legacy cleanup failures and continue with the migrated session.
  }
}

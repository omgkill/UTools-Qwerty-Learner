import { clearQueuedLearningState, loadRepeatTypingSession, saveQueuedLearningState } from '@/features/typing/application/use-cases'
import { useQueuedTypingSession } from '@/features/typing/presentation/hooks/useQueuedTypingSession'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { currentDictIdAtom } from '@/store'
import type { WordBank } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import { loadTypingWordList } from './load-typing-word-list'

type UseRepeatTypingSessionParams = {
  stateIndex: number
  currentWordBank: WordBank
  syncSession: Parameters<typeof useQueuedTypingSession>[0]['syncSession']
  setRepeatLearning: Parameters<typeof useQueuedTypingSession>[0]['setRepeatLearning']
}

type UseRepeatTypingSessionResult = ReturnType<typeof useQueuedTypingSession> & {
  clearSession: () => Promise<void>
}

export function useRepeatTypingSession(params: UseRepeatTypingSessionParams): UseRepeatTypingSessionResult {
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

    return loadRepeatTypingSession({
      dictId: currentDictId,
      wordList,
      wordProgressRepository: dexieWordProgressRepository,
    })
  }, [currentDictId, currentWordBank])

  const session = useQueuedTypingSession({
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
            sessionType: 'repeat',
            learningWords: words,
            currentIndex: index,
          })
      : undefined,
  })

  const clearSession = useCallback(async () => {
    if (!currentDictId) {
      return
    }

    await clearQueuedLearningState({
      dictId: currentDictId,
      sessionType: 'repeat',
    })
  }, [currentDictId])

  return {
    ...session,
    clearSession,
  }
}

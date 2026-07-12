import type { WordWithIndex } from '@/typings'
import { useCallback, useEffect, useRef, useState } from 'react'

type LoadedQueuedTypingSession = {
  words: WordWithIndex[]
  initialIndex?: number
}

type SyncQueuedTypingSessionPayload = {
  words: WordWithIndex[]
  index: number
  isFinished: boolean
  autoStart: boolean
}

type UseQueuedTypingSessionParams = {
  stateIndex: number
  loadSession: () => Promise<LoadedQueuedTypingSession | null>
  syncSession: (payload: SyncQueuedTypingSessionPayload) => void
  setRepeatLearning: (isRepeatLearning: boolean) => void
  persistIndex?: (index: number, words: WordWithIndex[]) => Promise<void> | void
  repeatLearning?: boolean
}

type UseQueuedTypingSessionResult = {
  words: WordWithIndex[]
  currentIndex: number
  isLoading: boolean
  hasWords: boolean
  advanceCurrentWord: () => void
}

export function useQueuedTypingSession(params: UseQueuedTypingSessionParams): UseQueuedTypingSessionResult {
  const { stateIndex, loadSession, syncSession, setRepeatLearning, persistIndex, repeatLearning = true } = params

  const [words, setWords] = useState<WordWithIndex[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasWords, setHasWords] = useState(true)
  const initializedRef = useRef(false)
  const wordsRef = useRef<WordWithIndex[]>([])
  const lastPersistedIndexRef = useRef(0)

  const syncQueuedSession = useCallback(
    (nextWords: WordWithIndex[], nextIndex: number) => {
      syncSession({
        words: nextWords,
        index: nextIndex,
        isFinished: nextWords.length === 0,
        autoStart: nextWords.length > 0,
      })
      setRepeatLearning(repeatLearning)
    },
    [repeatLearning, setRepeatLearning, syncSession],
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      try {
        const loaded = await loadSession()
        if (cancelled) return

        if (!loaded || loaded.words.length === 0) {
          initializedRef.current = false
          wordsRef.current = []
          setWords([])
          setHasWords(false)
          syncQueuedSession([], 0)
          setRepeatLearning(false)
          return
        }

        const initialIndex = Math.min(loaded.initialIndex ?? 0, loaded.words.length - 1)
        initializedRef.current = true
        wordsRef.current = loaded.words
        lastPersistedIndexRef.current = initialIndex
        setWords(loaded.words)
        setHasWords(true)
        syncQueuedSession(loaded.words, initialIndex)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load queued typing session:', error)
        initializedRef.current = false
        wordsRef.current = []
        setWords([])
        setHasWords(false)
        setRepeatLearning(false)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [loadSession, setRepeatLearning, syncQueuedSession])

  useEffect(() => {
    if (!initializedRef.current || !persistIndex) return
    if (stateIndex === lastPersistedIndexRef.current) return

    lastPersistedIndexRef.current = stateIndex
    void persistIndex(stateIndex, wordsRef.current)
  }, [persistIndex, stateIndex])

  const advanceCurrentWord = useCallback(() => {
    if (words.length === 0) {
      return
    }

    const nextIndex = stateIndex < words.length - 1 ? stateIndex + 1 : 0
    syncQueuedSession(words, nextIndex)
  }, [stateIndex, syncQueuedSession, words])

  return {
    words,
    currentIndex: stateIndex,
    isLoading,
    hasWords,
    advanceCurrentWord,
  }
}

export type { SyncQueuedTypingSessionPayload }

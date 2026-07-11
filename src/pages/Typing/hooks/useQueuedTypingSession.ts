import type { TypingStateAction } from '../store'
import { TypingStateActionType } from '../store'
import type { WordWithIndex } from '@/typings'
import type { Dispatch } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type LoadedQueuedTypingSession = {
  words: WordWithIndex[]
  initialIndex?: number
}

type UseQueuedTypingSessionParams = {
  stateIndex: number
  dispatch: Dispatch<TypingStateAction>
  loadSession: () => Promise<LoadedQueuedTypingSession | null>
  persistIndex?: (index: number, wordNames: string[]) => Promise<void> | void
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
  const { stateIndex, dispatch, loadSession, persistIndex, repeatLearning = true } = params

  const [words, setWords] = useState<WordWithIndex[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasWords, setHasWords] = useState(true)
  const initializedRef = useRef(false)
  const wordNamesRef = useRef<string[]>([])
  const lastPersistedIndexRef = useRef(0)

  const syncSession = useCallback(
    (nextWords: WordWithIndex[], nextIndex: number) => {
      dispatch({
        type: TypingStateActionType.SYNC_SESSION,
        payload: {
          words: nextWords,
          index: nextIndex,
          isFinished: nextWords.length === 0,
          autoStart: nextWords.length > 0,
        },
      })
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: repeatLearning })
    },
    [dispatch, repeatLearning],
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
          wordNamesRef.current = []
          setWords([])
          setHasWords(false)
          syncSession([], 0)
          dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: false })
          return
        }

        const initialIndex = Math.min(loaded.initialIndex ?? 0, loaded.words.length - 1)
        initializedRef.current = true
        wordNamesRef.current = loaded.words.map((word) => word.name)
        lastPersistedIndexRef.current = initialIndex
        setWords(loaded.words)
        setHasWords(true)
        syncSession(loaded.words, initialIndex)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load queued typing session:', error)
        initializedRef.current = false
        wordNamesRef.current = []
        setWords([])
        setHasWords(false)
        dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: false })
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
  }, [loadSession, syncSession])

  useEffect(() => {
    if (!initializedRef.current || !persistIndex) return
    if (stateIndex === lastPersistedIndexRef.current) return

    lastPersistedIndexRef.current = stateIndex
    void persistIndex(stateIndex, wordNamesRef.current)
  }, [persistIndex, stateIndex])

  const advanceCurrentWord = useCallback(() => {
    if (words.length === 0) {
      return
    }

    const nextIndex = stateIndex < words.length - 1 ? stateIndex + 1 : 0
    syncSession(words, nextIndex)
  }, [stateIndex, syncSession, words])

  return {
    words,
    currentIndex: stateIndex,
    isLoading,
    hasWords,
    advanceCurrentWord,
  }
}

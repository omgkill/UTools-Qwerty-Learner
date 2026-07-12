import {
  clearNormalTypingSession,
  completeCurrentWord,
  loadNormalTypingSession,
  markCurrentWordMastered,
  saveNormalTypingSession,
} from '@/features/typing/application/use-cases'
import type { LearningType, TypingSession, TypingWordKind } from '@/features/typing/domain'
import { useNormalTypingSessionAdapter } from '@/features/typing/presentation/adapters/normal-typing-session.adapter'
import type { WordWithIndex } from '@/typings'
import { useCallback, useEffect, useRef, useState } from 'react'

export type UseNormalTypingSessionResult = {
  session: TypingSession | null
  words: WordWithIndex[] | undefined
  currentIndex: number
  currentWordKind: TypingWordKind | undefined
  isLoading: boolean
  error: Error | undefined
  learningType: LearningType
  dueCount: number
  newCount: number
  masteredCount: number
  todayLearned: number
  todayReviewed: number
  todayMastered: number
  reloadSession: () => void
  completeSessionWord: (params: { isCorrect: boolean; wrongCount: number }) => Promise<void>
  markSessionWordMastered: () => Promise<void>
}

export function useNormalTypingSession(): UseNormalTypingSessionResult {
  const [session, setSession] = useState<TypingSession | null>(null)
  const [loadVersion, setLoadVersion] = useState(0)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const loadVersionRef = useRef(0)
  const { currentDictId, wordList, wordListError, isWordListLoading, repositories } = useNormalTypingSessionAdapter()
  const { wordProgressRepository, dailyRecordRepository, typingStateRepository } = repositories

  const loadSession = useCallback(async () => {
    if (!currentDictId || !wordList) {
      setSession(null)
      return
    }

    if (isLoadingSession) {
      return
    }

    setIsLoadingSession(true)
    const currentVersion = loadVersionRef.current

    try {
      const nextSession = await loadNormalTypingSession({
        dictId: currentDictId,
        wordList,
        wordProgressRepository,
        dailyRecordRepository,
        typingStateRepository,
      })

      if (currentVersion !== loadVersionRef.current) {
        return
      }

      setSession(nextSession)
    } catch (loadError) {
      console.error('Failed to load typing session:', loadError)
      setSession(null)
    } finally {
      setIsLoadingSession(false)
    }
  }, [currentDictId, dailyRecordRepository, isLoadingSession, typingStateRepository, wordList, wordProgressRepository])

  const reloadSession = useCallback(() => {
    loadVersionRef.current += 1
    setLoadVersion((version) => version + 1)
  }, [])

  const completeSessionWord = useCallback(
    async (params: { isCorrect: boolean; wrongCount: number }) => {
      if (!session || !wordList) {
        return
      }

      const result = await completeCurrentWord({
        session,
        wordList,
        isCorrect: params.isCorrect,
        wrongCount: params.wrongCount,
        wordProgressRepository,
        dailyRecordRepository,
      })

      if (result.session.isFinished) {
        await clearNormalTypingSession({
          dictId: result.session.dictId,
          typingStateRepository,
        })
      } else {
        await saveNormalTypingSession({
          session: result.session,
          typingStateRepository,
        })
      }

      setSession(result.session)
    },
    [dailyRecordRepository, session, typingStateRepository, wordList, wordProgressRepository],
  )

  const markSessionWordMastered = useCallback(async () => {
    if (!session || !wordList) {
      return
    }

    const result = await markCurrentWordMastered({
      session,
      wordList,
      wordProgressRepository,
      dailyRecordRepository,
    })

    if (result.session.isFinished) {
      await clearNormalTypingSession({
        dictId: result.session.dictId,
        typingStateRepository,
      })
    } else {
      await saveNormalTypingSession({
        session: result.session,
        typingStateRepository,
      })
    }

    setSession(result.session)
  }, [dailyRecordRepository, session, typingStateRepository, wordList, wordProgressRepository])

  useEffect(() => {
    void loadSession()
  }, [loadSession, loadVersion])

  return {
    session,
    words: session ? session.queueWords.map((entry) => entry.word) : wordList === undefined ? undefined : [],
    currentIndex: session?.currentIndex ?? 0,
    currentWordKind: session?.currentWordKind,
    isLoading: isWordListLoading || isLoadingSession,
    error: wordListError,
    learningType: session?.learningType ?? 'complete',
    dueCount: session?.dueCount ?? 0,
    newCount: session?.newCount ?? 0,
    masteredCount: session?.masteredCount ?? 0,
    todayLearned: session?.todayCounts.learned ?? 0,
    todayReviewed: session?.todayCounts.reviewed ?? 0,
    todayMastered: session?.todayCounts.mastered ?? 0,
    reloadSession,
    completeSessionWord,
    markSessionWordMastered,
  }
}

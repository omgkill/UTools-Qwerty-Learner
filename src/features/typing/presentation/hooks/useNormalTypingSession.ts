import {
  clearNormalTypingSession,
  completeCurrentWord,
  loadNormalTypingSession,
  markCurrentWordMastered,
  saveNormalTypingSession,
} from '@/features/typing/application/use-cases'
import type { LearningType, TypingSession, TypingWordKind } from '@/features/typing/domain'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { appLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository'
import { dexieTypingStateRepository } from '@/infra/repositories/typing-state.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { currentDictIdAtom, currentWordBankAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings'
import { readLocalWordBank } from '@/features/word-bank/application'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

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
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)

  const [session, setSession] = useState<TypingSession | null>(null)
  const [loadVersion, setLoadVersion] = useState(0)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const loadVersionRef = useRef(0)
  const retryWordListRef = useRef<string | null>(null)

  const isLocalWordBank = useMemo(() => {
    return currentWordBank ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom' : false
  }, [currentWordBank])

  const swrKey = useMemo(() => {
    return currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null
  }, [currentWordBank, isLocalWordBank])

  const fetcher = isLocalWordBank ? localWordListFetcher : wordListFetcher
  const { data: wordList, error, isLoading: isWordListLoading, mutate } = useSWR(swrKey, fetcher)

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
        wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
        typingStateRepository: dexieTypingStateRepository,
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
  }, [currentDictId, wordList, isLoadingSession])

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
        wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
      })

      if (result.session.isFinished) {
        await clearNormalTypingSession({
          dictId: result.session.dictId,
          typingStateRepository: dexieTypingStateRepository,
        })
      } else {
        await saveNormalTypingSession({
          session: result.session,
          typingStateRepository: dexieTypingStateRepository,
        })
      }

      setSession(result.session)
    },
    [session, wordList],
  )

  const markSessionWordMastered = useCallback(async () => {
    if (!session || !wordList) {
      return
    }

      const result = await markCurrentWordMastered({
        session,
        wordList,
      wordProgressRepository: dexieWordProgressRepository,
        dailyRecordRepository: dexieDailyRecordRepository,
      })

      if (result.session.isFinished) {
        await clearNormalTypingSession({
          dictId: result.session.dictId,
          typingStateRepository: dexieTypingStateRepository,
        })
      } else {
        await saveNormalTypingSession({
          session: result.session,
          typingStateRepository: dexieTypingStateRepository,
        })
      }

      setSession(result.session)
    }, [session, wordList])

  useEffect(() => {
    void loadSession()
  }, [loadSession, loadVersion])

  useEffect(() => {
    if (!currentWordBank) return
    if (isWordListLoading) return
    if (!wordList) return
    if (wordList.length > 0) {
      retryWordListRef.current = null
      return
    }
    if (currentWordBank.length === 0) return
    const retryKey = currentWordBank.id
    if (retryWordListRef.current === retryKey) return
    retryWordListRef.current = retryKey
    void mutate()
  }, [currentWordBank, isWordListLoading, wordList, mutate])

  return {
    session,
    words: session ? session.queueWords.map((entry) => entry.word) : wordList === undefined ? undefined : [],
    currentIndex: session?.currentIndex ?? 0,
    currentWordKind: session?.currentWordKind,
    isLoading: isWordListLoading || isLoadingSession,
    error,
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

async function wordListFetcher(url: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    const response = await fetch('.' + url)
    words = await response.json()
  } catch (err) {
    console.error('Failed to load word list:', err)
  }

  return words
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    words = readLocalWordBank(appLocalWordBankRepository, id)
  } catch (err) {
    console.error('Failed to load word list:', err)
  }
  return words
}

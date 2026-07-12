import type {
  DailyRecordRepository,
  TypingStateRepository,
  WordProgressRepository,
} from '@/features/typing/application/ports'
import { loadTypingWordList } from '@/features/typing/presentation/hooks/load-typing-word-list'
import { dexieDailyRecordRepository } from '@/infra/repositories/daily-record.repository.dexie'
import { dexieTypingStateRepository } from '@/infra/repositories/typing-state.repository.dexie'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { currentDictIdAtom, currentWordBankAtom } from '@/store'
import type { WordBank, WordWithIndex } from '@/typings'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'
import useSWR from 'swr'

type NormalTypingSessionRepositories = {
  wordProgressRepository: WordProgressRepository
  dailyRecordRepository: DailyRecordRepository
  typingStateRepository: TypingStateRepository
}

type UseNormalTypingSessionAdapterResult = {
  currentDictId: string
  currentWordBank: WordBank | null
  wordList: WordWithIndex[] | null | undefined
  wordListError: Error | undefined
  isWordListLoading: boolean
  repositories: NormalTypingSessionRepositories
}

const normalTypingSessionRepositories: NormalTypingSessionRepositories = {
  wordProgressRepository: dexieWordProgressRepository,
  dailyRecordRepository: dexieDailyRecordRepository,
  typingStateRepository: dexieTypingStateRepository,
}

export function useNormalTypingSessionAdapter(): UseNormalTypingSessionAdapterResult {
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)
  const retryWordListRef = useRef<string | null>(null)
  const wordListKey = getNormalTypingWordListKey(currentWordBank)
  const {
    data: wordList,
    error: wordListError,
    isLoading: isWordListLoading,
    mutate,
  } = useSWR(wordListKey, loadNormalTypingWordList)

  useEffect(() => {
    if (wordList && wordList.length > 0) {
      retryWordListRef.current = null
      return
    }

    if (
      !shouldRetryNormalTypingWordList({
        currentWordBank,
        wordList,
        isWordListLoading,
        lastRetriedWordBankId: retryWordListRef.current,
      })
    ) {
      return
    }

    if (!currentWordBank) {
      return
    }

    retryWordListRef.current = currentWordBank.id
    void mutate()
  }, [currentWordBank, isWordListLoading, mutate, wordList])

  return {
    currentDictId,
    currentWordBank,
    wordList,
    wordListError,
    isWordListLoading,
    repositories: normalTypingSessionRepositories,
  }
}

export function getNormalTypingWordListKey(currentWordBank: WordBank | null) {
  return currentWordBank ? (['typing-word-list', currentWordBank] as const) : null
}

export function shouldRetryNormalTypingWordList(params: {
  currentWordBank: WordBank | null
  wordList: WordWithIndex[] | null | undefined
  isWordListLoading: boolean
  lastRetriedWordBankId: string | null
}): boolean {
  const { currentWordBank, wordList, isWordListLoading, lastRetriedWordBankId } = params

  if (!currentWordBank) {
    return false
  }

  if (isWordListLoading) {
    return false
  }

  if (wordList === undefined || wordList === null) {
    return false
  }

  if (wordList.length > 0) {
    return false
  }

  if (currentWordBank.length === 0) {
    return false
  }

  if (lastRetriedWordBankId === currentWordBank.id) {
    return false
  }

  return true
}

async function loadNormalTypingWordList([, currentWordBank]: readonly [string, WordBank]): Promise<WordWithIndex[] | null> {
  return loadTypingWordList(currentWordBank)
}

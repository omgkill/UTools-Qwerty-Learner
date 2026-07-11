import Layout from '../../components/Layout'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { useKeyboardStartListener } from './hooks/useKeyboardStartListener'
import { useLearningRecordSaver } from './hooks/useLearningRecordSaver'
import { useQueuedTypingSession } from './hooks/useQueuedTypingSession'
import { useTypingHotkeys } from './hooks/useTypingHotkeys'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingTimer } from './hooks/useTypingTimer'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import {
  getConsolidateWords,
  getSavedQueuedLearningState,
  saveQueuedLearningState,
} from '@/features/typing/application/use-cases'
import { loadWordList as loadWordListUseCase } from '@/features/word-bank/application'
import { appLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository'
import { dexieWordProgressRepository } from '@/infra/repositories/word-progress.repository.dexie'
import { getMode, onModeChange } from '@/platform/utools'
import { currentDictIdAtom } from '@/store'
import type { Word, WordBank, WordWithIndex } from '@/typings'
import { getTodayStartTime } from '@/utils/timeService'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useCallback, useContext, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

const LEGACY_CONSOLIDATE_PROGRESS_KEY = 'consolidate-learning-progress'

type LegacyConsolidateProgress = {
  dictId: string
  date: string
  index: number
  wordNames: string[]
}

function getTodayDate(): string {
  return new Date(getTodayStartTime()).toISOString().split('T')[0]
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash = hash & hash
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.abs((hash = (hash * 1103515245 + 12345) & 0x7fffffff)) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function loadLegacyConsolidateProgress(dictId: string): LegacyConsolidateProgress | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(LEGACY_CONSOLIDATE_PROGRESS_KEY)
    if (!saved) {
      return null
    }

    const progress = JSON.parse(saved) as LegacyConsolidateProgress
    if (progress.dictId !== dictId || progress.date !== getTodayDate()) {
      return null
    }

    return progress
  } catch {
    return null
  }
}

function clearLegacyConsolidateProgress() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(LEGACY_CONSOLIDATE_PROGRESS_KEY)
  } catch {}
}

interface ConsolidateTypingAppInnerProps {
  currentWordBank: WordBank
}

const ConsolidateTypingAppInner: React.FC<ConsolidateTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()
  const currentDictId = useAtomValue(currentDictIdAtom)
  const navigate = useNavigate()
  const stateIndex = state.wordListData.index

  const loadConsolidateWords = useCallback(async () => {
    if (!currentDictId) {
      return null
    }

    const wordList = await loadWordList(currentWordBank)
    if (!wordList || wordList.length === 0) {
      return null
    }

    const learnedWords = await getConsolidateWords({
      dictId: currentDictId,
      wordList,
      wordProgressRepository: dexieWordProgressRepository,
    })

    if (learnedWords.length === 0) {
      return null
    }

    const saved = await getSavedQueuedLearningState({
      dictId: currentDictId,
      sessionType: 'consolidate',
      date: getTodayDate(),
    })
    const legacySaved = saved ? null : loadLegacyConsolidateProgress(currentDictId)
    let finalWords: WordWithIndex[] = []
    let finalIndex = 0

    if (saved && saved.learningWords.length > 0) {
      const savedNames = saved.learningWords.map((word) => word.name)
      const savedSet = new Set(savedNames)
      finalWords = learnedWords.filter((word) => savedSet.has(word.name))

      const orderedNames = savedNames.filter((name) => finalWords.some((word) => word.name === name))
      finalWords = orderedNames
        .map((name) => finalWords.find((word) => word.name === name))
        .filter((word): word is WordWithIndex => word !== undefined)
      finalIndex = Math.min(saved.currentIndex, finalWords.length - 1)
    } else if (legacySaved && legacySaved.wordNames.length > 0) {
      const savedSet = new Set(legacySaved.wordNames)
      finalWords = learnedWords.filter((word) => savedSet.has(word.name))

      const orderedNames = legacySaved.wordNames.filter((name) => finalWords.some((word) => word.name === name))
      finalWords = orderedNames
        .map((name) => finalWords.find((word) => word.name === name))
        .filter((word): word is WordWithIndex => word !== undefined)
      finalIndex = Math.min(legacySaved.index, finalWords.length - 1)
    } else {
      const date = getTodayDate()
      finalWords = shuffleWithSeed(learnedWords, `${currentDictId}-${date}`)
    }

    if (finalWords.length === 0) {
      return null
    }

    await saveQueuedLearningState({
      dictId: currentDictId,
      sessionType: 'consolidate',
      learningWords: finalWords,
      currentIndex: finalIndex,
      date: getTodayDate(),
    })
    if (legacySaved) {
      clearLegacyConsolidateProgress()
    }

    return {
      words: finalWords,
      initialIndex: finalIndex,
    }
  }, [currentDictId, currentWordBank])

  const { words: consolidateWords, currentIndex, isLoading, hasWords, advanceCurrentWord } = useQueuedTypingSession({
    stateIndex,
    dispatch,
    loadSession: loadConsolidateWords,
    persistIndex: currentDictId
      ? (index) =>
          saveQueuedLearningState({
            dictId: currentDictId,
            sessionType: 'consolidate',
            learningWords: state.wordListData.words,
            currentIndex: index,
            date: getTodayDate(),
          })
      : undefined,
  })

  const handleWordFinished = useCallback((_params: { isCorrect: boolean; wrongCount: number }) => {
    advanceCurrentWord()
  }, [advanceCurrentWord])

  useLearningRecordSaver(state)
  useTypingTimer(state.uiState.isTyping)
  useKeyboardStartListener(state.uiState.isTyping, false)

  useEffect(() => {
    const handleModeChange = (mode: string) => {
      if (mode === 'conceal' || mode === 'moyu') {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: true })
      } else {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: false })
      }
    }

    const windowMode = getMode()
    handleModeChange(windowMode)

    const cleanup = onModeChange(handleModeChange)
    return cleanup
  }, [dispatch])

  useTypingHotkeys(state.isImmersiveMode)

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  const handleExitConsolidateLearning = useCallback(() => {
    dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: false })
    navigate('/')
  }, [dispatch, navigate])

  useConfetti(false)

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          ></div>
        </div>
      </Layout>
    )
  }

  if (!hasWords) {
    return (
      <Layout>
        <div className="flex h-full flex-col items-center justify-center space-y-6">
          <div className="text-6xl">📚</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">暂无可巩固的单词</h2>
          <p className="text-gray-600 dark:text-gray-400">请先进行正常学习，积累一定数量的单词后再来巩固学习</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
          >
            返回正常学习
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <>
      <Layout>
        {!state.isImmersiveMode && (
          <Header>
            <Tooltip content="切换词库">
              <NavLink
                className="block rounded-lg px-3 py-1 text-lg text-white text-opacity-60 transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white hover:text-opacity-100 focus:outline-none"
                to="/gallery"
              >
                {currentWordBank.name}
              </NavLink>
            </Tooltip>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-indigo-200">🔁 巩固学习</span>
              <span className="rounded bg-white/20 px-2 py-0.5">
                {currentIndex + 1} / {consolidateWords.length}
              </span>
            </div>
            <PronunciationSwitcher />
            <Switcher />
            <StartButton isLoading={false} />
            <button
              onClick={handleExitConsolidateLearning}
              className="rounded-lg bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600"
            >
              退出巩固学习
            </button>
          </Header>
        )}
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-4">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              <WordPanel onWordFinished={handleWordFinished} />
            </div>
            {!state.isImmersiveMode && <Speed />}
          </div>
        </div>
      </Layout>

      {!state.isImmersiveMode && <WordList />}
    </>
  )
}

const ConsolidateTypingPage: React.FC = () => {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          ></div>
        </div>
      </Layout>
    )
  }

  return (
    <TypingContext.Provider value={{ state, dispatch }}>
      <ConsolidateTypingAppInner currentWordBank={currentWordBank} />
    </TypingContext.Provider>
  )
}

function useTypingContext() {
  const context = useContext(TypingContext)
  if (!context) {
    throw new Error('TypingContext is not available')
  }
  return context
}

async function loadWordList(currentWordBank: WordBank): Promise<WordWithIndex[] | null> {
  return loadWordListUseCase(appLocalWordBankRepository, currentWordBank)
}

export default ConsolidateTypingPage

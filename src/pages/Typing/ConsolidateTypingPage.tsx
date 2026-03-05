import Layout from '../../components/Layout'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingHotkeys } from './hooks/useTypingHotkeys'
import { useLearningRecordSaver } from './hooks/useLearningRecordSaver'
import { useTypingTimer } from './hooks/useTypingTimer'
import { useKeyboardStartListener } from './hooks/useKeyboardStartListener'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import type { Word, WordBank, WordWithIndex } from '@/typings'
import { currentDictIdAtom } from '@/store'
import { db } from '@/utils/db'
import { getTodayStartTime } from '@/utils/timeService'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

const CONSOLIDATE_PROGRESS_KEY = 'consolidate-learning-progress'

type SavedProgress = {
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
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.abs((hash = (hash * 1103515245 + 12345) & 0x7fffffff)) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function loadSavedProgress(dictId: string): { index: number; wordNames: string[] | null } {
  try {
    const saved = localStorage.getItem(CONSOLIDATE_PROGRESS_KEY)
    if (!saved) return { index: 0, wordNames: null }

    const progress: SavedProgress = JSON.parse(saved)
    if (progress.dictId === dictId && progress.date === getTodayDate()) {
      return { index: progress.index, wordNames: progress.wordNames }
    }
    return { index: 0, wordNames: null }
  } catch {
    return { index: 0, wordNames: null }
  }
}

function saveProgress(dictId: string, index: number, wordNames: string[]): void {
  const progress: SavedProgress = {
    dictId,
    date: getTodayDate(),
    index,
    wordNames,
  }
  localStorage.setItem(CONSOLIDATE_PROGRESS_KEY, JSON.stringify(progress))
}

interface ConsolidateTypingAppInnerProps {
  currentWordBank: WordBank
}

const ConsolidateTypingAppInner: React.FC<ConsolidateTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()
  const currentDictId = useAtomValue(currentDictIdAtom)
  const navigate = useNavigate()
  const isInitializedRef = useRef(false)

  const [consolidateWords, setConsolidateWords] = useState<WordWithIndex[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasWords, setHasWords] = useState(true)
  const wordNamesRef = useRef<string[]>([])

  const loadConsolidateWords = useCallback(async () => {
    if (!currentDictId) return

    setIsLoading(true)
    try {
      const wordList = await loadWordList(currentWordBank)
      if (!wordList || wordList.length === 0) {
        setHasWords(false)
        return
      }

      // 获取已学习但未掌握的单词（masteryLevel > 0 && masteryLevel < 7）
      const allProgress = await db.wordProgress
        .where('dictId')
        .equals(currentDictId)
        .toArray()

      const learnedButNotMasteredNames = new Set(
        allProgress
          .filter((p) => p.masteryLevel > 0 && p.masteryLevel < 7)
          .map((p) => p.word)
      )

      if (learnedButNotMasteredNames.size === 0) {
        setHasWords(false)
        return
      }

      const saved = loadSavedProgress(currentDictId)
      let finalWords: WordWithIndex[] = []
      let finalIndex = 0

      if (saved.wordNames && saved.wordNames.length > 0) {
        const savedSet = new Set(saved.wordNames)
        finalWords = wordList
          .filter((w) => savedSet.has(w.name) && learnedButNotMasteredNames.has(w.name))
          .filter((w) => learnedButNotMasteredNames.has(w.name))

        const orderedNames = saved.wordNames.filter((name) => finalWords.some((w) => w.name === name))
        finalWords = orderedNames.map((name) => finalWords.find((w) => w.name === name)).filter((w): w is WordWithIndex => w !== undefined)
        finalIndex = Math.min(saved.index, finalWords.length - 1)
      } else {
        const consolidateWords = wordList.filter((w) => learnedButNotMasteredNames.has(w.name))
        const date = getTodayDate()
        finalWords = shuffleWithSeed(consolidateWords, `${currentDictId}-${date}`)
        finalIndex = 0
      }

      if (finalWords.length === 0) {
        setHasWords(false)
        return
      }

      wordNamesRef.current = finalWords.map((w) => w.name)
      setConsolidateWords(finalWords)
      setCurrentIndex(finalIndex)

      dispatch({
        type: TypingStateActionType.SET_WORDS,
        payload: { words: finalWords },
      })
      dispatch({
        type: TypingStateActionType.SET_CURRENT_INDEX,
        payload: finalIndex,
      })
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })

      saveProgress(currentDictId, finalIndex, wordNamesRef.current)
      isInitializedRef.current = true
    } catch (e) {
      console.error('Failed to load consolidate words:', e)
      setHasWords(false)
    } finally {
      setIsLoading(false)
    }
  }, [currentDictId, currentWordBank, dispatch])

  useEffect(() => {
    loadConsolidateWords()
  }, [loadConsolidateWords])

  useLearningRecordSaver(state)
  useTypingTimer(state.uiState.isTyping)
  useKeyboardStartListener(state.uiState.isTyping, false)

  useEffect(() => {
    const handleModeChange = () => {
      const windowMode = window.getMode()
      if (windowMode === 'conceal' || windowMode === 'moyu') {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: true })
      } else {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: false })
      }
    }

    handleModeChange()
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
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

  useEffect(() => {
    if (!isInitializedRef.current || !currentDictId) return
    if (state.wordListData.index !== currentIndex) {
      setCurrentIndex(state.wordListData.index)
      saveProgress(currentDictId, state.wordListData.index, wordNamesRef.current)
    }
  }, [state.wordListData.index, currentIndex, currentDictId])

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
          <p className="text-gray-600 dark:text-gray-400">
            请先进行正常学习，积累一定数量的单词后再来巩固学习
          </p>
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
                className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none text-white text-opacity-60 hover:text-opacity-100"
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
              <WordPanel />
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
  if (!currentWordBank) return null

  const isLocalWordBank = currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'

  try {
    let words: Word[] = []

    if (isLocalWordBank) {
      const rawWords = await window.readLocalWordBank(currentWordBank.id)
      words = rawWords.map((w: Partial<Word>) => ({
        name: w.name || '',
        trans: w.trans || [],
        usphone: w.usphone || '',
        ukphone: w.ukphone || '',
        notation: w.notation,
        tense: w.tense,
      }))
    } else {
      const response = await fetch('.' + currentWordBank.url)
      const rawWords = await response.json()
      words = rawWords.map((w: Partial<Word>) => ({
        name: w.name || '',
        trans: w.trans || [],
        usphone: w.usphone || '',
        ukphone: w.ukphone || '',
        notation: w.notation,
        tense: w.tense,
      }))
    }

    return words.map((word, index) => ({
      ...word,
      index,
    }))
  } catch (e) {
    console.error('Failed to load word list:', e)
    return null
  }
}

export default ConsolidateTypingPage

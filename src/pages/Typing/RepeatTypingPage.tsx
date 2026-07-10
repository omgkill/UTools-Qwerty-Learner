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
import { getRepeatLearningWords } from '@/services'
import { currentDictIdAtom } from '@/store'
import { db } from '@/utils/db'
import { useRepeatLearningManager } from './hooks/useRepeatLearningManager'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

interface RepeatTypingAppInnerProps {
  currentWordBank: WordBank
}

const RepeatTypingAppInner: React.FC<RepeatTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()
  const currentDictId = useAtomValue(currentDictIdAtom)
  const navigate = useNavigate()
  const repeatLearningManager = useRepeatLearningManager()
  const isInitializedRef = useRef(false)

  const [repeatWords, setRepeatWords] = useState<WordWithIndex[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasWords, setHasWords] = useState(true)
  const wordNamesRef = useRef<string[]>([])

  const loadRepeatWords = useCallback(async () => {
    if (!currentDictId) return

    setIsLoading(true)
    try {
      const savedState = await repeatLearningManager.initialize(currentDictId)
      if (savedState && savedState.learningWords.length > 0) {
        wordNamesRef.current = savedState.learningWords.map((word) => word.name)
        setRepeatWords(savedState.learningWords)
        setCurrentIndex(savedState.currentIndex)
        setHasWords(true)

        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: savedState.learningWords },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: savedState.currentIndex,
        })
        dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
        isInitializedRef.current = true
        return
      }

      const wordList = await loadWordList(currentWordBank)
      if (!wordList || wordList.length === 0) {
        setHasWords(false)
        return
      }

      const words = await getRepeatLearningWords({
        currentDictId,
        wordList,
        listWordRecordsInRange: async (dictId, start, end) => {
          return db.wordRecords
            .where('[dict+timeStamp]')
            .between([dictId, start], [dictId, end])
            .toArray()
        },
      })

      if (words.length === 0) {
        setHasWords(false)
        return
      }

      wordNamesRef.current = words.map((word) => word.name)
      setRepeatWords(words)
      setCurrentIndex(0)
      
      dispatch({
        type: TypingStateActionType.SET_WORDS,
        payload: { words },
      })
      dispatch({
        type: TypingStateActionType.SET_CURRENT_INDEX,
        payload: 0,
      })
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })

      await repeatLearningManager.start(currentDictId, words)
      isInitializedRef.current = true
    } catch (e) {
      console.error('Failed to load repeat words:', e)
      setHasWords(false)
    } finally {
      setIsLoading(false)
    }
  }, [currentDictId, currentWordBank, dispatch, repeatLearningManager])

  useEffect(() => {
    loadRepeatWords()
  }, [loadRepeatWords])

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
      void repeatLearningManager.updateIndex(currentDictId, state.wordListData.index)
    }
  }, [state.wordListData.index, currentIndex, currentDictId, repeatLearningManager])

  const handleExitRepeatLearning = useCallback(() => {
    dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: false })
    if (currentDictId) {
      void repeatLearningManager.clear(currentDictId)
    }
    navigate('/')
  }, [currentDictId, dispatch, navigate, repeatLearningManager])

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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">暂无可重复学习的单词</h2>
          <p className="text-gray-600 dark:text-gray-400">
            请先进行正常学习，积累一定数量的单词后再来重复学习
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
              <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-indigo-200">🔄 重复学习</span>
              <span className="rounded bg-white/20 px-2 py-0.5">
                {currentIndex + 1} / {repeatWords.length}
              </span>
            </div>
            <PronunciationSwitcher />
            <Switcher />
            <StartButton isLoading={false} />
            <button
              onClick={handleExitRepeatLearning}
              className="rounded-lg bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600"
            >
              退出重复学习
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

const RepeatTypingPage: React.FC = () => {
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
      <RepeatTypingAppInner currentWordBank={currentWordBank} />
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

export default RepeatTypingPage

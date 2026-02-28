import Layout from '../../components/Layout'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import type { LearningType } from './hooks/useWordList'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingHotkeys } from './hooks/useTypingHotkeys'
import { useLearningRecordSaver } from './hooks/useLearningRecordSaver'
import { useTypingTimer } from './hooks/useTypingTimer'
import { useExtraReviewPopup } from './hooks/useExtraReviewPopup'
import { useKeyboardStartListener } from './hooks/useKeyboardStartListener'
import { useWordSync } from './hooks/useWordSync'
import { useRepeatLearningManager } from './hooks/useRepeatLearningManager'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import type { WordBank } from '@/typings'
import { useDailyRecord, useWordProgress } from '@/utils/db/useProgress'
import { handleMasteredFlow } from '@/services'
import { WordRecord } from '@/utils/db/record'
import { db } from '@/utils/db'
import { currentDictIdAtom } from '@/store'
import { getUtoolsValue } from '@/utils/utools'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useCallback, useContext, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

const LEARNING_TYPE_LABELS: Record<LearningType, { icon: string; label: string }> = {
  review: { icon: '🔄', label: '复习' },
  new: { icon: '📚', label: '新词' },
  consolidate: { icon: '🔁', label: '巩固' },
  complete: { icon: '✅', label: '完成' },
}

interface TypingAppInnerProps {
  currentWordBank: WordBank
}

const TypingAppInner: React.FC<TypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()
  const isRepeatLearning = state.uiState.isRepeatLearning
  const currentDictId = useAtomValue(currentDictIdAtom)

  const repeatLearningInitialIndexRef = useRef<number | undefined>(undefined)

  const {
    words,
    learningWords,
    learningType,
    todayLearned,
    todayReviewed,
    todayMastered,
    newWordQuota,
    remainingForTarget,
    hasReachedTarget,
    hasMoreDueWords,
    remainingDueCount,
    isExtraReview,
    startExtraReview,
    startRepeatLearning,
    getNextNewWord,
    setLearningWords,
    setLearningType,
    reloadWords,
  } = useWordList(isRepeatLearning)

  const { markAsMastered } = useWordProgress()
  const { incrementMastered } = useDailyRecord()
  const dictID = useAtomValue(currentDictIdAtom)

  const repeatLearningManager = useRepeatLearningManager()
  const normalLearningWordsRef = useRef<typeof words>(undefined)
  const normalLearningTypeRef = useRef<LearningType>(learningType)
  const prevIsRepeatLearningRef = useRef(isRepeatLearning)

  useLearningRecordSaver(state)

  const createWordRecord = useCallback(async (word: string) => {
    const resolvedDictId = dictID || getUtoolsValue('currentWordBank', '')
    if (!resolvedDictId) return
    try {
      const wordRecord = new WordRecord(word, resolvedDictId, null, [], 0, {})
      await db.wordRecords.add(wordRecord)
    } catch (e) {
      console.error('Failed to save mastered word record:', e)
    }
  }, [dictID])

  useTypingTimer(state.uiState.isTyping)
  useKeyboardStartListener(state.uiState.isTyping, false)
  useWordSync(words, state.uiState.isTyping, isRepeatLearning, repeatLearningInitialIndexRef.current)

  useEffect(() => {
    const handleModeChange = () => {
      const mode = window.getMode()
      if (mode === 'conceal' || mode === 'moyu') {
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

  const handleMastered = useCallback(async () => {
    const currentWord = state.wordListData.words?.[state.wordListData.index]
    const result = await handleMasteredFlow({
      currentWord,
      markAsMastered,
      getNextNewWord,
      createWordRecord,
    })

    await incrementMastered()

    if (result.replacementWord) {
      dispatch({ type: TypingStateActionType.ADD_REPLACEMENT_WORD, payload: result.replacementWord })
    }

    if (result.shouldSkip) {
      dispatch({ type: TypingStateActionType.SKIP_WORD })
    }
  }, [state.wordListData.words, state.wordListData.index, markAsMastered, dispatch, getNextNewWord, incrementMastered, createWordRecord])

  useTypingHotkeys(state.isImmersiveMode)

  const { showPopup, handleConfirm, handleDismiss } = useExtraReviewPopup(
    hasReachedTarget,
    hasMoreDueWords,
    isExtraReview,
    startExtraReview,
  )

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
    if (!currentDictId) return

    const initializeRepeatLearning = async () => {
      const savedState = await repeatLearningManager.initialize(currentDictId)
      if (savedState) {
        dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
        repeatLearningInitialIndexRef.current = savedState.currentIndex
        setLearningWords(savedState.learningWords)
        setLearningType('review')
      }
    }

    initializeRepeatLearning()
  }, [currentDictId, dispatch, setLearningWords, setLearningType, repeatLearningManager])

  useEffect(() => {
    if (!currentDictId || !repeatLearningManager.isRepeatLearning()) return

    repeatLearningManager.updateIndex(currentDictId, state.wordListData.index)
  }, [currentDictId, state.wordListData.index, repeatLearningManager])

  useEffect(() => {
    if (prevIsRepeatLearningRef.current && !isRepeatLearning) {
      repeatLearningManager.clear(currentDictId)
      if (normalLearningWordsRef.current && normalLearningWordsRef.current.length > 0) {
        setLearningWords(normalLearningWordsRef.current)
      }
      if (normalLearningTypeRef.current) {
        setLearningType(normalLearningTypeRef.current)
      }
      reloadWords()
    }
    prevIsRepeatLearningRef.current = isRepeatLearning
  }, [isRepeatLearning, currentDictId, repeatLearningManager, setLearningWords, setLearningType, reloadWords])

  const handleStartRepeatLearning = useCallback(async () => {
    const repeatWords = await startRepeatLearning()
    if (repeatWords.length === 0) return

    normalLearningWordsRef.current = words
    normalLearningTypeRef.current = learningType

    await repeatLearningManager.start(currentDictId, repeatWords)

    dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
    setLearningWords(repeatWords)
    setLearningType('review')
    dispatch({ type: TypingStateActionType.RESET_PROGRESS })
  }, [startRepeatLearning, words, learningType, dispatch, setLearningWords, setLearningType, repeatLearningManager, currentDictId])

  useConfetti(state.uiState.isFinished && !state.isImmersiveMode)

  const typeInfo = LEARNING_TYPE_LABELS[learningType]

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
              <span className="rounded bg-white/20 px-2 py-0.5">
                {typeInfo.icon} {typeInfo.label}
              </span>
              {(todayLearned > 0 || todayReviewed > 0) && (
                <span className="rounded bg-white/20 px-2 py-0.5">今日 {todayLearned + todayReviewed} 词</span>
              )}
              {todayMastered > 0 && (
                <span className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-200">✓ 已掌握 {todayMastered}</span>
              )}
              {learningType === 'new' && newWordQuota > 0 && (
                <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">新词配额 {newWordQuota}</span>
              )}
              {!hasReachedTarget && remainingForTarget > 0 && (
                <span className="rounded bg-white/10 px-2 py-0.5">距目标 {remainingForTarget} 词</span>
              )}
              {hasReachedTarget && (
                <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">✓ 今日目标达成</span>
              )}
            </div>
            <PronunciationSwitcher />
            <Switcher />
            <StartButton isLoading={false} />
          </Header>
        )}
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-4">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              {(learningType === 'complete' || state.uiState.isFinished) && !isRepeatLearning ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="text-6xl">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">✓ 今日目标达成</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    今日学习 <span className="font-bold text-indigo-600 dark:text-indigo-400">{todayLearned + todayReviewed}</span> 个单词
                    （新词 <span className="font-bold">{todayLearned}</span> 个，复习 <span className="font-bold">{todayReviewed}</span> 个）
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleStartRepeatLearning}
                      className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
                    >
                      🔄 重复学习
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-500">明天继续加油！</p>
                </div>
              ) : (
                <WordPanel onMastered={handleMastered} />
              )}
            </div>
            {!state.isImmersiveMode && <Speed />}
          </div>
        </div>
      </Layout>

      {!state.isImmersiveMode && <WordList />}

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 max-w-md mx-4">
            <div className="text-center">
              <div className="mb-4 text-5xl">📚</div>
              <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">还有 {remainingDueCount} 个单词待复习</h3>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                今日目标已达成，是否继续额外复习？
                <br />
                <span className="text-sm text-gray-500">（额外复习不计入今日上限）</span>
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDismiss}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  稍后再说
                </button>
                <button onClick={handleConfirm} className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600">
                  继续复习
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const App: React.FC = () => {
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
      <TypingAppInner currentWordBank={currentWordBank} />
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

export default App

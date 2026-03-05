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
import { useKeyboardStartListener } from './hooks/useKeyboardStartListener'
import { useNormalLearningSync } from './hooks/useNormalLearningSync'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import type { WordBank } from '@/typings'
import { LearningService, handleMasteredFlow } from '@/services'
import { WordRecord } from '@/utils/db/record'
import { db } from '@/utils/db'
import { currentDictIdAtom } from '@/store'
import { getUtoolsValue } from '@/utils/utools'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

const LEARNING_TYPE_LABELS: Record<LearningType, { icon: string; label: string }> = {
  review: { icon: '🔄', label: '复习' },
  new: { icon: '📚', label: '新词' },
  complete: { icon: '✅', label: '完成' },
}

interface NormalTypingAppInnerProps {
  currentWordBank: WordBank
}

const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()

  // 使用懒加载的 LearningService 实例
  const learningService = useMemo(() => new LearningService(db), [])

  const {
    words,
    learningType,
    dueCount,
    newCount,
    todayLearned,
    todayReviewed,
    todayMastered,
    getNextNewWord,
  } = useWordList('normal')

  const dictID = useAtomValue(currentDictIdAtom)

  useNormalLearningSync({
    isActive: true,
    words,
    isTyping: state.uiState.isTyping,
    dispatch,
  })

  useLearningRecordSaver(state)

  const createWordRecord = useCallback(async (word: string) => {
    const resolvedDictId = dictID || getUtoolsValue('currentWordBank', '')
    if (!resolvedDictId) return
    try {
      const wordRecord = new WordRecord(word, resolvedDictId, [], 0, {})
      await db.wordRecords.add(wordRecord)
    } catch (e) {
      console.error('Failed to save mastered word record:', e)
    }
  }, [dictID])

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

  const handleMastered = useCallback(async () => {
    const currentWord = state.wordListData.words?.[state.wordListData.index]

    // 标记单词为已掌握
    if (currentWord && dictID) {
      await learningService.markAsMastered(dictID, currentWord.name)
    }

    // 更新今日掌握计数
    if (dictID) {
      await learningService.incrementMastered(dictID)
    }

    const result = await handleMasteredFlow({
      currentWord,
      markAsMastered: async (word: string) => {
        if (dictID) return learningService.markAsMastered(dictID, word)
        throw new Error('No dict ID')
      },
      getNextNewWord,
      createWordRecord,
    })

    if (result.replacementWord) {
      dispatch({ type: TypingStateActionType.ADD_REPLACEMENT_WORD, payload: result.replacementWord })
    }

    if (result.shouldSkip) {
      dispatch({ type: TypingStateActionType.SKIP_WORD })
    }
  }, [state.wordListData.words, state.wordListData.index, dictID, learningService, dispatch, getNextNewWord, createWordRecord])

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
              {dueCount > 0 && (
                <span className="rounded bg-orange-500/30 px-2 py-0.5 text-orange-200">待复习 {dueCount}</span>
              )}
              {newCount > 0 && learningType === 'new' && (
                <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">新词 {newCount}</span>
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
              {learningType === 'complete' ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="text-6xl">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">✓ 学习完成</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    今日学习 <span className="font-bold text-indigo-600 dark:text-indigo-400">{todayLearned + todayReviewed}</span> 个单词
                    （新词 <span className="font-bold">{todayLearned}</span> 个，复习 <span className="font-bold">{todayReviewed}</span> 个）
                  </p>
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
    </>
  )
}

const NormalTypingPage: React.FC = () => {
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
      <NormalTypingAppInner currentWordBank={currentWordBank} />
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

export default NormalTypingPage

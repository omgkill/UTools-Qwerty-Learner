import Layout from '../../components/Layout'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingPageShellEffects } from './hooks/useTypingPageShellEffects'
import { TypingPageProvider, TypingStateActionType, useTypingContext } from './store'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import { useRepeatTypingSession } from '@/features/typing/presentation/hooks/useRepeatTypingSession'
import type { SyncQueuedTypingSessionPayload } from '@/features/typing/presentation/hooks/useQueuedTypingSession'
import type { WordBank } from '@/typings'
import type React from 'react'
import { useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

interface RepeatTypingAppInnerProps {
  currentWordBank: WordBank
}

export const RepeatTypingAppInner: React.FC<RepeatTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()
  const navigate = useNavigate()
  const stateIndex = state.wordListData.index
  const syncSession = useCallback(
    (payload: SyncQueuedTypingSessionPayload) => {
      dispatch({
        type: TypingStateActionType.SYNC_SESSION,
        payload,
      })
    },
    [dispatch],
  )
  const setRepeatLearning = useCallback(
    (isRepeatLearning: boolean) => {
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: isRepeatLearning })
    },
    [dispatch],
  )

  const { words: repeatWords, currentIndex, isLoading, hasWords, advanceCurrentWord, clearSession } = useRepeatTypingSession({
    stateIndex,
    currentWordBank,
    syncSession,
    setRepeatLearning,
  })

  const handleWordFinished = useCallback(() => {
    advanceCurrentWord()
  }, [advanceCurrentWord])

  useTypingPageShellEffects({
    state,
    dispatch,
    confettiEnabled: false,
  })

  const handleExitRepeatLearning = useCallback(() => {
    setRepeatLearning(false)
    void clearSession()
    navigate('/')
  }, [clearSession, navigate, setRepeatLearning])

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
          <p className="text-gray-600 dark:text-gray-400">请先进行正常学习，积累一定数量的单词后再来重复学习</p>
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
              <WordPanel
                onWordFinished={handleWordFinished}
                words={state.wordListData.words}
                currentIndex={state.wordListData.index}
                wordInfoMap={state.wordInfoMap}
                isTyping={state.uiState.isTyping}
                isTransVisible={state.isTransVisible}
                isImmersiveMode={state.isImmersiveMode}
                isRepeatLearning={state.uiState.isRepeatLearning}
                timerTime={state.statsData.timerData.time}
                dispatch={dispatch}
              />
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
    <TypingPageProvider>
      <RepeatTypingAppInner currentWordBank={currentWordBank} />
    </TypingPageProvider>
  )
}

export default RepeatTypingPage

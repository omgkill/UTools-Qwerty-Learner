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
import type { LearningType } from '@/features/typing/domain'
import { useNormalTypingSession } from '@/features/typing/presentation/hooks/useNormalTypingSession'
import type { WordBank } from '@/typings'
import type React from 'react'
import { useCallback, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const LEARNING_TYPE_LABELS: Record<LearningType, { icon: string; label: string }> = {
  review: { icon: '🔄', label: '复习' },
  new: { icon: '📚', label: '新词' },
  complete: { icon: '✅', label: '完成' },
}

interface NormalTypingAppInnerProps {
  currentWordBank: WordBank
}

export const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const { state, dispatch } = useTypingContext()

  const {
    session,
    learningType,
    dueCount,
    newCount,
    todayLearned,
    todayReviewed,
    todayMastered,
    completeSessionWord,
    markSessionWordMastered,
    isLoading,
  } = useNormalTypingSession()

  const sessionWords = session?.queueWords.map((entry) => entry.word) ?? []
  const sessionIndex = session?.currentIndex ?? 0

  useTypingPageShellEffects({
    state,
    dispatch,
    confettiEnabled: Boolean(session?.isFinished) && !state.isImmersiveMode,
  })

  useEffect(() => {
    if (!session) return

    dispatch({
      type: TypingStateActionType.SYNC_SESSION_STATUS,
      payload: {
        isFinished: session.isFinished,
        autoStart: !session.isFinished,
      },
    })
  }, [session, dispatch])

  const handleMastered = useCallback(async () => {
    await markSessionWordMastered()
  }, [markSessionWordMastered])

  const handleWordFinished = useCallback(
    async (params: { isCorrect: boolean; wrongCount: number }) => {
      await completeSessionWord(params)
    },
    [completeSessionWord],
  )

  const typeInfo = LEARNING_TYPE_LABELS[learningType]

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
              <span className="rounded bg-white/20 px-2 py-0.5">
                {typeInfo.icon} {typeInfo.label}
              </span>
              {(todayLearned > 0 || todayReviewed > 0) && (
                <span className="rounded bg-white/20 px-2 py-0.5">今日 {todayLearned + todayReviewed} 词</span>
              )}
              {todayMastered > 0 && <span className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-200">✓ 已掌握 {todayMastered}</span>}
              {dueCount > 0 && <span className="rounded bg-orange-500/30 px-2 py-0.5 text-orange-200">待复习 {dueCount}</span>}
              {newCount > 0 && learningType === 'new' && (
                <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">新词 {newCount}</span>
              )}
            </div>
            <PronunciationSwitcher />
            <Switcher />
            <StartButton isLoading={isLoading} />
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
                    （新词 <span className="font-bold">{todayLearned}</span> 个，复习 <span className="font-bold">{todayReviewed}</span>{' '}
                    个）
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">明天继续加油！</p>
                </div>
              ) : (
                <WordPanel
                  onMastered={handleMastered}
                  onWordFinished={handleWordFinished}
                  words={sessionWords}
                  currentIndex={sessionIndex}
                  wordInfoMap={state.wordInfoMap}
                  isTyping={state.uiState.isTyping}
                  isTransVisible={state.isTransVisible}
                  isImmersiveMode={state.isImmersiveMode}
                  isRepeatLearning={state.uiState.isRepeatLearning}
                  timerTime={state.statsData.timerData.time}
                  dispatch={dispatch}
                  disableWordJump
                />
              )}
            </div>
            {!state.isImmersiveMode && <Speed />}
          </div>
        </div>
      </Layout>

      {!state.isImmersiveMode && <WordList words={sessionWords} currentIndex={sessionIndex} />}
    </>
  )
}

const NormalTypingPage: React.FC = () => {
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
      <NormalTypingAppInner currentWordBank={currentWordBank} />
    </TypingPageProvider>
  )
}

export default NormalTypingPage

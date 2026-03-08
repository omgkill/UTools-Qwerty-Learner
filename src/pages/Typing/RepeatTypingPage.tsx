import WordPanel from './components/WordPanel'
import { LearningPageLayout } from './components/LearningPageLayout'
import { TypingPageEmptyState, TypingPageLoading } from './components/TypingPageStates'
import { useKeyboardStartListener } from './hooks/useKeyboardStartListener'
import { useLearningRecordSaver } from './hooks/useLearningRecordSaver'
import { useLearningSession } from './hooks/useLearningSession'
import { useTypingHotkeys } from './hooks/useTypingHotkeys'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingTimer } from './hooks/useTypingTimer'
import { useUtoolsMode } from './hooks/useUtoolsMode'
import { useWindowBlur } from './hooks/useWindowBlur'
import { isImmersiveModeAtom, isTypingAtom } from './store'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import type { WordBank } from '@/types'

interface RepeatTypingAppInnerProps {
  currentWordBank: WordBank
}

const RepeatTypingAppInner: React.FC<RepeatTypingAppInnerProps> = ({ currentWordBank }) => {
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const isTyping = useAtomValue(isTypingAtom)
  const navigate = useNavigate()

  const { words, isLoading, hasWords, displayIndex, handleExit } = useLearningSession({
    mode: 'repeat',
    currentWordBank,
  })

  useUtoolsMode()
  useWindowBlur()
  useTypingHotkeys(isImmersiveMode)
  useLearningRecordSaver({ uiState: { isTyping } } as Parameters<typeof useLearningRecordSaver>[0])
  useTypingTimer(isTyping)
  useKeyboardStartListener(isTyping, false)

  if (isLoading) {
    return <TypingPageLoading />
  }

  if (!hasWords) {
    return (
      <TypingPageEmptyState
        icon="📚"
        title="暂无可重复学习的单词"
        description="请先进行正常学习，积累一定数量的单词后再来重复学习"
        buttonText="返回正常学习"
        onButtonClick={() => navigate('/')}
      />
    )
  }

  const headerExtra = (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-indigo-200">🔄 重复学习</span>
      <span className="rounded bg-white/20 px-2 py-0.5">
        {displayIndex + 1} / {words.length}
      </span>
    </div>
  )

  const handleExitAndNavigate = () => {
    handleExit()
    navigate('/')
  }

  return (
    <LearningPageLayout
      wordBankName={currentWordBank.name}
      isImmersiveMode={isImmersiveMode}
      headerExtra={headerExtra}
      showExitButton
      exitButtonText="退出重复学习"
      onExit={handleExitAndNavigate}
    >
      <WordPanel />
    </LearningPageLayout>
  )
}

const RepeatTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <RepeatTypingAppInner currentWordBank={currentWordBank} />
}

export default RepeatTypingPage

import WordPanel from './components/WordPanel'
import { LearningPageLayout } from './components/LearningPageLayout'
import { TypingPageEmptyState, TypingPageLoading } from './components/TypingPageStates'
import { useConfetti } from './hooks/useConfetti'
import { useLearningRecordSaver } from './hooks/useLearningRecordSaver'
import { useLearningSession } from './hooks/useLearningSession'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import { useTypingPageBase } from './hooks/useTypingPageBase'
import type React from 'react'
import { useCallback } from 'react'
import type { WordBank } from '@/types'

const LEARNING_TYPE_LABELS = {
  review: { icon: '🔄', label: '复习' },
  new: { icon: '📚', label: '新词' },
  complete: { icon: '✅', label: '完成' },
} as const

interface NormalTypingAppInnerProps {
  currentWordBank: WordBank
}

const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const { isTyping, isImmersiveMode } = useTypingPageBase()

  const { isLoading, hasWords, isFinished, learningType, stats, handleMastered } = useLearningSession({
    mode: 'normal',
    currentWordBank,
  })

  // 仅 normal 模式需要的 hook
  useLearningRecordSaver({ uiState: { isTyping } } as Parameters<typeof useLearningRecordSaver>[0])
  useConfetti(isFinished && !isImmersiveMode)

  const handleCompleteClick = useCallback(() => {
    // 完成状态无需操作
  }, [])

  if (isLoading) {
    return <TypingPageLoading />
  }

  if (!hasWords || learningType === 'complete') {
    return (
      <TypingPageEmptyState
        icon="🎉"
        title="✓ 学习完成"
        description={`今日学习 ${stats.todayLearned + stats.todayReviewed} 个单词（新词 ${stats.todayLearned} 个，复习 ${stats.todayReviewed} 个）`}
        buttonText="明天继续加油！"
        onButtonClick={handleCompleteClick}
      />
    )
  }

  const typeInfo = LEARNING_TYPE_LABELS[learningType]

  const headerExtra = (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-white/20 px-2 py-0.5">
        {typeInfo.icon} {typeInfo.label}
      </span>
      {(stats.todayLearned > 0 || stats.todayReviewed > 0) && (
        <span className="rounded bg-white/20 px-2 py-0.5">今日 {stats.todayLearned + stats.todayReviewed} 词</span>
      )}
      {stats.todayMastered > 0 && (
        <span className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-200">✓ 已掌握 {stats.todayMastered}</span>
      )}
      {stats.dueCount > 0 && (
        <span className="rounded bg-orange-500/30 px-2 py-0.5 text-orange-200">待复习 {stats.dueCount}</span>
      )}
      {stats.newCount > 0 && learningType === 'new' && (
        <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">新词 {stats.newCount}</span>
      )}
    </div>
  )

  return (
    <LearningPageLayout
      wordBankName={currentWordBank.name}
      isImmersiveMode={isImmersiveMode}
      headerExtra={headerExtra}
    >
      <WordPanel onMastered={handleMastered} />
    </LearningPageLayout>
  )
}

const NormalTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <NormalTypingAppInner currentWordBank={currentWordBank} />
}

export default NormalTypingPage
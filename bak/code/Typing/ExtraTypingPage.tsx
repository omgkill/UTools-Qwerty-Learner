import WordPanel from './components/WordPanel'
import { LearningPageLayout } from './components/LearningPageLayout'
import { TypingPageEmptyState, TypingPageLoading } from './components/TypingPageStates'
import { useLearningSession } from './hooks/useLearningSession'
import { useTypingPageBase } from './hooks/useTypingPageBase'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import type { WordBank } from '@/types'

/** 页面配置 */
interface ExtraTypingPageConfig {
  mode: 'repeat' | 'consolidate'
  labels: {
    typeIcon: string
    typeLabel: string
    emptyIcon: string
    emptyTitle: string
    emptyDescription: string
    exitButtonText: string
  }
}

const PAGE_CONFIGS: Record<'repeat' | 'consolidate', ExtraTypingPageConfig> = {
  repeat: {
    mode: 'repeat',
    labels: {
      typeIcon: '🔄',
      typeLabel: '重复学习',
      emptyIcon: '📚',
      emptyTitle: '暂无可重复学习的单词',
      emptyDescription: '请先进行正常学习，积累一定数量的单词后再来重复学习',
      exitButtonText: '退出重复学习',
    },
  },
  consolidate: {
    mode: 'consolidate',
    labels: {
      typeIcon: '🔁',
      typeLabel: '巩固学习',
      emptyIcon: '📚',
      emptyTitle: '暂无可巩固的单词',
      emptyDescription: '请先进行正常学习，积累一定数量的单词后再来巩固学习',
      exitButtonText: '退出巩固学习',
    },
  },
}

interface ExtraTypingAppInnerProps {
  currentWordBank: WordBank
  config: ExtraTypingPageConfig
}

const ExtraTypingAppInner: React.FC<ExtraTypingAppInnerProps> = ({ currentWordBank, config }) => {
  const navigate = useNavigate()
  const { isImmersiveMode } = useTypingPageBase()

  const { words, isLoading, hasWords, displayIndex, handleExit } = useLearningSession({
    mode: config.mode,
    currentWordBank,
  })

  if (isLoading) {
    return <TypingPageLoading />
  }

  if (!hasWords) {
    return (
      <TypingPageEmptyState
        icon={config.labels.emptyIcon}
        title={config.labels.emptyTitle}
        description={config.labels.emptyDescription}
        buttonText="返回正常学习"
        onButtonClick={() => navigate('/')}
      />
    )
  }

  const headerExtra = (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-indigo-200">
        {config.labels.typeIcon} {config.labels.typeLabel}
      </span>
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
      exitButtonText={config.labels.exitButtonText}
      onExit={handleExitAndNavigate}
    >
      <WordPanel />
    </LearningPageLayout>
  )
}

// 导出两个工厂组件
export function RepeatTypingApp({ currentWordBank }: { currentWordBank: WordBank }) {
  return <ExtraTypingAppInner currentWordBank={currentWordBank} config={PAGE_CONFIGS.repeat} />
}

export function ConsolidateTypingApp({ currentWordBank }: { currentWordBank: WordBank }) {
  return <ExtraTypingAppInner currentWordBank={currentWordBank} config={PAGE_CONFIGS.consolidate} />
}
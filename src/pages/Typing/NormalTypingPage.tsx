import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TypingPageLayout, TypingPageLoading, TypingPageComplete } from './components/TypingPageLayout'
import { WordDisplay } from './components/WordDisplay'
import { LearningService } from '@/services/LearningService'
import { LocalStorageProgressRepository } from '@/repositories/implementations/LocalStorageProgressRepository'
import { LocalStorageDailyRecordRepository } from '@/repositories/implementations/LocalStorageDailyRecordRepository'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type { TodayWordsResult, LearningStats } from '@/types/learning'

const DAILY_LIMIT = 20

// 创建服务实例
const progressRepo = new LocalStorageProgressRepository()
const dailyRecordRepo = new LocalStorageDailyRecordRepository()
const learningService = new LearningService(progressRepo, dailyRecordRepo)

export default function NormalTypingPage() {
  const navigate = useNavigate()
  const { isInitialized, currentWordBank, wordList, hasWordBanks } = useTypingInitializer()

  const [isLoading, setIsLoading] = useState(true)
  const [words, setWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // 初始化完成后，如果没有词库，跳转到 Gallery
  useEffect(() => {
    if (isInitialized && !hasWordBanks) {
      navigate('/gallery')
    }
  }, [isInitialized, hasWordBanks, navigate])

  // 当词库加载完成后，加载今日单词
  useEffect(() => {
    if (!isInitialized || !currentWordBank || wordList.length === 0) {
      return
    }

    const wordNames = wordList.map((w) => w.name)
    const result: TodayWordsResult = learningService.getTodayWords(
      currentWordBank.id,
      wordNames,
      DAILY_LIMIT
    )

    if (result.learningType === 'complete' || result.words.length === 0) {
      setIsComplete(true)
      setStats(result.stats)
    } else {
      setWords(result.words)
      setStats(result.stats)
    }

    setIsLoading(false)
  }, [isInitialized, currentWordBank, wordList])

  // 处理单词完成
  const handleWordComplete = useCallback(() => {
    if (!currentWordBank) return

    const currentWord = words[currentIndex]

    // 更新进度
    const result = learningService.completeWord(
      currentWordBank.id,
      currentWord,
      words,
      DAILY_LIMIT,
      wordList.map((w) => w.name)
    )

    // 更新统计
    setStats(learningService.getStats(currentWordBank.id, wordList.map((w) => w.name)))

    // 检查是否完成
    if (result.sessionComplete) {
      setIsComplete(true)
    } else if (result.nextWord && !words.includes(result.nextWord)) {
      // 添加新词到列表
      setWords((prev) => [...prev, result.nextWord!])
      setCurrentIndex((prev) => prev + 1)
    } else {
      // 列表中还有下一个词
      if (currentIndex < words.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setIsComplete(true)
      }
    }
  }, [words, currentIndex, currentWordBank, wordList])

  // 初始化加载中
  if (!isInitialized) {
    return <TypingPageLoading />
  }

  // 没有词库，正在跳转
  if (!hasWordBanks) {
    return <TypingPageLoading />
  }

  // 词库加载中
  if (isLoading) {
    return <TypingPageLoading />
  }

  // 显示完成状态
  if (isComplete && stats) {
    return (
      <TypingPageComplete
        learnedCount={stats.todayLearned}
        reviewedCount={stats.todayReviewed}
      />
    )
  }

  // 显示学习界面
  const currentWord = words[currentIndex]
  const headerExtra = stats ? (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-white/20 px-2 py-0.5">
        进度 {currentIndex + 1}/{words.length}
      </span>
      {stats.dueCount > 0 && (
        <span className="rounded bg-orange-500/30 px-2 py-0.5 text-orange-200">
          待复习 {stats.dueCount}
        </span>
      )}
      {stats.newCount > 0 && (
        <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">
          新词 {stats.newCount}
        </span>
      )}
    </div>
  ) : null

  return (
    <TypingPageLayout
      wordBankName={currentWordBank?.name || '未知词库'}
      headerExtra={headerExtra}
      onSwitchBank={() => navigate('/gallery')}
    >
      <div className="flex flex-col items-center justify-center">
        {/* 开始提示 */}
        <div className="mb-4 text-gray-400">按任意键开始输入</div>

        {/* 单词显示 */}
        <WordDisplay word={currentWord} onComplete={handleWordComplete} />

        {/* 单词序号 */}
        <div className="mt-4 text-gray-500">第 {currentIndex + 1} 个单词</div>
      </div>
    </TypingPageLayout>
  )
}
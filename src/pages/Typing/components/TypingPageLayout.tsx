import type { ReactNode } from 'react'
import Layout from '@/components/Layout'

export type TypingPageLayoutProps = {
  wordBankName: string
  children: ReactNode
  headerExtra?: ReactNode
  onSwitchBank?: () => void
}

export function TypingPageLayout({ wordBankName, children, headerExtra, onSwitchBank }: TypingPageLayoutProps) {
  return (
    <Layout>
      <div className="flex h-12 w-full items-center justify-between px-4 bg-gray-800">
        <button
          onClick={onSwitchBank}
          className="text-white text-lg hover:text-indigo-400 transition-colors"
          title="切换词库"
        >
          {wordBankName}
        </button>
        {headerExtra}
      </div>
      <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center">
        {children}
      </div>
    </Layout>
  )
}

export const TypingPageLoading = () => (
  <Layout>
    <div className="flex min-h-screen items-center justify-center bg-gray-900" data-testid="loading-state">
      <div className="text-xl text-white">加载中...</div>
    </div>
  </Layout>
)

export const TypingPageComplete = ({ learnedCount, reviewedCount }: { learnedCount: number; reviewedCount: number }) => (
  <Layout>
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-gray-900" data-testid="complete-state">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-white">今日学习完成</h2>
      <p className="text-gray-400">
        学习了 {learnedCount + reviewedCount} 个单词
        （新词 {learnedCount} 个，复习 {reviewedCount} 个）
      </p>
    </div>
  </Layout>
)
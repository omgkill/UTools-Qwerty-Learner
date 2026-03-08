import type { ReactNode } from 'react'
import Layout from '@/components/Layout'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import PronunciationSwitcher from './PronunciationSwitcher'
import Switcher from './Switcher'
import StartButton from './StartButton'
import Speed from './Speed'
import WordList from './WordList'
import { NavLink } from 'react-router-dom'

export type LearningPageLayoutProps = {
  wordBankName: string
  isImmersiveMode: boolean
  headerExtra?: ReactNode
  showExitButton?: boolean
  exitButtonText?: string
  onExit?: () => void
  children: ReactNode
}

export function LearningPageLayout({
  wordBankName,
  isImmersiveMode,
  headerExtra,
  showExitButton,
  exitButtonText,
  onExit,
  children,
}: LearningPageLayoutProps) {
  return (
    <>
      <Layout>
        {!isImmersiveMode && (
          <Header>
            <Tooltip content="切换词库">
              <NavLink
                className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none text-white text-opacity-60 hover:text-opacity-100"
                to="/gallery"
              >
                {wordBankName}
              </NavLink>
            </Tooltip>
            {headerExtra}
            <PronunciationSwitcher />
            <Switcher />
            <StartButton isLoading={false} />
            {showExitButton && onExit && (
              <button
                onClick={onExit}
                className="rounded-lg bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600"
              >
                {exitButtonText || '退出'}
              </button>
            )}
          </Header>
        )}
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-4">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              {children}
            </div>
            {!isImmersiveMode && <Speed />}
          </div>
        </div>
      </Layout>

      {!isImmersiveMode && <WordList />}
    </>
  )
}

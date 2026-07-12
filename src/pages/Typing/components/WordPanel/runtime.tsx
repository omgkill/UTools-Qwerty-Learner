import type { WordInfo, WordInfoMap } from '../../store'
import type { WordWithIndex } from '@/typings'
import { createContext, useContext } from 'react'

export type WordPanelRuntimeValue = {
  words: WordWithIndex[]
  currentIndex: number
  isTyping: boolean
  isImmersiveMode: boolean
  isTransVisible: boolean
  isRepeatLearning: boolean
  timerTime: number
  wordInfoMap: WordInfoMap
  actions: {
    updateWordInfo: (wordName: string, data: WordInfo) => void
    skipToIndex: (index: number) => void
    reportWrongWord: (index: number) => void
    reportCorrectWord: (index: number) => void
    increaseCorrectCount: () => void
    increaseWrongCount: () => void
  }
}

const WordPanelRuntimeContext = createContext<WordPanelRuntimeValue | null>(null)

export function WordPanelRuntimeProvider({
  value,
  children,
}: {
  value: WordPanelRuntimeValue
  children: React.ReactNode
}) {
  return <WordPanelRuntimeContext.Provider value={value}>{children}</WordPanelRuntimeContext.Provider>
}

export function useWordPanelRuntime() {
  const context = useContext(WordPanelRuntimeContext)
  if (!context) {
    throw new Error('WordPanelRuntimeContext is not available')
  }
  return context
}

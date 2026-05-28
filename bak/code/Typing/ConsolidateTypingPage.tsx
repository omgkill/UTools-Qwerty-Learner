import { ConsolidateTypingApp } from './ExtraTypingPage'
import { TypingPageLoading } from './components/TypingPageStates'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type React from 'react'

const ConsolidateTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <ConsolidateTypingApp currentWordBank={currentWordBank} />
}

export default ConsolidateTypingPage
import { RepeatTypingApp } from './ExtraTypingPage'
import { TypingPageLoading } from './components/TypingPageStates'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type React from 'react'

const RepeatTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <RepeatTypingApp currentWordBank={currentWordBank} />
}

export default RepeatTypingPage
import { useContext } from 'react'
import type { PropsWithChildren } from 'react'
import { useImmerReducer } from 'use-immer'
import { TypingContext } from './context'
import { initialState } from './initialState'
import { typingReducer } from './reducer'

export function TypingPageProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))

  return <TypingContext.Provider value={{ state, dispatch }}>{children}</TypingContext.Provider>
}

export function useTypingContext() {
  const context = useContext(TypingContext)
  if (!context) {
    throw new Error('TypingContext is not available')
  }
  return context
}

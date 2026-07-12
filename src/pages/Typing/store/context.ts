import { createContext } from 'react'
import type { TypingState } from './types'
import type { TypingStateAction } from './actions'

type Dispatch = (action: TypingStateAction) => void

export const TypingContext = createContext<{ state: TypingState; dispatch: Dispatch } | null>(null)

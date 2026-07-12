import { TypingStateActionType } from '../store'
import type { TypingState, TypingStateAction } from '../store'
import { useConfetti } from './useConfetti'
import { useKeyboardStartListener } from './useKeyboardStartListener'
import { useLearningRecordSaver } from './useLearningRecordSaver'
import { useTypingHotkeys } from './useTypingHotkeys'
import { useTypingTimer } from './useTypingTimer'
import { getMode, onModeChange } from '@/platform/utools'
import type { Dispatch } from 'react'
import { useEffect } from 'react'

type UseTypingPageShellEffectsParams = {
  state: TypingState
  dispatch: Dispatch<TypingStateAction>
  confettiEnabled: boolean
}

export function useTypingPageShellEffects(params: UseTypingPageShellEffectsParams) {
  const { state, dispatch, confettiEnabled } = params

  useLearningRecordSaver(state)
  useTypingTimer(state.uiState.isTyping)
  useKeyboardStartListener(state.uiState.isTyping, false)
  useTypingHotkeys(state.isImmersiveMode)
  useConfetti(confettiEnabled)

  useEffect(() => {
    const handleModeChange = (mode: string) => {
      dispatch({
        type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE,
        payload: mode === 'conceal' || mode === 'moyu',
      })
    }

    handleModeChange(getMode())
    return onModeChange(handleModeChange)
  }, [dispatch])

  useEffect(() => {
    const handleBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }

    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('blur', handleBlur)
    }
  }, [dispatch])
}

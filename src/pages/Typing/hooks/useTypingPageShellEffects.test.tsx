// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TypingStateActionType, initialState } from '../store'
import { useTypingPageShellEffects } from './useTypingPageShellEffects'
import { getMode, onModeChange } from '@/platform/utools'

const useConfettiMock = vi.fn()
const useKeyboardStartListenerMock = vi.fn()
const useLearningRecordSaverMock = vi.fn()
const useTypingHotkeysMock = vi.fn()
const useTypingTimerMock = vi.fn()

vi.mock('./useConfetti', () => ({
  useConfetti: (...args: unknown[]) => useConfettiMock(...args),
}))

vi.mock('./useKeyboardStartListener', () => ({
  useKeyboardStartListener: (...args: unknown[]) => useKeyboardStartListenerMock(...args),
}))

vi.mock('./useLearningRecordSaver', () => ({
  useLearningRecordSaver: (...args: unknown[]) => useLearningRecordSaverMock(...args),
}))

vi.mock('./useTypingHotkeys', () => ({
  useTypingHotkeys: (...args: unknown[]) => useTypingHotkeysMock(...args),
}))

vi.mock('./useTypingTimer', () => ({
  useTypingTimer: (...args: unknown[]) => useTypingTimerMock(...args),
}))

vi.mock('@/platform/utools', () => ({
  getMode: vi.fn(),
  onModeChange: vi.fn(),
}))

describe('useTypingPageShellEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getMode).mockReturnValue('conceal')
    vi.mocked(onModeChange).mockReturnValue(() => undefined)
  })

  it('wires shared typing page hooks and syncs immersive mode from window mode', () => {
    const dispatch = vi.fn()
    const state = {
      ...initialState,
      uiState: { ...initialState.uiState, isTyping: true },
    }

    renderHook(() =>
      useTypingPageShellEffects({
        state,
        dispatch,
        confettiEnabled: true,
      }),
    )

    expect(useLearningRecordSaverMock).toHaveBeenCalledWith(state)
    expect(useTypingTimerMock).toHaveBeenCalledWith(true)
    expect(useKeyboardStartListenerMock).toHaveBeenCalledWith(true, false)
    expect(useTypingHotkeysMock).toHaveBeenCalledWith(false)
    expect(useConfettiMock).toHaveBeenCalledWith(true)
    expect(dispatch).toHaveBeenCalledWith({
      type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE,
      payload: true,
    })
  })

  it('pauses typing on blur and reacts to later mode changes', () => {
    const dispatch = vi.fn()
    let modeChangeHandler: ((mode: string) => void) | undefined
    vi.mocked(getMode).mockReturnValue('normal')
    vi.mocked(onModeChange).mockImplementation((handler) => {
      modeChangeHandler = handler
      return () => undefined
    })

    renderHook(() =>
      useTypingPageShellEffects({
        state: initialState,
        dispatch,
        confettiEnabled: false,
      }),
    )

    window.dispatchEvent(new Event('blur'))
    modeChangeHandler?.('moyu')

    expect(dispatch).toHaveBeenCalledWith({
      type: TypingStateActionType.SET_IS_TYPING,
      payload: false,
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE,
      payload: true,
    })
  })
})

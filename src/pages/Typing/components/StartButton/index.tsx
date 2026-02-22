import { TypingContext, TypingStateActionType } from '../../store'
import Tooltip from '@/components/Tooltip'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

export default function StartButton({ isLoading }: { isLoading: boolean }) {
  const { state, dispatch } = useContext(TypingContext)!

  const onToggleIsTyping = useCallback(() => {
    !isLoading && dispatch({ type: TypingStateActionType.TOGGLE_IS_TYPING })
  }, [isLoading, dispatch])

  useHotkeys('enter', onToggleIsTyping, { enableOnFormTags: true, preventDefault: true }, [onToggleIsTyping])

  return (
    <Tooltip content="快捷键 Enter" className="box-content h-7 w-8 px-6 py-1">
      <button
        className={`${state.uiState.isTyping ? 'bg-gray-400 shadow-gray-200 dark:bg-gray-700' : 'bg-indigo-600 shadow-indigo-200'} btn-primary w-20`}
        type="button"
        onClick={onToggleIsTyping}
        aria-label={state.uiState.isTyping ? '暂停' : '开始'}
      >
        <span className="font-medium">{state.uiState.isTyping ? 'Pause' : 'Start'}</span>
      </button>
    </Tooltip>
  )
}

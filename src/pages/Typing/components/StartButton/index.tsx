import Tooltip from '@/components/Tooltip'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { isTypingAtom, toggleIsTypingAtom } from '../../store'

export default function StartButton({ isLoading }: { isLoading: boolean }) {
  const isTyping = useAtomValue(isTypingAtom)
  const toggleIsTyping = useSetAtom(toggleIsTypingAtom)

  const onToggleIsTyping = useCallback(() => {
    if (isLoading) return
    toggleIsTyping()
  }, [isLoading, toggleIsTyping])

  useHotkeys('enter', onToggleIsTyping, { enableOnFormTags: true, preventDefault: true }, [onToggleIsTyping])

  return (
    <Tooltip content="快捷键 Enter">
      <button
        className={`${isTyping ? 'bg-gray-400 shadow-gray-200 dark:bg-gray-700' : 'bg-indigo-600 shadow-indigo-200'} btn-primary`}
        type="button"
        onClick={onToggleIsTyping}
        aria-label={isTyping ? '暂停' : '开始'}
      >
        <span className="font-medium">{isTyping ? 'Pause' : 'Start'}</span>
      </button>
    </Tooltip>
  )
}

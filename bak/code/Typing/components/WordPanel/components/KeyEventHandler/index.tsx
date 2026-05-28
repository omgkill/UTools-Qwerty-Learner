import type { WordUpdateAction } from '../InputHandler'
import { isChineseSymbol, isLegal } from '@/utils'
import { useCallback, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { isTypingAtom } from '../../../../store'

export default function KeyEventHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const isTyping = useAtomValue(isTypingAtom)

  const onKeydown = useCallback(
    (e: KeyboardEvent) => {
      const char = e.key

      if (isChineseSymbol(char)) {
        alert('您正在使用输入法，请关闭输入法。')
        return
      }

      if (isLegal(char) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        updateInput({ type: 'add', value: char, event: e })
      }
    },
    [updateInput],
  )

  useEffect(() => {
    if (!isTyping) return

    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
    }
  }, [onKeydown, isTyping])

  return <></>
}

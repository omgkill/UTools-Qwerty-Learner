import type { WordUpdateAction } from '../InputHandler'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { isTypingAtom } from '../../../../store'

export default function TextAreaHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTyping = useAtomValue(isTypingAtom)

  useEffect(() => {
    if (!textareaRef.current) return

    if (isTyping) {
      textareaRef.current.focus()
    } else {
      textareaRef.current.blur()
    }
  }, [isTyping])

  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent
    if (!nativeEvent.isComposing && nativeEvent.data !== null) {
      updateInput({ type: 'add', value: nativeEvent.data, event: e })

      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    }
  }

  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (isTyping) {
      textareaRef.current.focus()
    }
  }, [isTyping])

  return (
    <textarea
      className="absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none"
      ref={textareaRef}
      autoFocus
      spellCheck="false"
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => {
        alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>
  )
}

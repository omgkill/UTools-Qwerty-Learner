import usePronunciationSound from '@/hooks/usePronunciation'
import { TypingContext, initialState } from '@/pages/Typing/store'
import type { WordWithIndex } from '@/typings'
import { flip, offset, shift, useFloating, useHover, useInteractions, useRole } from '@floating-ui/react'
import { useCallback, useContext, useMemo, useState } from 'react'

export default function MiniWordChip({ word }: { word: WordWithIndex }) {
  const typingContext = useContext(TypingContext)
  const state = typingContext?.state ?? initialState
  const [showTranslation, setShowTranslation] = useState(false)
  
  const wordInfo = state.wordInfoMap[word.name]
  const displayTrans = useMemo(() => {
    const trans = wordInfo?.trans ?? word.trans ?? []
    return trans.filter((item) => item && item.trim().length > 0).slice(0, 4)
  }, [wordInfo?.trans, word.trans])
  const displayText = useMemo(() => displayTrans.join('；'), [displayTrans])
  
  const { x, y, strategy, refs, context } = useFloating({
    open: showTranslation,
    onOpenChange: setShowTranslation,
    middleware: [offset(4), shift(), flip()],
  })
  const hover = useHover(context)
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, role])
  const { play, stop } = usePronunciationSound(word.name)

  const onClickWord = useCallback(() => {
    stop()
    play()
  }, [play, stop])

  return (
    <>
      <button
        ref={refs.setReference}
        className="mini-word-chip select-all"
        {...getReferenceProps()}
        type="button"
        onClick={onClickWord}
        title={`朗读 ${word.name}`}
      >
        <span>{word.name}</span>
      </button>
      {showTranslation && (
        <div
          ref={refs.setFloating}
          className="mini-word-chip-tooltip"
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            width: 'max-content',
          }}
          {...getFloatingProps()}
        >
          {displayText}
        </div>
      )}
    </>
  )
}

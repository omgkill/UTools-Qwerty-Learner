import type { SoundIconProps } from '../SoundIcon'
import { SoundIcon } from '../SoundIcon'
import styles from './index.module.css'
import Tooltip from '@/components/Tooltip'
import usePronunciationSound from '@/hooks/usePronunciation'
import { TypingContext } from '@/pages/Typing/store'
import { pronunciationIsOpenAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

const WordSound = ({ word, inputWord, ...rest }: WordSoundProps) => {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state } = useContext(TypingContext)!

  const { play, stop, isPlaying } = usePronunciationSound(word)
  const pronunciationIsOpen = useAtomValue(pronunciationIsOpenAtom)

  const playRef = useRef(play)
  const stopRef = useRef(stop)
  useEffect(() => {
    playRef.current = play
    stopRef.current = stop
  }, [play, stop])

  useHotkeys(
    'ctrl+j',
    () => {
      if (state.isTyping) {
        stopRef.current()
        playRef.current()
      }
    },
    [state.isTyping],
    { enableOnFormTags: true, preventDefault: true },
  )

  const hasPlayedRef = useRef(false)
  const lastWordRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastWordRef.current !== word) {
      lastWordRef.current = word
      hasPlayedRef.current = false
    }
    return () => stopRef.current()
  }, [word])

  useEffect(() => {
    if (inputWord.length === 0 && state.isTyping) {
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true
        stopRef.current()
        playRef.current()
      }
    } else {
      hasPlayedRef.current = false
    }
  }, [inputWord, state.isTyping, word])

  const handleClickSoundIcon = useCallback(() => {
    stop()
    play()
  }, [play, stop])

  return (
    <>
      {pronunciationIsOpen && (
        <Tooltip content="朗读发音（Ctrl + J）" className={`${styles.wordSound}`}>
          <SoundIcon animated={isPlaying} {...rest} onClick={handleClickSoundIcon} />
        </Tooltip>
      )}
    </>
  )
}

export type WordSoundProps = {
  word: string
  inputWord: string
} & SoundIconProps

export default WordSound

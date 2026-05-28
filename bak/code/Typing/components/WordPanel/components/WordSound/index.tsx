import type { SoundIconProps } from '../SoundIcon'
import { SoundIcon } from '../SoundIcon'
import styles from './index.module.css'
import Tooltip from '@/components/Tooltip'
import usePronunciationSound from '@/hooks/usePronunciation'
import { pronunciationIsOpenAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { isTypingAtom } from '../../../../store'

const WordSound = ({ word, inputWord, ...rest }: WordSoundProps) => {
  const isTyping = useAtomValue(isTypingAtom)

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
      if (isTyping) {
        stopRef.current()
        playRef.current()
      }
    },
    [isTyping],
    { enableOnFormTags: true, preventDefault: true },
  )

  const hasPlayedRef = useRef(false)
  const lastWordRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastWordRef.current !== word) {
      lastWordRef.current = word
      hasPlayedRef.current = false
      stopRef.current()
    }
  }, [word])

  useEffect(() => {
    if (!isTyping) {
      hasPlayedRef.current = false
      return
    }
    
    if (inputWord.length === 0 && !hasPlayedRef.current) {
      hasPlayedRef.current = true
      stopRef.current()
      playRef.current()
    }
  }, [inputWord, isTyping, word])

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

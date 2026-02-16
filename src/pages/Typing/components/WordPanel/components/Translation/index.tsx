import { SoundIcon } from '../SoundIcon'
import Tooltip from '@/components/Tooltip'
import useSpeech from '@/hooks/useSpeech'
import { isTextSelectableAtom, pronunciationConfigAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useMemo } from 'react'

export type TranslationProps = {
  trans: string[]
  tense?: string
}
export default function Translation({ trans, tense }: TranslationProps) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const isShowTransRead = window.speechSynthesis && pronunciationConfig.isTransRead
  const filteredTrans = useMemo(() => trans.filter((item) => item && item.trim().length > 0), [trans])
  const displayTrans = useMemo(() => filteredTrans.slice(0, 6), [filteredTrans])
  const speechText = useMemo(() => displayTrans.join('；'), [displayTrans])
  const speechOptions = useMemo(() => ({ volume: pronunciationConfig.transVolume }), [pronunciationConfig.transVolume])
  const { speak, speaking } = useSpeech(speechText, speechOptions)

  const handleClickSoundIcon = useCallback(() => {
    speak(true)
  }, [speak])

  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  if (displayTrans.length === 0 && !tense) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center pb-4 pt-5">
      {displayTrans.length > 0 && (
        <span
          className={`inline-block max-w-4xl break-words whitespace-normal text-center font-sans text-xl text-gray-600 transition-colors duration-300 dark:text-gray-50 dark:text-opacity-80 ${
            isShowTransRead && 'pl-8'
          } ${isTextSelectable && 'select-text'}`}
        >
          {speechText}
        </span>
      )}
      {tense && (
        <div
          className={`mt-2 text-center text-sm text-gray-500 transition-colors duration-300 dark:text-gray-300 ${
            isTextSelectable && 'select-text'
          }`}
        >
          时态：{tense}
        </div>
      )}
      {isShowTransRead && displayTrans.length > 0 && (
        <Tooltip content="朗读释义" className="mt-3 h-5 w-5 cursor-pointer leading-7">
          <SoundIcon animated={speaking} onClick={handleClickSoundIcon} className="h-5 w-5" />
        </Tooltip>
      )}
    </div>
  )
}

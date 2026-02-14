import { TypingContext, TypingStateActionType } from '../../store'
import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import { isShowPrevAndNextWordAtom, phoneticConfigAtom } from '@/store'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'

export default function WordPanel() {
  const { state, dispatch } = useContext(TypingContext)!
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const currentWord = state.chapterData.words[state.chapterData.index]
  const nextWord = state.chapterData.words[state.chapterData.index + 1] as Word | undefined

  usePrefetchPronunciationSound(nextWord?.name)

  const onFinish = useCallback(() => {
    if (state.chapterData.index < state.chapterData.words.length - 1) {
      dispatch({ type: TypingStateActionType.NEXT_WORD })
    } else {
      dispatch({ type: TypingStateActionType.FINISH_CHAPTER })
    }
  }, [state.chapterData.index, state.chapterData.words.length, dispatch])

  return (
    <div className="container flex h-full w-full flex-col items-center justify-center">
      {!state.isImmersiveMode && (
        <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
          {isShowPrevAndNextWord && state.isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}
      <div className="container flex flex-grow flex-col items-center justify-center">
        {currentWord && (
          <div className="relative flex w-full justify-center">
            {!state.isTyping && (
              <div className="absolute flex h-full w-full justify-center">
                <div className="z-10 flex w-full items-center backdrop-blur-sm">
                  <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                    按任意键{state.timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}
            <div className="relative">
              <WordComponent word={currentWord} onFinish={onFinish} />
              {phoneticConfig.isOpen && <Phonetic word={currentWord} />}
              {state.isTransVisible && <Translation trans={currentWord.trans.join('；')} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

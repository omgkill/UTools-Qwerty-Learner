import { TypingContext, TypingStateActionType } from '../../store'
import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import { parseMdxEntry } from '@/utils/mdxParser'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import { isShowPrevAndNextWordAtom, phoneticConfigAtom } from '@/store'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useRef } from 'react'

export default function WordPanel() {
  const { state, dispatch } = useContext(TypingContext)!
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const currentWord = state.wordListData.words[state.wordListData.index]
  const prevWord = state.wordListData.words[state.wordListData.index - 1] as Word | undefined
  const nextWord = state.wordListData.words[state.wordListData.index + 1] as Word | undefined

  usePrefetchPronunciationSound(currentWord?.name)
  usePrefetchPronunciationSound(prevWord?.name)
  usePrefetchPronunciationSound(nextWord?.name)
  const queriedWordsRef = useRef(new Set<string>())

  const onFinish = useCallback(() => {
    if (state.wordListData.index < state.wordListData.words.length - 1) {
      dispatch({ type: TypingStateActionType.NEXT_WORD })
    } else {
      dispatch({ type: TypingStateActionType.FINISH_WORDS })
    }
  }, [state.wordListData.index, state.wordListData.words.length, dispatch])

  const requestWordMeaning = useCallback(
    async (targetWord: Word | undefined) => {
      if (!targetWord) return
      if (!window.queryFirstMdxWord) return
      const dicts = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      if (!dicts[0]) return
      if (queriedWordsRef.current.has(targetWord.name)) return

      const existingInfo = state.wordInfoMap[targetWord.name]
      const hasTranslations = existingInfo?.trans && existingInfo.trans.length > 0
      const hasPhonetics = Boolean(existingInfo?.ukphone)
      if (hasTranslations && hasPhonetics) return

      queriedWordsRef.current.add(targetWord.name)
      const result = await window.queryFirstMdxWord(targetWord.name)
      if (!result || !result.ok || !result.content) return

      const parsed = parseMdxEntry(result.content)
      if (parsed.translations.length === 0 && !parsed.phonetics.uk && !parsed.tense) return

      dispatch({
        type: TypingStateActionType.UPDATE_WORD_INFO,
        payload: {
          wordName: targetWord.name,
          data: {
            trans: parsed.translations.length > 0 ? parsed.translations : undefined,
            ukphone: parsed.phonetics.uk || undefined,
            tense: parsed.tense || undefined,
          },
        },
      })
    },
    [dispatch, state.wordInfoMap],
  )

  useEffect(() => {
    void requestWordMeaning(prevWord)
    void requestWordMeaning(currentWord)
    void requestWordMeaning(nextWord)
  }, [requestWordMeaning, prevWord, currentWord, nextWord])

  const wordInfo = currentWord ? state.wordInfoMap[currentWord.name] : undefined
  const displayTrans = wordInfo?.trans || currentWord?.trans || []
  const displayUkphone = wordInfo?.ukphone || currentWord?.ukphone || ''
  const displayTense = wordInfo?.tense || currentWord?.tense

  const wordWithInfo = currentWord
    ? { ...currentWord, trans: displayTrans, ukphone: displayUkphone, tense: displayTense }
    : null

  return (
    <div className="container flex w-full flex-col items-center justify-center">
      {!state.isImmersiveMode && (
        <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
          {isShowPrevAndNextWord && state.uiState.isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}
      <div className="container flex flex-col items-center justify-center">
        {currentWord && (
          <div className="relative flex w-full justify-center">
            {!state.uiState.isTyping && (
              <div className="absolute flex h-full w-full justify-center">
                <div className="z-10 flex w-full items-center backdrop-blur-sm">
                  <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                    按任意键{state.statsData.timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}
            <div className="relative">
              <WordComponent word={currentWord} onFinish={onFinish} isExtraReview={state.uiState.isExtraReview} />
              {phoneticConfig.isOpen && <Phonetic word={wordWithInfo || currentWord} />}
              {state.isTransVisible && <Translation trans={displayTrans} tense={displayTense} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

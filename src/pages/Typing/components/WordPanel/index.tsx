import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import Tooltip from '@/components/Tooltip'
import { parseMdxEntry } from '@/utils/mdxParser'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import { hotkeyConfigAtom, isShowPrevAndNextWordAtom, phoneticConfigAtom } from '@/store'
import type { Word } from '@/types'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  isImmersiveModeAtom,
  isTypingAtom,
  isTransVisibleAtom,
  currentWordAtom,
  prevWordAtom,
  nextWordDisplayAtom,
  wordDisplayInfoMapAtom,
  updateWordDisplayInfoAtom,
  nextWordAtom,
  finishLearningAtom,
  timerDataAtom,
  isExtraReviewAtom,
  isRepeatLearningAtom,
} from '../../store'

export default function WordPanel({ onMastered }: { onMastered?: () => void }) {
  const handleMastered = onMastered ?? (() => undefined)

  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const hotkeyConfig = useAtomValue(hotkeyConfigAtom)
  const navigate = useNavigate()

  const currentWord = useAtomValue(currentWordAtom)
  const prevWord = useAtomValue(prevWordAtom)
  const nextWord = useAtomValue(nextWordDisplayAtom)
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const isTyping = useAtomValue(isTypingAtom)
  const isTransVisible = useAtomValue(isTransVisibleAtom)
  const wordDisplayInfoMap = useAtomValue(wordDisplayInfoMapAtom)
  const timerData = useAtomValue(timerDataAtom)
  const isExtraReview = useAtomValue(isExtraReviewAtom)
  const isRepeatLearning = useAtomValue(isRepeatLearningAtom)

  const updateWordDisplayInfo = useSetAtom(updateWordDisplayInfoAtom)
  const goToNextWord = useSetAtom(nextWordAtom)
  const finishLearning = useSetAtom(finishLearningAtom)

  usePrefetchPronunciationSound(currentWord?.name)
  usePrefetchPronunciationSound(prevWord?.name)
  usePrefetchPronunciationSound(nextWord?.name)
  const queriedWordsRef = useRef(new Set<string>())

  const onFinish = useCallback(() => {
    const finished = goToNextWord()
    if (finished) {
      finishLearning()
    }
  }, [goToNextWord, finishLearning])

  const wordDisplayInfoMapRef = useRef(wordDisplayInfoMap)
  wordDisplayInfoMapRef.current = wordDisplayInfoMap

  const requestWordMeaning = useCallback(
    async (targetWord: Word | undefined) => {
      if (!targetWord) return
      if (!window.queryFirstMdxWord) return
      const dicts = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      if (!dicts[0]) return
      if (queriedWordsRef.current.has(targetWord.name)) return

      const existingInfo = wordDisplayInfoMapRef.current[targetWord.name]
      const hasTranslations = existingInfo?.trans && existingInfo.trans.length > 0
      const hasPhonetics = Boolean(existingInfo?.ukphone)
      if (hasTranslations && hasPhonetics) return

      queriedWordsRef.current.add(targetWord.name)
      try {
        const result = await window.queryFirstMdxWord(targetWord.name)
        if (!result || !result.ok || !result.content) return

        const parsed = parseMdxEntry(result.content)
        if (parsed.translations.length === 0 && !parsed.phonetics.uk && !parsed.tense) return

        updateWordDisplayInfo({
          wordName: targetWord.name,
          data: {
            trans: parsed.translations.length > 0 ? parsed.translations : undefined,
            ukphone: parsed.phonetics.uk || undefined,
            tense: parsed.tense || undefined,
          },
        })
      } catch (e) {
        console.error('Failed to query word meaning:', targetWord.name, e)
      }
    },
    [updateWordDisplayInfo],
  )

  const handleViewDetail = useCallback(() => {
    if (currentWord) {
      navigate(`/query/${encodeURIComponent(currentWord.name)}`)
    }
  }, [currentWord, navigate])

  useHotkeys(
    hotkeyConfig.viewDetail,
    () => {
      handleViewDetail()
    },
    { preventDefault: true },
    [handleViewDetail],
  )

  useEffect(() => {
    void requestWordMeaning(prevWord)
    void requestWordMeaning(currentWord)
    void requestWordMeaning(nextWord)
  }, [requestWordMeaning, prevWord, currentWord, nextWord])

  const wordDisplayInfo = currentWord ? wordDisplayInfoMap[currentWord.name] : undefined
  const displayTrans = wordDisplayInfo?.trans || currentWord?.trans || []
  const displayUkphone = wordDisplayInfo?.ukphone || currentWord?.ukphone || ''
  const displayTense = wordDisplayInfo?.tense || currentWord?.tense

  const wordWithInfo = currentWord
    ? { ...currentWord, trans: displayTrans, ukphone: displayUkphone, tense: displayTense }
    : null

  return (
    <div className="container flex w-full flex-col items-center justify-center">
      {!isImmersiveMode && (
        <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
          {isShowPrevAndNextWord && isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}
      <div className="container flex flex-col items-center justify-center">
        {currentWord && (
          <div className="group relative flex w-full justify-center">
            {!isTyping && (
              <div className="absolute flex h-full w-full justify-center">
                <div className="z-10 flex w-full items-center backdrop-blur-sm">
                  <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                    按任意键{timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}
            <div className="relative">
              <WordComponent word={currentWord} onFinish={onFinish} isExtraReview={isExtraReview} isRepeatLearning={isRepeatLearning} />
              {phoneticConfig.isOpen && <Phonetic word={wordWithInfo || currentWord} />}
              {isTransVisible && <Translation trans={displayTrans} tense={displayTense} />}
              {!isImmersiveMode && isTyping && (
                <div
                  onClick={handleViewDetail}
                  className="mt-3 cursor-pointer text-center text-xs text-gray-400 hover:text-indigo-400"
                >
                  点击查看详细释义（{hotkeyConfig.viewDetail.toUpperCase()}）
                </div>
              )}
            </div>
            {!isImmersiveMode && (
              <div className="absolute bottom-4 right-4 opacity-60 transition-opacity duration-200 ease-in-out hover:opacity-100">
                <Tooltip content="标记已掌握">
                  <span className="cursor-pointer font-mono text-2xl font-normal text-gray-700 dark:text-gray-400" onClick={handleMastered}>
                    掌握
                  </span>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

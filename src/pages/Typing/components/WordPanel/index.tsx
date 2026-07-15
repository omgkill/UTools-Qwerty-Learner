import type { TypingStateAction, WordInfo, WordInfoMap } from '../../store'
import { TypingStateActionType } from '../../store'
import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import { useAdjacentWordPrefetch } from './hooks/useAdjacentWordPrefetch'
import { useTypingWordInfo } from './hooks/useTypingWordInfo'
import { useWordNavigationHotkey } from './hooks/useWordNavigationHotkey'
import { WordPanelRuntimeProvider } from './runtime'
import Tooltip from '@/components/Tooltip'
import { hotkeyConfigAtom, isShowPrevAndNextWordAtom, phoneticConfigAtom } from '@/store'
import type { WordWithIndex } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback, useMemo } from 'react'
import type { Dispatch } from 'react'

type WordPanelProps = {
  onMastered?: () => void
  onWordFinished: (params: { isCorrect: boolean; wrongCount: number }) => Promise<void> | void
  words: WordWithIndex[]
  currentIndex: number
  wordInfoMap: WordInfoMap
  isTyping: boolean
  isTransVisible: boolean
  isImmersiveMode: boolean
  isRepeatLearning?: boolean
  timerTime: number
  dispatch: Dispatch<TypingStateAction>
  disableWordJump?: boolean
}

export default function WordPanel({
  onMastered,
  onWordFinished,
  words,
  currentIndex,
  wordInfoMap,
  isTyping,
  isTransVisible,
  isImmersiveMode,
  isRepeatLearning = false,
  timerTime,
  dispatch,
  disableWordJump = false,
}: WordPanelProps) {
  const handleMastered = onMastered ?? (() => undefined)
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const hotkeyConfig = useAtomValue(hotkeyConfigAtom)
  const currentWord = words[currentIndex]
  const prevWord = words[currentIndex - 1]
  const nextWord = words[currentIndex + 1]

  useAdjacentWordPrefetch({
    currentWordName: currentWord?.name,
    prevWordName: prevWord?.name,
    nextWordName: nextWord?.name,
  })

  const handleWordFinished = useCallback(
    async (params: { isCorrect: boolean; wrongCount: number }) => {
      await onWordFinished(params)
    },
    [onWordFinished],
  )

  const updateWordInfo = useCallback(
    (wordName: string, data: WordInfo) => {
      dispatch({
        type: TypingStateActionType.UPDATE_WORD_INFO,
        payload: { wordName, data },
      })
    },
    [dispatch],
  )

  const { wordWithInfo, displayTrans, displayTense } = useTypingWordInfo({
    currentWord,
    prevWord,
    nextWord,
    wordInfoMap,
    updateWordInfo,
  })
  const { handleViewDetail } = useWordNavigationHotkey({
    currentWord,
    hotkey: hotkeyConfig.viewDetail,
  })

  const runtimeValue = useMemo(
    () => ({
      words,
      currentIndex,
      isTyping,
      isImmersiveMode,
      isTransVisible,
      isRepeatLearning,
      timerTime,
      wordInfoMap,
      actions: {
        updateWordInfo,
        skipToIndex: (index: number) => {
          dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: index })
        },
        reportWrongWord: (index: number) => {
          dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: index })
        },
        reportCorrectWord: (index: number) => {
          dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD, payload: index })
        },
        increaseCorrectCount: () => {
          dispatch({ type: TypingStateActionType.INCREASE_CORRECT_COUNT })
        },
        increaseWrongCount: () => {
          dispatch({ type: TypingStateActionType.INCREASE_WRONG_COUNT })
        },
      },
    }),
    [currentIndex, dispatch, isImmersiveMode, isRepeatLearning, isTransVisible, isTyping, timerTime, updateWordInfo, wordInfoMap, words],
  )

  return (
    <WordPanelRuntimeProvider value={runtimeValue}>
      <div className="container flex w-full flex-col items-center justify-center">
        {!isImmersiveMode && (
          <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
            {isShowPrevAndNextWord && isTyping && (
              <>
                <PrevAndNextWord type="prev" word={prevWord} disableFallbackNavigation={disableWordJump} />
                <PrevAndNextWord type="next" word={nextWord} disableFallbackNavigation={disableWordJump} />
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
                      按任意键{timerTime ? '继续' : '开始'}
                    </p>
                  </div>
                </div>
              )}
              <div className="relative">
                <WordComponent
                  key={`${currentWord.index}-${currentWord.name}`}
                  word={currentWord}
                  onFinish={handleWordFinished}
                />
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
              {!isImmersiveMode && onMastered && (
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
    </WordPanelRuntimeProvider>
  )
}

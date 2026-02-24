import { TypingContext, TypingStateActionType, initialState } from '../../store'
import ShareButton from '../ShareButton'
import ConclusionBar from './ConclusionBar'
import MiniWordChip from './MiniWordChip'
import RemarkRing from './RemarkRing'
import WordChip from './WordChip'
import { currentDictInfoAtom } from '@/store'
import type { WordWithIndex } from '@/typings'
import { Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import IconX from '~icons/tabler/x'

const ResultScreen = () => {
  const typingContext = useContext(TypingContext)
  const state = typingContext?.state ?? initialState
  const dispatch = typingContext?.dispatch

  const currentDictInfo = useAtomValue(currentDictInfoAtom)

  useEffect(() => {
    if (!dispatch) return
    dispatch({ type: TypingStateActionType.TICK_TIMER, addTime: 0 })
  }, [dispatch])

  const wrongWords = useMemo(() => {
    const wordList = state.statsData.wrongWordIndexes.map((index) => state.wordListData.words.find((word) => word.index === index))
    return wordList.filter((word) => word !== undefined) as WordWithIndex[]
  }, [state.statsData.wrongWordIndexes, state.wordListData.words])

  const correctRate = useMemo(() => {
    const wordListLength = state.wordListData.words.length
    if (wordListLength === 0) return 0
    const correctCount = wordListLength - state.statsData.wrongWordIndexes.length
    return Math.floor((correctCount / wordListLength) * 100)
  }, [state.wordListData.words.length, state.statsData.wrongWordIndexes])

  const mistakeLevel = useMemo(() => {
    if (correctRate >= 85) {
      return 0
    } else if (correctRate >= 70) {
      return 1
    } else {
      return 2
    }
  }, [correctRate])

  const timeString = useMemo(() => {
    const seconds = state.statsData.timerData.time
    const minutes = Math.floor(seconds / 60)
    const minuteString = minutes < 10 ? '0' + minutes : minutes + ''
    const restSeconds = seconds % 60
    const secondString = restSeconds < 10 ? '0' + restSeconds : restSeconds + ''
    return `${minuteString}:${secondString}`
  }, [state.statsData.timerData.time])

  const closeButtonHandler = useCallback(() => {
    if (!dispatch) return
    dispatch({ type: TypingStateActionType.FINISH_LEARNING })
  }, [dispatch])

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-200 opacity-80 dark:bg-gray-600"></div>
      <Transition
        show={true}
        enter="ease-in duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-out duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        {state.isImmersiveMode ? (
          <div className="flex h-screen items-center justify-center">
            <div className="fixed flex w-[90vw] min-w-[430px] max-w-6xl flex-col overflow-hidden rounded-md bg-gray-100 pb-4 pl-4 pr-4 pt-4 opacity-90 dark:bg-gray-800 md:w-4/5 lg:w-3/5">
              <div className="text-center text-[.8rem] font-bold text-gray-600 dark:text-gray-400">
                {currentDictInfo?.name}
              </div>
              <div className="z-10 mt-2 flex-1 overflow-visible rounded-md border-2 dark:border-gray-700">
                <div className="customized-scrollbar z-20 ml-1 mr-1 flex h-22 flex-row flex-wrap content-start gap-2 overflow-y-auto overflow-x-hidden p-2">
                  {wrongWords.map((word, index) => (
                    <MiniWordChip key={`${index}-${word.name}`} word={word} />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex w-full justify-center gap-12 px-2 text-[.8rem] text-gray-700 dark:text-gray-300">
                <div>耗时：{timeString}</div>
                <div>正确率：{state.statsData.timerData.accuracy} %</div>
                <div>WPM：{state.statsData.timerData.wpm}</div>
              </div>
              <div className="mt-4 flex w-full justify-center gap-2 px-2">
                <button
                  className="btn-primary h-8 border-2 border-solid border-gray-300 bg-white text-[.8rem] text-gray-700 dark:border-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
                  type="button"
                  onClick={closeButtonHandler}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-screen items-center justify-center">
            <div className="card fixed flex w-[90vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white pb-14 pl-10 pr-5 pt-10 shadow-lg dark:bg-gray-800 md:w-4/5 lg:w-3/5">
              <div className="text-center font-sans text-xl font-normal text-gray-900 dark:text-gray-400 md:text-2xl">
                ✓ 今日目标达成
              </div>
              <button className="absolute right-7 top-5" onClick={closeButtonHandler}>
                <IconX className="text-gray-400" />
              </button>
              <div className="mt-10 flex flex-row gap-2 overflow-hidden">
                <div className="flex flex-shrink-0 flex-grow-0 flex-col gap-3 px-4 sm:px-1 md:px-2 lg:px-4">
                  <RemarkRing remark={`${state.statsData.timerData.accuracy}%`} caption="正确率" percentage={state.statsData.timerData.accuracy} />
                  <RemarkRing remark={timeString} caption="耗时" />
                  <RemarkRing remark={state.statsData.timerData.wpm + ''} caption="WPM" />
                </div>
                <div className="z-10 ml-6 flex-1 overflow-visible rounded-xl bg-indigo-50 dark:bg-gray-700">
                  <div className="customized-scrollbar z-20 ml-8 mr-1 flex h-80 flex-row flex-wrap content-start gap-4 overflow-y-auto overflow-x-hidden pr-7 pt-9">
                    {wrongWords.map((word, index) => (
                      <WordChip key={`${index}-${word.name}`} word={word} />
                    ))}
                  </div>
                  <div className="align-center flex w-full flex-row justify-start rounded-b-xl bg-indigo-200 px-4 dark:bg-indigo-400">
                    <ConclusionBar mistakeLevel={mistakeLevel} mistakeCount={state.statsData.wrongWordIndexes.length} />
                  </div>
                </div>
                <div className="ml-2 flex flex-col items-center justify-end gap-3.5 text-xl">
                  <ShareButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </Transition>
    </div>
  )
}

export default ResultScreen

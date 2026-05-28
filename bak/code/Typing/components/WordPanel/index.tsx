import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import Tooltip from '@/components/Tooltip'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import { useWordPanelState } from '../../hooks/useWordPanelState'
import { useWordMeaning } from '../../hooks/useWordMeaning'
import { useWordDetailNavigation } from '../../hooks/useWordDetailNavigation'
import { useEffect } from 'react'

export default function WordPanel({ onMastered }: { onMastered?: () => void }) {
  const handleMastered = onMastered ?? (() => undefined)

  const state = useWordPanelState()
  const { requestWordMeaning } = useWordMeaning()
  const { handleViewDetail, hotkeyConfig } = useWordDetailNavigation()

  // 发音预加载
  usePrefetchPronunciationSound(state.currentWord?.name)
  usePrefetchPronunciationSound(state.prevWord?.name)
  usePrefetchPronunciationSound(state.nextWord?.name)

  // MDX 查询
  useEffect(() => {
    void requestWordMeaning(state.prevWord)
    void requestWordMeaning(state.currentWord)
    void requestWordMeaning(state.nextWord)
  }, [requestWordMeaning, state.prevWord, state.currentWord, state.nextWord])

  return (
    <div className="container flex w-full flex-col items-center justify-center">
      {/* 上下词显示 */}
      {!state.isImmersiveMode && (
        <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
          {state.isShowPrevAndNextWord && state.isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}

      {/* 单词面板 */}
      <div className="container flex flex-col items-center justify-center">
        {state.currentWord && (
          <div className="group relative flex w-full justify-center">
            {/* 开始提示 */}
            {!state.isTyping && (
              <div className="absolute flex h-full w-full justify-center">
                <div className="z-10 flex w-full items-center backdrop-blur-sm">
                  <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                    按任意键{state.timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}

            {/* 单词显示 */}
            <div className="relative">
              <WordComponent
                word={state.currentWord}
                onFinish={state.onFinish}
                isExtraReview={state.isExtraReview}
                isRepeatLearning={state.isRepeatLearning}
              />
              {state.phoneticConfig.isOpen && <Phonetic word={state.wordWithInfo || state.currentWord} />}
              {state.isTransVisible && <Translation trans={state.displayTrans} tense={state.displayTense} />}

              {/* 查看详情 */}
              {!state.isImmersiveMode && state.isTyping && (
                <div
                  onClick={handleViewDetail}
                  className="mt-3 cursor-pointer text-center text-xs text-gray-400 hover:text-indigo-400"
                >
                  点击查看详细释义（{hotkeyConfig.viewDetail.toUpperCase()}）
                </div>
              )}
            </div>

            {/* 掌握按钮 */}
            {!state.isImmersiveMode && (
              <div className="absolute bottom-4 right-4 opacity-60 transition-opacity duration-200 ease-in-out hover:opacity-100">
                <Tooltip content="标记已掌握">
                  <span
                    className="cursor-pointer font-mono text-2xl font-normal text-gray-700 dark:text-gray-400"
                    onClick={handleMastered}
                  >
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
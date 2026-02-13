import Layout from '../../components/Layout'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import ResultScreen from './components/ResultScreen'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import Header from '@/components/Header'
// import StarCard from '@/components/StarCard'
import Tooltip from '@/components/Tooltip'
import UpdateDialog from '@/components/UpdateDialog'
import { idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom, currentDictIdAtom, currentDictInfoAtom, randomConfigAtom } from '@/store'
// import type { WordWithIndex } from '@/typings'
import { isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { useMixPanelChapterLogUploader } from '@/utils/mixpanel'
import { addErrorWordList } from '@/utils/typing-mistake-db'
import { useAtom, useAtomValue } from 'jotai'
import mixpanel from 'mixpanel-browser'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { NavLink } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useImmerReducer } from 'use-immer'

const App: React.FC = () => {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words } = useWordList()

  const currentChapter = useAtomValue(currentChapterAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const randomConfig = useAtomValue(randomConfigAtom)

  const chapterLogUploader = useMixPanelChapterLogUploader(state)
  const saveChapterRecord = useSaveChapterRecord()

  useEffect(() => {
    const handleModeChange = () => {
      const mode = window.getMode()
      if (mode === 'conceal' || mode === 'moyu') {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: true }) // Ensure payload is handled or modify reducer
      } else {
        dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE, payload: false })
      }
    }

    // Initial check
    if (window.utools) {
      handleModeChange()
    }

    // Listen for custom event from preload
    window.addEventListener('utools-mode-change', handleModeChange)

    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [dispatch])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId('cet4')
    }
  }, [currentDictId, setCurrentDictId])

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    state.chapterData.words?.length > 0 ? setIsLoading(false) : setIsLoading(true)
  }, [state.chapterData.words])

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch])

  useEffect(() => {
    if (words !== undefined) {
      dispatch({
        type: TypingStateActionType.SETUP_CHAPTER,
        payload: { words, shouldShuffle: randomConfig.isOpen },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  useHotkeys(
    'alt+s',
    () => {
      if (state.isShowSkip) {
        skipWord()
      }
    },
    { preventDefault: true },
  )

  useEffect(() => {
    // 当用户完成章节后且完成 word Record 数据保存，记录 chapter Record 数据,
    if (state.isFinished && !state.isSavingRecord) {
      chapterLogUploader()
      saveChapterRecord(state)

      const wordList = state.chapterData.wrongWordIndexes.map((index) => state.chapterData.words.find((word) => word.index === index))
      wordList.filter((word) => word !== undefined)

      addErrorWordList(currentDictId, wordList)

      if (window.utools) {
        window.exportDatabase2UTools()
        window.exportTypingMistakeDB2UTools()
        window.migrateLocalStorageToUtools()
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useHotkeys(
    'alt+s',
    () => {
      if (state.isShowSkip) {
        skipWord()
      }
    },
    { preventDefault: true },
  )

  useHotkeys(
    'alt+m',
    () => {
      dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE })
      mixpanel.track('ImmersiveMode', { state: state.isImmersiveMode ? 'open' : 'close' })
      if (!state.isImmersiveMode)
        toast('再次按下 Alt + M 可退出沉浸模式🤞', {
          position: 'top-center',
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: false,
          progress: undefined,
          theme: 'light',
        })
    },
    { preventDefault: true },
  )

  useConfetti(state.isFinished && !state.isImmersiveMode)

  return (
    <>
      <TypingContext.Provider value={{ state: state, dispatch }}>
        {state.isFinished && <ResultScreen />}
        <Layout>
          {!state.isImmersiveMode && (
            <Header>
              <Tooltip content="词典章节切换">
                <NavLink
                  className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
                  to="/gallery"
                >
                  {currentDictInfo.name} 第 {currentChapter + 1} 章
                </NavLink>
              </Tooltip>
              <PronunciationSwitcher />
              <Switcher />
              <StartButton isLoading={isLoading} />
              <Tooltip content="跳过该词 Alt + S">
                <button
                  className={`${
                    state.isShowSkip ? 'bg-orange-400' : 'invisible w-0 bg-gray-300 px-0 opacity-0'
                  } btn-primary transition-all duration-300 `}
                  onClick={skipWord}
                >
                  Skip
                </button>
              </Tooltip>
            </Header>
          )}
          <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-4">
            <div className="container relative mx-auto flex h-full flex-col items-center">
              <div className="container flex flex-grow items-center justify-center">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center ">
                    <div
                      className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid  border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                      role="status"
                    ></div>
                  </div>
                ) : (
                  !state.isFinished && <WordPanel />
                )}
              </div>
              {!state.isImmersiveMode && <Speed />}
            </div>
          </div>
        </Layout>

        {!state.isImmersiveMode && <WordList />}
      </TypingContext.Provider>
      <UpdateDialog />
    </>
  )
}

export default App

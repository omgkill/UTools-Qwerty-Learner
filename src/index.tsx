import Loading from './components/Loading'
import './index.css'
import { restoreUserDataFromUTools, setupAutoBackupToUTools } from '@/features/backup/application'
import { simulatedDateAtom } from '@/store'
import { resetTimeDiff, setSimulatedDate } from '@/utils/timeService'
import { VIP_STATE_KEY, setConcealFeature, setUtoolsValue } from '@/utils/utools'
import { useAtom } from 'jotai'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const NormalTypingPage = lazy(() => import('./pages/Typing/NormalTypingPage'))
const RepeatTypingPage = lazy(() => import('./pages/Typing/RepeatTypingPage'))
const ConsolidateTypingPage = lazy(() => import('./pages/Typing/ConsolidateTypingPage'))
const MdxQueryPage = lazy(() => import('./pages/MdxQuery'))
const MdxManagePage = lazy(() => import('./pages/MdxManage'))
const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

// 提取为组件，避免在三处分支中重复配置
function AppToastContainer() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={2500}
      hideProgressBar
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable={false}
      pauseOnHover
    />
  )
}

const container = document.getElementById('root')

const log = (msg: string) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  const line = `[${timestamp}] [index.tsx] ${msg}`
  console.log(line)
  ;(window as unknown as { debugLog?: (message: string) => void }).debugLog?.(`[index.tsx] ${msg}`)
}

function Root() {
  const [mode, setMode] = useState<string | null>(null)
  const [isModeReady, setIsModeReady] = useState(false)
  const [isDataRestored, setIsDataRestored] = useState(false)
  const [simulatedDate] = useAtom(simulatedDateAtom)

  // 应用模拟日期：启动时从存储恢复，修改时立即生效；'' 表示使用真实时间
  useEffect(() => {
    if (simulatedDate) {
      setSimulatedDate(simulatedDate)
    } else {
      resetTimeDiff()
    }
  }, [simulatedDate])

  useEffect(() => {
    async function restoreData() {
      await restoreUserDataFromUTools(log)
      setIsDataRestored(true)
    }
    restoreData()
  }, [])

  // log() 不应在组件体中直接调用（每次渲染都触发），只在 effect 中使用

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    if (!isDataRestored) return
    return setupAutoBackupToUTools()
  }, [isDataRestored])

  useEffect(() => {
    log('useEffect: registering mode change listener')

    const handleModeChange = (e: Event) => {
      const action = (e as CustomEvent).detail
      const newMode = action?.code || action || 'typing'
      log(`handleModeChange: code=${action?.code}, newMode=${newMode}`)
      setMode(newMode)
      setIsModeReady(true)
    }

    const initialMode = window.getMode?.()
    log(`useEffect: initialMode=${initialMode}`)
    if (initialMode) {
      setMode(initialMode)
      setIsModeReady(true)
    }

    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      log('useEffect: cleanup - removing listener')
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [])

  useEffect(() => {
    if (!mode) return
    setUtoolsValue(VIP_STATE_KEY, 'c')
    setConcealFeature()
  }, [mode])

  if (!isModeReady || !isDataRestored) {
    return (
      <React.StrictMode>
        <Loading />
      </React.StrictMode>
    )
  }

  if (mode === 'mdx-query') {
    return (
      <React.StrictMode>
        <HashRouter basename="" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<Loading />}>
            <MdxQueryPage />
          </Suspense>
        </HashRouter>
        <AppToastContainer />
      </React.StrictMode>
    )
  }

  if (mode === 'mdx-manage') {
    return (
      <React.StrictMode>
        <Suspense fallback={<Loading />}>
          <MdxManagePage />
        </Suspense>
        <AppToastContainer />
      </React.StrictMode>
    )
  }

  const isRepeatMode = mode === 'repeat'
  const isConsolidateMode = mode === 'consolidate'

  return (
    <React.StrictMode>
      <HashRouter basename="" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route
              index
              element={isRepeatMode ? <RepeatTypingPage /> : isConsolidateMode ? <ConsolidateTypingPage /> : <NormalTypingPage />}
            />
            <Route path="/repeat" element={<RepeatTypingPage />} />
            <Route path="/consolidate" element={<ConsolidateTypingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/query/:word?" element={<MdxQueryPage />} />
            <Route path="/*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <AppToastContainer />
    </React.StrictMode>
  )
}

container && createRoot(container).render(<Root />)

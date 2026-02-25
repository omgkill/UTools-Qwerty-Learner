import Loading from './components/Loading'
import './index.css'
import { setConcealFeature } from '@/utils/utools'
import mixpanel from 'mixpanel-browser'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const TypingPage = lazy(() => import('./pages/Typing'))
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

const disabledMixpanelTrack: typeof mixpanel.track = () => undefined
const mixpanelMutable = mixpanel as unknown as { track: typeof mixpanel.track }

if (import.meta.env.DEV || window.utools?.isDev?.()) {
  const devKey = import.meta.env.VITE_MIXPANEL_KEY_DEV
  if (devKey) {
    mixpanel.init(devKey, { debug: true })
  } else {
    mixpanelMutable.track = disabledMixpanelTrack
  }
} else {
  const prodKey = import.meta.env.VITE_MIXPANEL_KEY_PROD
  if (prodKey) {
    mixpanel.init(prodKey)
  } else {
    mixpanelMutable.track = disabledMixpanelTrack
  }
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

  // log() 不应在组件体中直接调用（每次渲染都触发），只在 effect 中使用

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

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
    localStorage.setItem('x-vipState', 'c')
    setConcealFeature()
    mixpanel.track('Open', { mode: mode })
  }, [mode])

  if (!isModeReady) {
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

  return (
    <React.StrictMode>
      <HashRouter basename="" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<TypingPage />} />
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

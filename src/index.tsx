import Loading from './components/Loading'
import './index.css'
import TypingPage from './pages/Typing'
import MdxQueryPage from './pages/MdxQuery'
import MdxManagePage from './pages/MdxManage'
import { processPayment, setConcealFeature } from '@/utils/utools'
import mixpanel from 'mixpanel-browser'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

const disabledMixpanelTrack: typeof mixpanel.track = (..._args: Parameters<typeof mixpanel.track>) => undefined
const mixpanelMutable = mixpanel as unknown as { track: typeof mixpanel.track }

if (import.meta.env.DEV || window.utools.isDev()) {
  const devKey = import.meta.env.VITE_MIXPANEL_KEY_DEV
  if (devKey) {
    mixpanel.init(devKey, { debug: true })
  } else {
    mixpanelMutable.track = disabledMixpanelTrack
  }
} else {
  const devKey = import.meta.env.VITE_MIXPANEL_KEY_DEV
  if (devKey) {
    mixpanel.init(devKey, { debug: true })
  } else {
    mixpanelMutable.track = disabledMixpanelTrack
  }
}

const container = document.getElementById('root')

const log = (msg: string) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  const line = `[${timestamp}] [index.tsx] ${msg}`
  console.log(line)
  ;(window as any).debugLog?.(`[index.tsx] ${msg}`)
}

function Root() {
  const [mode, setMode] = useState<string | null>(null)
  const [isModeReady, setIsModeReady] = useState(false)

  log(`Root render: mode=${mode}, isModeReady=${isModeReady}`)

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
        <MdxQueryPage />
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
      </React.StrictMode>
    )
  }

  if (mode === 'mdx-manage') {
    return (
      <React.StrictMode>
        <MdxManagePage />
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
            <Route path="/*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </HashRouter>
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
    </React.StrictMode>
  )
}

container && createRoot(container).render(<Root />)

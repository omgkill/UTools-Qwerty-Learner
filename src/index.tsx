import Loading from './components/Loading'
import './index.css'
import { VIP_STATE_KEY, setConcealFeature, setUtoolsValue } from '@/utils/utools'
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

function Root() {
  const [mode, setMode] = useState<string | null>(null)
  const [isModeReady, setIsModeReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const action = (e as CustomEvent).detail
      const newMode = action?.code || action || 'typing'
      setMode(newMode)
      setIsModeReady(true)
    }
    
    const initialMode = window.getMode?.()
    if (initialMode) {
      setMode(initialMode)
      setIsModeReady(true)
    }
    
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [])

  useEffect(() => {
    if (!mode) return
    setUtoolsValue(VIP_STATE_KEY, 'c')
    setConcealFeature()
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

  const isRepeatMode = mode === 'repeat'
  const isConsolidateMode = mode === 'consolidate'

  return (
    <React.StrictMode>
      <HashRouter basename="" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route
              index
              element={
                isRepeatMode ? (
                  <RepeatTypingPage />
                ) : isConsolidateMode ? (
                  <ConsolidateTypingPage />
                ) : (
                  <NormalTypingPage />
                )
              }
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

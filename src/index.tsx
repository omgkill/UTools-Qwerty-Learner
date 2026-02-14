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

if (import.meta.env.DEV || window.utools.isDev()) {
  const devKey = import.meta.env.VITE_MIXPANEL_KEY_DEV
  if (devKey) {
    mixpanel.init(devKey, { debug: true })
  } else {
    // @ts-ignore
    mixpanel.track = () => {}
  }
} else {
  const devKey = import.meta.env.VITE_MIXPANEL_KEY_DEV
  if (devKey) {
    mixpanel.init(devKey, { debug: true })
  } else {
    // @ts-ignore
    mixpanel.track = () => {}
  }
}

const container = document.getElementById('root')

function Root() {
  const [mode, setMode] = useState(window.getMode?.() || 'typing')

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const action = (e as CustomEvent).detail
      const newMode = action?.code || action || 'typing'
      setMode(newMode)
    }
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [])

  useEffect(() => {
    // 强制设置VIP状态
    localStorage.setItem('x-vipState', 'c')

    // 设定摸鱼模式
    setConcealFeature()
    mixpanel.track('Open', { mode: mode })
  }, [mode])

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

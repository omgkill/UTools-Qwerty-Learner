import Loading from './components/Loading'
import './index.css'
import TypingPage from './pages/Typing'
import { isOpenDarkModeAtom } from '@/store'
import { processPayment, setConcealFeature } from '@/utils/utools'
import { useAtomValue } from 'jotai'
import mixpanel from 'mixpanel-browser'
import React, { Suspense, lazy, useEffect } from 'react'
import 'react-app-polyfill/stable'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

if (import.meta.env.DEV || (window.utools && window.utools.isDev())) {
  // for dev
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
  const darkMode = useAtomValue(isOpenDarkModeAtom)
  useEffect(() => {
    darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    // 强制设置VIP状态
    localStorage.setItem('x-vipState', 'c')
    
    if (window.utools) {
      // 设定摸鱼模式
      setConcealFeature()
      mixpanel.track('Open', { mode: window.getMode() })
    }
  }, [])
  return (
    <React.StrictMode>
      <HashRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>
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

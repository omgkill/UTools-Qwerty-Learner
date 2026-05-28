import './index.css'
import React, { Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Loading from './components/Loading'

const NormalTypingPage = React.lazy(() => import('./pages/Typing/NormalTypingPage'))
const GalleryPage = React.lazy(() => import('./pages/Gallery/GalleryPage'))

const container = document.getElementById('root')

function Root() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <React.StrictMode>
        <Loading />
      </React.StrictMode>
    )
  }

  return (
    <React.StrictMode>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<NormalTypingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </React.StrictMode>
  )
}

container && createRoot(container).render(<Root />)
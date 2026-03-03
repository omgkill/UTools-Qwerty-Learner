import Loading from './components/Loading'
import './index.css'
import '@/utils/db/data-export'
import type { BackupMeta } from '@/utils/db'
import { BACKUP_META_KEY, LOCAL_WRITE_KEY } from '@/utils/db'
import { VIP_STATE_KEY, getUtoolsValue, setConcealFeature, setUtoolsValue } from '@/utils/utools'
import { now } from '@/utils/timeService'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const NormalTypingPage = lazy(() => import('./pages/Typing/NormalTypingPage'))
const RepeatTypingPage = lazy(() => import('./pages/Typing/RepeatTypingPage'))
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

let hasRestoredFromUtools = false
const RESTORE_PROCESS_KEY = 'utools-restore-process-id'

const getMainProcessId = () => {
  if (typeof window === 'undefined') return null
  const ppid = window.process?.ppid
  if (typeof ppid === 'number' && Number.isFinite(ppid)) return ppid
  return null
}

function Root() {
  const [mode, setMode] = useState<string | null>(null)
  const [isModeReady, setIsModeReady] = useState(false)
  const [isDataRestored, setIsDataRestored] = useState(false)

  useEffect(() => {
    async function restoreData() {
      if (hasRestoredFromUtools) {
        setIsDataRestored(true)
        return
      }
      const mainProcessId = getMainProcessId()
      if (mainProcessId !== null) {
        const storedId = getUtoolsValue<number | null>(RESTORE_PROCESS_KEY, null)
        if (storedId === mainProcessId) {
          hasRestoredFromUtools = true
          setIsDataRestored(true)
          return
        }
        setUtoolsValue(RESTORE_PROCESS_KEY, mainProcessId)
      }
      const localWriteAt = getUtoolsValue<number>(LOCAL_WRITE_KEY, 0)
      const backupMeta = getUtoolsValue<BackupMeta | null>(BACKUP_META_KEY, null)
      const backupAt = backupMeta?.lastBackupAt ?? 0
      if (localWriteAt > 0 && backupAt < localWriteAt) {
        log(`Skip restore: backupAt=${backupAt} localWriteAt=${localWriteAt}`)
        hasRestoredFromUtools = true
        setIsDataRestored(true)
        return
      }
      hasRestoredFromUtools = true
      try {
        const getData = window.getUToolsUserData
        const result = getData ? await Promise.resolve(getData()) : undefined
        const data = result && result.length > 0 ? result : undefined
        const hasData = Boolean(data)
        if (hasData) {
          log('Found uTools backup data, restoring...')
          await window.importDatabase2UTools?.()
          const restoredAt = backupAt > 0 ? backupAt : now()
          setUtoolsValue(LOCAL_WRITE_KEY, Math.max(localWriteAt, restoredAt))
          log('Data restored successfully')
        } else {
          log('No uTools backup data found, skipping restore')
        }
      } catch (e) {
        log(`Data restore failed: ${e}`)
      }
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
    if (!window.utools || !window.exportDatabase2UTools) return

    let saving = false
    const saveToUtools = async () => {
      if (saving) return
      saving = true
      try {
        await window.exportDatabase2UTools?.()
      } finally {
        saving = false
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void saveToUtools()
      }
    }

    window.addEventListener('beforeunload', saveToUtools)
    document.addEventListener('visibilitychange', handleVisibility)
    const intervalId = window.setInterval(() => {
      void saveToUtools()
    }, 30000)

    return () => {
      window.removeEventListener('beforeunload', saveToUtools)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(intervalId)
    }
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

  return (
    <React.StrictMode>
      <HashRouter basename="" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={isRepeatMode ? <RepeatTypingPage /> : <NormalTypingPage />} />
            <Route path="/repeat" element={<RepeatTypingPage />} />
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

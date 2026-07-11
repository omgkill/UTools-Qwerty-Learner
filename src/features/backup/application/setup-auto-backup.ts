import { exportDatabase2UTools } from '@/utils/db/data-export'

export function setupAutoBackupToUTools(): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined
  if (!window.utools || !window.postUToolsUserData) return undefined

  let saving = false
  const saveToUtools = async () => {
    if (saving) return
    saving = true
    try {
      await exportDatabase2UTools()
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
}

import { getUtoolsValue, setUtoolsValue } from '@/platform/utools'
import { exportDatabase2UTools } from '@/utils/db/data-export'
import { now } from '@/utils/timeService'

export const BACKUP_META_KEY = 'utools-backup-meta'
export const LOCAL_WRITE_KEY = 'utools-local-write-at'

export type BackupMeta = {
  lastBackupAt: number
  lastBackupOk: boolean
  lastBackupError?: string | null
  lastBackupDurationMs?: number
}

const getBackupMeta = (): BackupMeta => {
  return getUtoolsValue<BackupMeta>(BACKUP_META_KEY, {
    lastBackupAt: 0,
    lastBackupOk: false,
  })
}

const setBackupMeta = (patch: Partial<BackupMeta>) => {
  const next = { ...getBackupMeta(), ...patch }
  setUtoolsValue(BACKUP_META_KEY, next)
}

export const markLocalWrite = () => {
  setUtoolsValue(LOCAL_WRITE_KEY, now())
}

export const recordDataWrite = () => {
  markLocalWrite()
  scheduleUtoolsBackup()
}

let backupTimer: number | null = null
let backupRunning = false

export const scheduleUtoolsBackup = () => {
  if (typeof window === 'undefined') return
  if (!window.utools || !window.postUToolsUserData) return
  if (backupTimer) {
    window.clearTimeout(backupTimer)
  }
  backupTimer = window.setTimeout(async () => {
    if (backupRunning) return
    backupRunning = true
    const startAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      await exportDatabase2UTools()
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startAt
      setBackupMeta({
        lastBackupAt: now(),
        lastBackupOk: true,
        lastBackupError: null,
        lastBackupDurationMs: duration,
      })
    } catch (e) {
      setBackupMeta({
        lastBackupOk: false,
        lastBackupError: e instanceof Error ? e.message : String(e),
      })
    } finally {
      backupRunning = false
    }
  }, 1500)
}

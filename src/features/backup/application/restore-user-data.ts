import { BACKUP_META_KEY, LOCAL_WRITE_KEY, type BackupMeta } from './backup-state'
import { getUtoolsValue, setUtoolsValue } from '@/platform/utools'
import { importDatabase2UTools } from '@/utils/db/data-export'
import { now } from '@/utils/timeService'

const RESTORE_PROCESS_KEY = 'utools-restore-process-id'

let hasRestoredFromUtools = false

const getMainProcessId = () => {
  if (typeof window === 'undefined') return null
  const ppid = window.process?.ppid
  if (typeof ppid === 'number' && Number.isFinite(ppid)) return ppid
  return null
}

export async function restoreUserDataFromUTools(log: (msg: string) => void = console.log) {
  if (hasRestoredFromUtools) {
    return
  }

  const mainProcessId = getMainProcessId()
  if (mainProcessId !== null) {
    const storedId = getUtoolsValue<number | null>(RESTORE_PROCESS_KEY, null)
    if (storedId === mainProcessId) {
      hasRestoredFromUtools = true
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
      await importDatabase2UTools()
      const restoredAt = backupAt > 0 ? backupAt : now()
      setUtoolsValue(LOCAL_WRITE_KEY, Math.max(localWriteAt, restoredAt))
      log('Data restored successfully')
    } else {
      log('No uTools backup data found, skipping restore')
    }
  } catch (e) {
    log(`Data restore failed: ${e}`)
  }
}

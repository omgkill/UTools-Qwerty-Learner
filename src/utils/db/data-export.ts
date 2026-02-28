import { db } from '.'
import { getCurrentDate } from '../timeService'

export type ExportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export type ImportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export async function exportDatabase(callback: (exportProgress: ExportProgress) => boolean) {
  const [pako, { saveAs }] = await Promise.all([import('pako'), import('file-saver'), import('dexie-export-import')])

  const blob = await db.export({
    progressCallback: ({ totalRows, completedRows, done }) => {
      return callback({ totalRows, completedRows, done })
    },
  })
  const [wordCount, learningCount] = await Promise.all([db.wordRecords.count(), db.learningRecords.count()])

  const json = await blob.text()
  const compressed = pako.gzip(json)
  const compressedBlob = new Blob([compressed])
  const currentDate = getCurrentDate()
  saveAs(compressedBlob, `User-Data-${currentDate}.gz`)
}

export async function importDatabase(onStart: () => void, callback: (importProgress: ImportProgress) => boolean) {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/gzip'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    onStart()

    const compressed = await file.arrayBuffer()
    const json = pako.ungzip(compressed, { to: 'string' })
    const blob = new Blob([json])

    await db.import(blob, {
      acceptVersionDiff: true,
      acceptMissingTables: true,
      acceptNameDiff: false,
      acceptChangedPrimaryKey: false,
      overwriteValues: true,
      clearTablesBeforeImport: true,
      progressCallback: ({ totalRows, completedRows, done }) => {
        return callback({ totalRows, completedRows, done })
      },
    })
  })

  input.click()
}

export async function exportDatabase2UTools() {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const blob = await db.export()

  const json = await blob.text()
  const compressed = pako.gzip(json)
  const compressedBlob = new Blob([compressed])
  const uint8Array = await blobToUint8Array(compressedBlob)

  await window.postUToolsUserData(uint8Array)
  return true
}
async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const fileReader = new FileReader()
  const promise = new Promise<Uint8Array>((resolve, reject) => {
    fileReader.onload = () => {
      const result = fileReader.result
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result))
        return
      }
      reject(new Error('Failed to read blob as ArrayBuffer'))
    }
    fileReader.onerror = () => {
      reject(new Error('Failed to read blob as Uint8Array'))
    }
  })
  fileReader.readAsArrayBuffer(blob)
  return await promise
}

export async function importDatabase2UTools() {
  console.log('[importDatabase2UTools] Starting data restore from uTools DB...')
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const uint8Array = await window.getUToolsUserData()
  const dataSizeKB = (uint8Array.length / 1024).toFixed(2)
  console.log(`[importDatabase2UTools] Retrieved backup data: ${dataSizeKB} KB`)

  const json = pako.ungzip(uint8Array, { to: 'string' })
  const blob = new Blob([json])
  console.log(`[importDatabase2UTools] Decompressed data size: ${(json.length / 1024).toFixed(2)} KB`)

  await db.import(blob, {
    acceptVersionDiff: true,
    acceptMissingTables: true,
    acceptNameDiff: false,
    acceptChangedPrimaryKey: false,
    overwriteValues: true,
    clearTablesBeforeImport: true,
  })

  const [wordCount, learningCount, wordProgressCount, dictProgressCount, dailyRecordCount] = await Promise.all([
    db.wordRecords.count(),
    db.learningRecords.count(),
    db.wordProgress.count(),
    db.dictProgress.count(),
    db.dailyRecords.count(),
  ])
  console.log(`[importDatabase2UTools] Data restored successfully:
    - wordRecords: ${wordCount}
    - learningRecords: ${learningCount}
    - wordProgress: ${wordProgressCount}
    - dictProgress: ${dictProgressCount}
    - dailyRecords: ${dailyRecordCount}`)
  return true
}

window.exportDatabase2UTools = exportDatabase2UTools
window.importDatabase2UTools = importDatabase2UTools

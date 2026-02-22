import type { Word, WordBank } from '@/typings'
import type * as fs from 'fs'
import type * as path from 'path'
import type * as process from 'process'

declare global {
  interface Window {
    readLocalWordBankConfig: () => WordBank[]
    writeLocalWordBankConfig: (config: WordBank[]) => void
    newLocalWordBankFromJson: (jsonData: Word[], wordBankMeta: WordBank) => void
    readLocalWordBank: (id: string) => Word[]
    delLocalWordBank: (id: string) => boolean
    initLocalWordBanks: () => void
    readLocalDictConfig: () => WordBank[]
    writeLocalDictConfig: (config: WordBank[]) => void
    newLocalDictFromJson: (jsonData: Word[], dictMeta: WordBank) => void
    readLocalDict: (id: string) => Word[]
    delLocalDict: (id: string) => boolean
    initLocalDictionries: () => void
    getMdxDictConfig: () => Array<{ path: string; name: string }>
    saveMdxDictConfig: (dicts: Array<{ path: string; name: string }>) => void
    selectMdxFiles: () => Array<{ path: string; name: string }> | null
    removeMdxDict: (path: string) => Array<{ path: string; name: string }>
    updateMdxDictOrder: (dicts: Array<{ path: string; name: string }>) => Array<{ path: string; name: string }>
    queryMdxWord: (word: string) => Promise<Array<{ dictPath: string; dictName: string; ok: boolean; content?: string; error?: string }>>
    queryFirstMdxWord: (word: string) => Promise<{ dictPath: string; dictName: string; ok: boolean; content?: string; error?: string } | null>
    services: {
      getDictList: () => Array<{ path: string; name: string }>
    }
    getMode: () => string
    getAction: () => { code: string; payload?: string } | null
    clearAllData: () => boolean
    restartPlugin: () => void
    fs: typeof fs
    path: typeof path
    process: typeof process
    _pendingWordList: Word[] | null
  }
}

export {}

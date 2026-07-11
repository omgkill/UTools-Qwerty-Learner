import type { LocalWordBankRepository } from '@/features/word-bank/application'
import { getStorageValue, removeStorageValue, setStorageValue } from '@/platform/storage'
import type { Word, WordBank } from '@/typings'

const WORD_BANK_CONFIG_KEY = 'local-wordbank-config'

const readWordBankConfigFromRuntime = (): WordBank[] => {
  if (typeof window !== 'undefined' && typeof window.readLocalWordBankConfig === 'function') {
    return window.readLocalWordBankConfig()
  }
  return getStorageValue<WordBank[]>(WORD_BANK_CONFIG_KEY, [])
}

const writeWordBankConfigToRuntime = (config: WordBank[]) => {
  if (typeof window !== 'undefined' && typeof window.writeLocalWordBankConfig === 'function') {
    window.writeLocalWordBankConfig(config)
    return
  }
  setStorageValue(WORD_BANK_CONFIG_KEY, config)
}

export class RuntimeLocalWordBankRepository implements LocalWordBankRepository {
  readConfig(): WordBank[] {
    return readWordBankConfigFromRuntime()
  }

  writeConfig(config: WordBank[]): void {
    writeWordBankConfigToRuntime(config)
  }

  createFromJson(words: Word[], wordBankMeta: WordBank): void {
    if (typeof window !== 'undefined' && typeof window.newLocalWordBankFromJson === 'function') {
      window.newLocalWordBankFromJson(words, wordBankMeta)
      return
    }

    setStorageValue(wordBankMeta.id, words)

    const config = readWordBankConfigFromRuntime()
    const nextConfig = [...config]
    const existingIndex = nextConfig.findIndex((wordBank) => wordBank.id === wordBankMeta.id)
    if (existingIndex >= 0) {
      nextConfig[existingIndex] = wordBankMeta
    } else {
      nextConfig.push(wordBankMeta)
    }
    writeWordBankConfigToRuntime(nextConfig)
  }

  readWordBank(id: string): Word[] {
    if (typeof window !== 'undefined' && typeof window.readLocalWordBank === 'function') {
      return window.readLocalWordBank(id)
    }
    return getStorageValue<Word[]>(id, [])
  }

  deleteWordBank(id: string): boolean {
    if (typeof window !== 'undefined' && typeof window.delLocalWordBank === 'function') {
      return window.delLocalWordBank(id)
    }

    const config = readWordBankConfigFromRuntime()
    const nextConfig = config.filter((wordBank) => wordBank.id !== id)
    if (nextConfig.length !== config.length) {
      writeWordBankConfigToRuntime(nextConfig)
    }
    removeStorageValue(id)
    return true
  }

  initWordBanks(): void {
    if (typeof window !== 'undefined' && typeof window.initLocalWordBanks === 'function') {
      window.initLocalWordBanks()
    }
  }
}

export const runtimeLocalWordBankRepository = new RuntimeLocalWordBankRepository()
export const appLocalWordBankRepository = runtimeLocalWordBankRepository

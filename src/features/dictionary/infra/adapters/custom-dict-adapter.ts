import { BaseDictAdapter } from '../../application/adapters/base-dict-adapter'
import type { CustomDictEntry, DictMeta, WordInfo } from '../../domain'

export type CustomDictStorage = {
  loadEntries: (id: string) => CustomDictEntry[]
  saveEntries: (id: string, entries: CustomDictEntry[]) => void
}

export class CustomDictAdapter extends BaseDictAdapter {
  type = 'custom' as const
  private _data: CustomDictEntry[] = []

  constructor(id: string, name: string, data: CustomDictEntry[] = [], private storage?: CustomDictStorage) {
    super()
    this._id = id
    this._name = name
    this._data = data
  }

  async load(): Promise<void> {
    if (this._loaded) return

    if (this.storage) {
      this._data = this.storage.loadEntries(this._id)
    }

    this._loaded = true
  }

  async query(word: string): Promise<WordInfo | null> {
    if (!this._loaded) {
      await this.load()
    }

    const normalizedWord = word.toLowerCase().trim()
    const found = this._data.find((item) => item.name && item.name.toLowerCase().trim() === normalizedWord)

    if (!found) return null

    return {
      word: found.name,
      phonetics: {
        us: found.usphone || '',
        uk: found.ukphone || '',
      },
      translations: found.trans || [],
      definitions: undefined,
      source: {
        dictId: this._id,
        dictName: this._name,
        dictType: 'custom',
      },
    }
  }

  getMeta(): DictMeta {
    return {
      id: this._id,
      name: this._name,
      type: 'custom',
      wordCount: this._data.length,
      enabled: true,
      order: 0,
    }
  }

  getData() {
    return this._data
  }

  setData(data: CustomDictEntry[]) {
    this._data = data
    this.storage?.saveEntries(this._id, data)
  }
}

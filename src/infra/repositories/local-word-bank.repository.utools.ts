import type { LocalWordBankRepository } from '@/features/word-bank/application'
import type { Word, WordBank } from '@/typings'

export class UtoolsLocalWordBankRepository implements LocalWordBankRepository {
  readConfig(): WordBank[] {
    return window.readLocalWordBankConfig?.() ?? []
  }

  writeConfig(config: WordBank[]): void {
    window.writeLocalWordBankConfig?.(config)
  }

  createFromJson(words: Word[], wordBankMeta: WordBank): void {
    window.newLocalWordBankFromJson?.(words, wordBankMeta)
  }

  readWordBank(id: string): Word[] {
    return window.readLocalWordBank?.(id) ?? []
  }

  deleteWordBank(id: string): boolean {
    return window.delLocalWordBank?.(id) ?? false
  }

  initWordBanks(): void {
    window.initLocalWordBanks?.()
  }
}

export const utoolsLocalWordBankRepository = new UtoolsLocalWordBankRepository()

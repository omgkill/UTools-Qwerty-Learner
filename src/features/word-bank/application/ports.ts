import type { Word, WordBank } from '@/typings'

export interface LocalWordBankRepository {
  readConfig(): WordBank[]
  writeConfig(config: WordBank[]): void
  createFromJson(words: Word[], wordBankMeta: WordBank): void
  readWordBank(id: string): Word[]
  deleteWordBank(id: string): boolean
  initWordBanks(): void
}

import type { Word, WordBank } from '@/typings'
import type { LocalWordBankRepository } from '../ports'

export function saveLocalWordBank(repository: LocalWordBankRepository, words: Word[], wordBankMeta: WordBank) {
  repository.createFromJson(words, wordBankMeta)
}

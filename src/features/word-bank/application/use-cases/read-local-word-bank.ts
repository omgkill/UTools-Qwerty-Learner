import { normalizeWords } from '../../domain'
import type { LocalWordBankRepository } from '../ports'

export function readLocalWordBank(repository: LocalWordBankRepository, id: string) {
  return normalizeWords(repository.readWordBank(id))
}

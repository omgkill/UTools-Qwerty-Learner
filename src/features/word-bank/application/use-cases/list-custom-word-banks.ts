import { getUniqueCustomWordBanks } from '../../domain'
import type { LocalWordBankRepository } from '../ports'

export function listCustomWordBanks(repository: LocalWordBankRepository) {
  return getUniqueCustomWordBanks(repository.readConfig())
}

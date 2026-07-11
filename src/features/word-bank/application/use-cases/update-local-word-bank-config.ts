import type { WordBank } from '@/typings'
import type { LocalWordBankRepository } from '../ports'

export function updateLocalWordBankConfig(repository: LocalWordBankRepository, config: WordBank[]) {
  repository.writeConfig(config)
  repository.initWordBanks()
}

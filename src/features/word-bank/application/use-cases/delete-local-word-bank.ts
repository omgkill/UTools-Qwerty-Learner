import type { LocalWordBankRepository } from '../ports'

export function deleteLocalWordBank(repository: LocalWordBankRepository, id: string) {
  const result = repository.deleteWordBank(id)
  repository.initWordBanks()
  return result
}

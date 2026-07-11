import { listCustomWordBanks } from '@/features/word-bank/application'
import { appLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository'
import { wordBanksAtom } from '@/store'
import { useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function useCustomWordBanks() {
  const setWordBanks = useSetAtom(wordBanksAtom)

  const loadCustomWordBanks = useCallback(() => {
    const wordBanks = listCustomWordBanks(appLocalWordBankRepository)
    setWordBanks(wordBanks)
    return wordBanks
  }, [setWordBanks])

  return { loadCustomWordBanks }
}

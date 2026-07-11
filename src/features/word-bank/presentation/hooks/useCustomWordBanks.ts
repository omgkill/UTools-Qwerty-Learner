import { listCustomWordBanks } from '@/features/word-bank/application'
import { utoolsLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository.utools'
import { wordBanksAtom } from '@/store'
import { useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function useCustomWordBanks() {
  const setWordBanks = useSetAtom(wordBanksAtom)

  const loadCustomWordBanks = useCallback(() => {
    const wordBanks = listCustomWordBanks(utoolsLocalWordBankRepository)
    setWordBanks(wordBanks)
    return wordBanks
  }, [setWordBanks])

  return { loadCustomWordBanks }
}

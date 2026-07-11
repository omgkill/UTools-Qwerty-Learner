import { useCustomWordBanks } from '@/features/word-bank/presentation/hooks'
import { currentWordBankAtom, currentWordBankIdAtom, wordBanksAtom } from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useTypingInitializer() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentWordBankId, setCurrentWordBankId] = useAtom(currentWordBankIdAtom)
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const wordBanks = useAtomValue(wordBanksAtom)
  const { loadCustomWordBanks } = useCustomWordBanks()
  const navigate = useNavigate()

  useEffect(() => {
    loadCustomWordBanks()
    setIsInitialized(true)
  }, [loadCustomWordBanks])

  useEffect(() => {
    if (!isInitialized) return

    if (wordBanks.length === 0) {
      navigate('/gallery')
      return
    }

    if (!currentWordBankId || !currentWordBank) {
      const firstWordBank = wordBanks[0]
      if (firstWordBank) {
        setCurrentWordBankId(firstWordBank.id)
        return
      }

      navigate('/gallery')
    }
  }, [isInitialized, currentWordBankId, currentWordBank, wordBanks, navigate, setCurrentWordBankId])

  return {
    isInitialized,
    currentWordBank,
  }
}

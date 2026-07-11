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
    const customWordBanks = loadCustomWordBanks()
    console.log('[useTypingInitializer] Filtered custom word banks:', customWordBanks)
    setIsInitialized(true)
  }, [loadCustomWordBanks])

  useEffect(() => {
    if (!isInitialized) return

    console.log('[useTypingInitializer] Checking word banks:', {
      wordBanksLength: wordBanks.length,
      currentWordBankId,
      currentWordBank: currentWordBank ? currentWordBank.name : null
    })

    if (wordBanks.length === 0) {
      console.log('[useTypingInitializer] No word banks available, navigating to gallery')
      navigate('/gallery')
      return
    }

    if (!currentWordBankId || !currentWordBank) {
      const firstWordBank = wordBanks[0]
      if (firstWordBank) {
        console.log('[useTypingInitializer] Setting first word bank:', firstWordBank.name)
        setCurrentWordBankId(firstWordBank.id)
      } else {
        console.log('[useTypingInitializer] No first word bank available, navigating to gallery')
        navigate('/gallery')
      }
    }
  }, [isInitialized, currentWordBankId, currentWordBank, wordBanks, navigate, setCurrentWordBankId])

  return {
    isInitialized,
    currentWordBank,
  }
}

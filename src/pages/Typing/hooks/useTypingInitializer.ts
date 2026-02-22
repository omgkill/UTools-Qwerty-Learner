import { currentWordBankAtom, currentWordBankIdAtom, wordBanksAtom } from '@/store'
import type { WordBank } from '@/typings'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useTypingInitializer() {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentWordBankId, setCurrentWordBankId] = useAtom(currentWordBankIdAtom)
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const wordBanks = useAtomValue(wordBanksAtom)
  const setWordBanks = useSetAtom(wordBanksAtom)
  const navigate = useNavigate()

  useEffect(() => {
    const config = window.readLocalWordBankConfig()
    const customWordBanks = config.filter((wb: WordBank) => wb.id && wb.id.startsWith('x-dict-'))
    const uniqueWordBanks = customWordBanks.reduce((acc: WordBank[], wb: WordBank) => {
      if (!acc.some((d) => d.id === wb.id)) {
        acc.push(wb)
      }
      return acc
    }, [])
    setWordBanks(uniqueWordBanks)
    setIsInitialized(true)
  }, [setWordBanks])

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
      } else {
        navigate('/gallery')
      }
    }
  }, [isInitialized, currentWordBankId, currentWordBank, wordBanks, navigate, setCurrentWordBankId])

  return {
    isLoading,
    setIsLoading,
    isInitialized,
    currentWordBank,
  }
}

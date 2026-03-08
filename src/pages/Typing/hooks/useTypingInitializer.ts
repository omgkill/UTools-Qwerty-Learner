import { currentWordBankAtom, currentWordBankIdAtom, wordBanksAtom } from '@/store'
import type { WordBank } from '@/types'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAppInitializedAtom } from '../store'

export function useTypingInitializer() {
  const [isInitialized, setIsInitialized] = useAtom(isAppInitializedAtom)
  const [currentWordBankId, setCurrentWordBankId] = useAtom(currentWordBankIdAtom)
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const wordBanks = useAtomValue(wordBanksAtom)
  const setWordBanks = useSetAtom(wordBanksAtom)
  const navigate = useNavigate()

  useEffect(() => {
    if (isInitialized) return // 防止重复初始化

    const config = window.readLocalWordBankConfig()
    console.log('[useTypingInitializer] Loaded word bank config:', config)
    const customWordBanks = config.filter((wb: WordBank) => wb.id && wb.id.startsWith('x-dict-'))
    const uniqueWordBanks = customWordBanks.reduce((acc: WordBank[], wb: WordBank) => {
      if (!acc.some((d) => d.id === wb.id)) {
        acc.push(wb)
      }
      return acc
    }, [])
    console.log('[useTypingInitializer] Filtered custom word banks:', uniqueWordBanks)
    setWordBanks(uniqueWordBanks)
    setIsInitialized(true)
  }, [isInitialized, setWordBanks, setIsInitialized])

  useEffect(() => {
    if (!isInitialized) return

    console.log('[useTypingInitializer] Checking word banks:', {
      wordBanksLength: wordBanks.length,
      currentWordBankId,
      currentWordBank: currentWordBank ? currentWordBank.name : null,
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
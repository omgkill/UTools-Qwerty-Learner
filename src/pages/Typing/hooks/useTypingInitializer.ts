import { useState, useEffect } from 'react'
import type { WordBank, Word } from '@/types'

export function useTypingInitializer() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentWordBank, setCurrentWordBank] = useState<WordBank | null>(null)
  const [wordList, setWordList] = useState<Word[]>([])

  useEffect(() => {
    if (isInitialized) return

    // 加载词库配置
    const config = window.readLocalWordBankConfig()
    const customWordBanks = config.filter((wb: WordBank) => wb.id && wb.id.startsWith('x-dict-'))

    // 如果没有词库，标记初始化完成但不设置词库
    if (customWordBanks.length === 0) {
      setIsInitialized(true)
      return
    }

    // 获取当前选中的词库 ID
    let currentId = localStorage.getItem('currentWordBank')

    // 如果没有选中词库，使用第一个
    if (!currentId || !customWordBanks.some((wb: WordBank) => wb.id === currentId)) {
      currentId = customWordBanks[0].id
      localStorage.setItem('currentWordBank', currentId)
    }

    const selectedBank = customWordBanks.find((wb: WordBank) => wb.id === currentId)

    if (selectedBank) {
      setCurrentWordBank(selectedBank)

      // 加载词库内容
      const words = window.readLocalWordBank(currentId)
      setWordList(words)
    }

    setIsInitialized(true)
  }, [isInitialized])

  return {
    isInitialized,
    currentWordBank,
    wordList,
    hasWordBanks: currentWordBank !== null,
  }
}
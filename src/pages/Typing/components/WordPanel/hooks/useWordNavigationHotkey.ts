import type { WordWithIndex } from '@/typings'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'

type UseWordNavigationHotkeyParams = {
  currentWord: WordWithIndex | undefined
  hotkey: string
}

export function useWordNavigationHotkey(params: UseWordNavigationHotkeyParams) {
  const { currentWord, hotkey } = params
  const navigate = useNavigate()

  const handleViewDetail = useCallback(() => {
    if (currentWord) {
      navigate(`/query/${encodeURIComponent(currentWord.name)}`)
    }
  }, [currentWord, navigate])

  useHotkeys(
    hotkey,
    () => {
      handleViewDetail()
    },
    { preventDefault: true },
    [handleViewDetail],
  )

  return {
    handleViewDetail,
  }
}

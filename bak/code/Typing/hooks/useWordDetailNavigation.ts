import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { useAtomValue } from 'jotai'
import { hotkeyConfigAtom } from '@/store'
import { currentWordAtom } from '../store'

/**
 * 用于单词详情导航的 hook
 * 处理查看单词详细释义的导航逻辑和快捷键
 */
export function useWordDetailNavigation() {
  const navigate = useNavigate()
  const currentWord = useAtomValue(currentWordAtom)
  const hotkeyConfig = useAtomValue(hotkeyConfigAtom)

  const handleViewDetail = useCallback(() => {
    if (currentWord) {
      navigate(`/query/${encodeURIComponent(currentWord.name)}`)
    }
  }, [currentWord, navigate])

  useHotkeys(
    hotkeyConfig.viewDetail,
    () => {
      handleViewDetail()
    },
    { preventDefault: true },
    [handleViewDetail],
  )

  return { handleViewDetail, hotkeyConfig }
}
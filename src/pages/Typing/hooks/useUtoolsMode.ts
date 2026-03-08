import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { toggleImmersiveModeAtom } from '../store'

export function useUtoolsMode() {
  const toggleImmersiveMode = useSetAtom(toggleImmersiveModeAtom)

  useEffect(() => {
    const handleModeChange = () => {
      const windowMode = window.getMode()
      toggleImmersiveMode(windowMode === 'conceal' || windowMode === 'moyu')
    }

    handleModeChange()
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => window.removeEventListener('utools-mode-change', handleModeChange)
  }, [toggleImmersiveMode])
}

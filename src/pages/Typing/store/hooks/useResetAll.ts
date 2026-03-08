import { useSetAtom } from 'jotai'
import { clearWordDisplayInfoMapAtom, resetProgressAtom, resetStatsAtom, resetUIStateAtom } from '../atoms/index'

export function useResetAll() {
  const resetProgress = useSetAtom(resetProgressAtom)
  const resetStats = useSetAtom(resetStatsAtom)
  const resetUIState = useSetAtom(resetUIStateAtom)
  const clearWordDisplayInfoMap = useSetAtom(clearWordDisplayInfoMapAtom)

  return () => {
    resetProgress()
    resetStats()
    resetUIState()
    clearWordDisplayInfoMap()
  }
}

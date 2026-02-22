import type { TypingState } from '../store/types'
import { useSaveLearningRecord } from '@/utils/db'
import { useMixPanelLearningLogUploader } from '@/utils/mixpanel'
import { useEffect } from 'react'

export function useLearningRecordSaver(state: TypingState) {
  const learningLogUploader = useMixPanelLearningLogUploader(state)
  const saveLearningRecord = useSaveLearningRecord()

  useEffect(() => {
    if (state.uiState.isFinished && !state.uiState.isSavingRecord) {
      learningLogUploader()
      saveLearningRecord(state)

      window.exportDatabase2UTools()
      window.migrateLocalStorageToUtools()
    }
  }, [state.uiState.isFinished, state.uiState.isSavingRecord, learningLogUploader, saveLearningRecord, state])
}

import type { TypingState } from '../store/types'
import { useSaveLearningRecord } from '@/utils/db'
import { useMixPanelLearningLogUploader } from '@/utils/mixpanel'
import { useEffect, useRef } from 'react'

export function useLearningRecordSaver(state: TypingState) {
  const learningLogUploader = useMixPanelLearningLogUploader(state)
  const saveLearningRecord = useSaveLearningRecord()
  const hasSavedRef = useRef(false)

  useEffect(() => {
    if (!state.uiState.isFinished) {
      hasSavedRef.current = false
      return
    }

    if (state.uiState.isFinished && !state.uiState.isSavingRecord && !hasSavedRef.current) {
      hasSavedRef.current = true

      const saveRecord = async () => {
        try {
          learningLogUploader()
          await saveLearningRecord(state)
        } catch (e) {
          console.error('Failed to save learning record:', e)
        }
      }

      saveRecord()
    }
  }, [state.uiState.isFinished, state.uiState.isSavingRecord, learningLogUploader, saveLearningRecord, state])
}

import type { TypingState } from '../store/types'
import { useSaveLearningRecord } from '@/utils/db'
import { useEffect, useRef } from 'react'

export function useLearningRecordSaver(state: TypingState) {
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
          await saveLearningRecord(state)
        } catch (e) {
          console.error('Failed to save learning record:', e)
        }
      }

      saveRecord()
    }
  }, [state.uiState.isFinished, state.uiState.isSavingRecord, saveLearningRecord, state])
}

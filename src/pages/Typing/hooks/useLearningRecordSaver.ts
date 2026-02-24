import type { TypingState } from '../store/types'
import { useSaveLearningRecord } from '@/utils/db'
import { useMixPanelLearningLogUploader } from '@/utils/mixpanel'
import { useEffect, useRef } from 'react'

export function useLearningRecordSaver(state: TypingState) {
  const learningLogUploader = useMixPanelLearningLogUploader(state)
  const saveLearningRecord = useSaveLearningRecord()
  // 用 ref 记录是否已触发保存，防止 isFinished 后任意 state 变化导致重复保存
  const hasSavedRef = useRef(false)

  useEffect(() => {
    // isFinished 从 false 变为 true 时重置标记
    if (!state.uiState.isFinished) {
      hasSavedRef.current = false
      return
    }

    if (state.uiState.isFinished && !state.uiState.isSavingRecord && !hasSavedRef.current) {
      hasSavedRef.current = true
      learningLogUploader()
      saveLearningRecord(state)

      window.exportDatabase2UTools()
      window.migrateLocalStorageToUtools()
    }
  }, [state.uiState.isFinished, state.uiState.isSavingRecord, learningLogUploader, saveLearningRecord, state])
}

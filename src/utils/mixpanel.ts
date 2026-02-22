import type { TypingState } from '@/pages/Typing/store'
import {
  currentDictInfoAtom,
  phoneticConfigAtom,
  pronunciationConfigAtom,
  randomConfigAtom,
} from '@/store'
import type { InfoPanelType } from '@/typings'
import type { PronunciationType } from '@/typings'
import { useAtomValue } from 'jotai'
import mixpanel from 'mixpanel-browser'
import { useCallback } from 'react'

export type starAction = 'star' | 'dismiss'

export function recordStarAction(action: starAction) {
  const props = {
    action,
  }
  mixpanel.track('star', props)
}

export type openInfoPanelLocation = 'footer' | 'resultScreen'
export function recordOpenInfoPanelAction(type: InfoPanelType, location: openInfoPanelLocation) {
  const props = {
    type,
    location,
  }
  mixpanel.track('openInfoPanel', props)
}

export type shareType = 'open' | 'download'
export function recordShareAction(type: shareType) {
  mixpanel.track('share', { type })
}

export type analysisType = 'open'
export function recordAnalysisAction(type: analysisType) {
  const props = {
    type,
  }

  mixpanel.track('analysis', props)
}

export type ModeInfo = {
  modeDictation: boolean
  modeDark: boolean
  modeShuffle: boolean

  enabledPhotonicsSymbol: boolean

  pronunciationAuto: boolean
  pronunciationOption: PronunciationType | 'none'
}

export type WordLogUpload = ModeInfo & {
  headword: string
  timeStart: string
  timeEnd: string
  countInput: number
  countCorrect: number
  countTypo: number
  order: number
  wordlist: string
}

export type LearningLogUpload = ModeInfo & {
  wordlist: string
  timeEnd: string
  duration: number
  countInput: number
  countCorrect: number
  countTypo: number
}

export function useMixPanelWordLogUploader(typingState: TypingState) {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const randomConfig = useAtomValue(randomConfigAtom)

  const wordLogUploader = useCallback(
    (wordLog: { headword: string; timeStart: string; timeEnd: string; countInput: number; countCorrect: number; countTypo: number }) => {
      if (!currentDictInfo) return
      const props: WordLogUpload = {
        ...wordLog,
        order: typingState.wordListData.index + 1,
        wordlist: currentDictInfo.name,
        modeDictation: false,
        modeDark: true,
        modeShuffle: randomConfig.isOpen,
        enabledPhotonicsSymbol: phoneticConfig.isOpen,
        pronunciationAuto: pronunciationConfig.isOpen,
        pronunciationOption: pronunciationConfig.isOpen === false ? 'none' : pronunciationConfig.type,
      }
      mixpanel.track('Word', props)
    },
    [
      typingState,
      currentDictInfo,
      phoneticConfig.isOpen,
      pronunciationConfig.isOpen,
      pronunciationConfig.type,
      randomConfig.isOpen,
    ],
  )

  return wordLogUploader
}

export function useMixPanelLearningLogUploader(typingState: TypingState) {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const randomConfig = useAtomValue(randomConfigAtom)

  const learningLogUploader = useCallback(() => {
    if (!currentDictInfo) return
    const props: LearningLogUpload = {
      timeEnd: getUtcStringForMixpanel(),
      duration: typingState.statsData.timerData.time,
      countInput: typingState.statsData.correctCount + typingState.statsData.wrongCount,
      countTypo: typingState.statsData.wrongCount,
      countCorrect: typingState.statsData.correctCount,
      wordlist: currentDictInfo.name,
      modeDictation: false,
      modeDark: true,
      modeShuffle: randomConfig.isOpen,
      enabledPhotonicsSymbol: phoneticConfig.isOpen,
      pronunciationAuto: pronunciationConfig.isOpen,
      pronunciationOption: pronunciationConfig.isOpen === false ? 'none' : pronunciationConfig.type,
    }
    mixpanel.track('Learning', props)
  }, [
    typingState,
    currentDictInfo,
    phoneticConfig.isOpen,
    pronunciationConfig.isOpen,
    pronunciationConfig.type,
    randomConfig.isOpen,
  ])
  return learningLogUploader
}

export function recordDataAction({
  type,
  size,
  wordCount,
  learningCount,
}: {
  type: 'export' | 'import'
  size: number
  wordCount: number
  learningCount: number
}) {
  const props = {
    type,
    size,
    wordCount,
    learningCount,
  }

  mixpanel.track('dataAction', props)
}

export function getUtcStringForMixpanel() {
  const now = new Date()
  const isoString = now.toISOString()
  const utcString = isoString.substring(0, 19).replace('T', ' ')

  return utcString
}

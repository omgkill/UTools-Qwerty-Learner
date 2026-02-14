import atomForConfig from './atomForConfig'
import { DISMISS_START_CARD_DATE_KEY } from '@/constants'
import type {
  Dictionary,
  InfoPanelState,
  PhoneticType,
  PronunciationType,
} from '@/typings'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const dictionariesAtom = atom<Dictionary[]>([])

export const idDictionaryMapAtom = atom<Record<string, Dictionary>>((get) => {
  const dictionaries = get(dictionariesAtom)
  return Object.fromEntries(dictionaries.map((dict) => [dict.id, dict]))
})

export const currentDictIdAtom = atomWithStorage('currentDict', '')
export const currentDictInfoAtom = atom<Dictionary | null>((get) => {
  const id = get(currentDictIdAtom)
  if (!id) return null
  const map = get(idDictionaryMapAtom)
  return map[id] || null
})

export const currentChapterAtom = atomWithStorage('currentChapter', 0)

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'us' as PronunciationType,
  name: '美音',
  isTransRead: false,
  transVolume: 1,
  rate: 1,
})
export const pronunciationIsOpenAtom = atom((get) => get(pronunciationConfigAtom).isOpen)

export const pronunciationIsTransReadAtom = atom((get) => get(pronunciationConfigAtom).isTransRead)

export const randomConfigAtom = atomForConfig('randomConfig', {
  isOpen: false,
})

export const isShowPrevAndNextWordAtom = atomWithStorage('isShowPrevAndNextWord', true)

export const isIgnoreCaseAtom = atomWithStorage('isIgnoreCase', true)

export const isShowAnswerOnHoverAtom = atomWithStorage('isShowAnswerOnHover', true)

export const isTextSelectableAtom = atomWithStorage('isTextSelectable', false)

export const phoneticConfigAtom = atomForConfig('phoneticConfig', {
  isOpen: true,
  type: 'us' as PhoneticType,
})

export const isShowSkipAtom = atom(false)

export const isInDevModeAtom = atom(false)

export const infoPanelStateAtom = atom<InfoPanelState>({
  donate: false,
  vsc: false,
  community: false,
  redBook: false,
})

export const wordDictationConfigAtom = atomForConfig('wordDictationConfig', {
  isOpen: false,
})

export const dismissStartCardDateAtom = atomWithStorage<Date | null>(DISMISS_START_CARD_DATE_KEY, null)

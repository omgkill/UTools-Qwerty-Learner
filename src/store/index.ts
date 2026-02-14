import atomForConfig from './atomForConfig'
import { DISMISS_START_CARD_DATE_KEY } from '@/constants'
import type {
  WordBank,
  InfoPanelState,
  PhoneticType,
  PronunciationType,
} from '@/typings'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const wordBanksAtom = atom<WordBank[]>([])

export const idWordBankMapAtom = atom<Record<string, WordBank>>((get) => {
  const wordBanks = get(wordBanksAtom)
  return Object.fromEntries(wordBanks.map((wb) => [wb.id, wb]))
})

export const currentWordBankIdAtom = atomWithStorage('currentWordBank', '')
export const currentWordBankAtom = atom<WordBank | null>((get) => {
  const id = get(currentWordBankIdAtom)
  if (!id) return null
  const map = get(idWordBankMapAtom)
  return map[id] || null
})

export const currentChapterAtom = atomWithStorage('currentChapter', 0)

export const dictionariesAtom = wordBanksAtom
export const idDictionaryMapAtom = idWordBankMapAtom
export const currentDictIdAtom = currentWordBankIdAtom
export const currentDictInfoAtom = currentWordBankAtom

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'uk' as PronunciationType,
  name: '英音',
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
  type: 'uk' as PhoneticType,
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

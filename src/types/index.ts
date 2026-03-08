export * from './resource'
export * from './dict'
export * from './storage'
export * from './learning'

export type PronunciationType = 'us' | 'uk'
export type PhoneticType = 'us' | 'uk'
export type LanguageType = 'en' | 'romaji' | 'code'
export type LanguageCategoryType = 'en' | 'custom'

type Pronunciation2PhoneticMap = Record<PronunciationType, PhoneticType>

export const PRONUNCIATION_PHONETIC_MAP: Pronunciation2PhoneticMap = {
  us: 'us',
  uk: 'uk',
}

export type Word = {
  name: string
  trans: string[]
  usphone: string
  ukphone: string
  notation?: string
  tense?: string
}

export type InfoPanelType = 'donate' | 'vsc' | 'community' | 'redBook'

export type InfoPanelState = {
  [key in InfoPanelType]: boolean
}

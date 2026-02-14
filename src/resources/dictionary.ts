import type { WordBank, WordBankResource } from '@/typings/index'
import { calcChapterCount } from '@/utils'

export const wordBankResources: WordBankResource[] = []

export const builtinWordBanks: WordBank[] = wordBankResources.map((resource) => ({
  ...resource,
  chapterCount: calcChapterCount(resource.length),
}))

export const dictionaryResources = wordBankResources
export const builtinDictionaries = builtinWordBanks

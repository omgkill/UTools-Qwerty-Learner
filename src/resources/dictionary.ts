import type { Dictionary, DictionaryResource } from '@/typings/index'
import { calcChapterCount } from '@/utils'

export const dictionaryResources: DictionaryResource[] = []

export const builtinDictionaries: Dictionary[] = dictionaryResources.map((resource) => ({
  ...resource,
  chapterCount: calcChapterCount(resource.length),
}))

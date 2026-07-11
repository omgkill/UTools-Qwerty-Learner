import { DictionaryService } from '@/features/dictionary/application'
import { utoolsDictionaryAdapterFactory, utoolsDictionaryConfigRepository } from '@/infra/repositories/dictionary.repository.utools'

export const dictService = new DictionaryService({
  configRepository: utoolsDictionaryConfigRepository,
  adapterFactory: utoolsDictionaryAdapterFactory,
})

export type { DictMeta, DictType, WordInfo } from '@/features/dictionary/domain'

import type { MdxDictItem } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export function listMdxDicts(repository: MdxDictionaryRepository): MdxDictItem[] {
  return repository.listDicts()
}

import type { MdxDictItem } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export function updateMdxDictOrder(repository: MdxDictionaryRepository, dicts: MdxDictItem[]): MdxDictItem[] {
  return repository.updateDictOrder(dicts)
}

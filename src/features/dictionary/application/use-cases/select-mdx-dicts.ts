import type { MdxDictItem } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export function selectMdxDicts(repository: MdxDictionaryRepository): MdxDictItem[] | null {
  return repository.selectDictFiles()
}

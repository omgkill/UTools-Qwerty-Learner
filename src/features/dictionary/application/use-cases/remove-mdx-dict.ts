import type { MdxDictItem } from '../../domain'
import type { MdxDictionaryRepository } from '../ports'

export function removeMdxDict(repository: MdxDictionaryRepository, path: string): MdxDictItem[] {
  return repository.removeDict(path)
}

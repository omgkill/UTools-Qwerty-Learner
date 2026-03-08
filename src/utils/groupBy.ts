import type { WordBank } from '@/types'

export default function groupBy<T>(elements: T[], iteratee: (value: T) => string) {
  return elements.reduce<Record<string, T[]>>((result, value) => {
    const key = iteratee(value)
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      result[key].push(value)
    } else {
      result[key] = [value]
    }
    return result
  }, {})
}

export function groupByDictTags(wordBanks: WordBank[]) {
  return wordBanks.reduce<Record<string, WordBank[]>>((result, wb) => {
    const uniqueTags = [...new Set(wb.tags)]
    uniqueTags.forEach((tag) => {
      if (Object.prototype.hasOwnProperty.call(result, tag)) {
        result[tag].push(wb)
      } else {
        result[tag] = [wb]
      }
    })
    return result
  }, {})
}

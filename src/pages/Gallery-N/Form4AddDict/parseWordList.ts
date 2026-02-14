import type { Word } from '@/typings'

export type ParsedWordList = {
  words: Word[]
  rawCount: number
}

export function parseWordList(text: string): ParsedWordList {
  const words = text
    .split(/[\t\s,;\n\r]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)

  const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))]

  return {
    rawCount: words.length,
    words: uniqueWords.map((word) => ({
      name: word,
      trans: [],
      usphone: '',
      ukphone: '',
    })),
  }
}

export function parseWordListFile(file: File): Promise<ParsedWordList> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseWordList(text)
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsText(file, 'utf-8')
  })
}

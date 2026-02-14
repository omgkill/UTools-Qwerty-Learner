import type { Word } from '@/typings'

export function parseWordList(text: string): Word[] {
  const words = text
    .split(/[\t\s,;\n\r]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)

  const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))]

  return uniqueWords.map((word) => ({
    name: word,
    trans: [],
    usphone: '',
    ukphone: '',
  }))
}

export function parseWordListFile(file: File): Promise<Word[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const words = parseWordList(text)
        resolve(words)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsText(file, 'utf-8')
  })
}

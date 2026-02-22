import type { DictMeta, WordInfo } from '../types'
import { BaseDictAdapter } from '../BaseDictAdapter'

export class MdxDictAdapter extends BaseDictAdapter {
  type = 'mdx' as const
  private _path: string
  private _mdxLookup: ((word: string) => Promise<string[]>) | null = null
  private _mddLookup: ((resource: string) => Promise<Buffer>) | null = null
  private _dictLoader:
    | {
        load: (
          path: string,
        ) => Promise<{
          mdxLookup: (word: string) => Promise<string[]>
          mddLookup: (resource: string) => Promise<Buffer>
        }>
      }
    | null = null

  constructor(id: string, name: string, path: string) {
    super()
    this._id = id
    this._name = name
    this._path = path
  }

  async load(): Promise<void> {
    if (this._loaded) return

    if (typeof window !== 'undefined') {
      const loader = (window as unknown as { dictMdxLoader?: typeof this._dictLoader }).dictMdxLoader
      if (loader) {
        this._dictLoader = loader
      }
    }

    if (this._dictLoader) {
      const result = await this._dictLoader.load(this._path)
      this._mdxLookup = result.mdxLookup
      this._mddLookup = result.mddLookup
    }

    this._loaded = true
  }

  async query(word: string): Promise<WordInfo | null> {
    if (!this._loaded) {
      await this.load()
    }

    if (!this._mdxLookup) return null

    let result = ''
    try {
      const definitions = await this._mdxLookup(word)
      if (Array.isArray(definitions) && definitions.length > 0) {
        result = definitions.join('\n<hr>\n')
      }
    } catch (e: unknown) {
      if (typeof e === 'string' && e.includes('NOT FOUND')) {
        return null
      }
      if (e instanceof Error && e.message.includes('NOT FOUND')) {
        return null
      }
      throw e
    }

    if (!result) return null

    if (this._mddLookup) {
      try {
        result = await this._replaceResources(result, this._mddLookup)
      } catch (e) {
        console.error('Resource replacement failed', e)
      }
    }

    const phonetics = this._extractPhonetics(result)
    const translations = this._extractTranslations(result)

    return {
      word: word,
      phonetics: phonetics,
      translations: translations,
      definitions: result,
      source: {
        dictId: this._id,
        dictName: this._name,
        dictType: 'mdx',
      },
    }
  }

  getMeta(): DictMeta {
    return {
      id: this._id,
      name: this._name,
      type: 'mdx',
      path: this._path,
      enabled: true,
      order: 0,
    }
  }

  private _extractPhonetics(html: string): { us?: string; uk?: string } {
    const phonetics: { us?: string; uk?: string } = {}

    const usPatterns = [
      /US\s*[:：]?\s*\[([^\]]+)\]/i,
      /AmE\s*[:：]?\s*\[([^\]]+)\]/i,
      /美\s*[:：]?\s*\[([^\]]+)\]/,
      /DJ\s*[:：]?\s*[/]([^/]+)[/]/i,
    ]

    const ukPatterns = [
      /UK\s*[:：]?\s*\[([^\]]+)\]/i,
      /BrE\s*[:：]?\s*\[([^\]]+)\]/i,
      /英\s*[:：]?\s*\[([^\]]+)\]/,
      /KK\s*[:：]?\s*[/]([^/]+)[/]/i,
    ]

    for (const pattern of usPatterns) {
      const match = html.match(pattern)
      if (match) {
        phonetics.us = match[1].trim()
        break
      }
    }

    for (const pattern of ukPatterns) {
      const match = html.match(pattern)
      if (match) {
        phonetics.uk = match[1].trim()
        break
      }
    }

    return phonetics
  }

  private _extractTranslations(html: string): string[] {
    const translations: string[] = []

    const textContent = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const lines = textContent.split(/[；;\n]/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && trimmed.length > 1 && trimmed.length < 200) {
        if (/[\u4e00-\u9fa5]/.test(trimmed)) {
          translations.push(trimmed)
        }
      }
    }

    return translations.slice(0, 5)
  }

  private async _replaceResources(
    html: string,
    mddLookup: (resource: string) => Promise<Buffer>
  ): Promise<string> {
    if (!html) return html

    const regex = /(src|href)=["']([^"']+)["']/g
    const matches: { full: string; attr: string; val: string }[] = []
    let match

    while ((match = regex.exec(html)) !== null) {
      matches.push({ full: match[0], attr: match[1], val: match[2] })
    }

    if (matches.length === 0) return html

    const replacements = new Map<string, string>()
    const uniqueVals = [...new Set(matches.map((m) => m.val))]

    await Promise.all(
      uniqueVals.map(async (val) => {
        if (
          val.startsWith('entry://') ||
          val.startsWith('http') ||
          val.startsWith('https') ||
          val.startsWith('data:')
        ) {
          return
        }

        try {
          const buffer = await mddLookup(val)
          if (buffer) {
            const base64 = Buffer.from(buffer).toString('base64')
            const mime = this._getMimeType(val)
            replacements.set(val, `data:${mime};base64,${base64}`)
          }
        } catch (e) {
          // Resource not found is normal, ignore
        }
      })
    )

    return html.replace(regex, (match, attr, val) => {
      if (replacements.has(val)) {
        return `${attr}="${replacements.get(val)}"`
      }
      return match
    })
  }

  private _getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      css: 'text/css',
      js: 'text/javascript',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }
}

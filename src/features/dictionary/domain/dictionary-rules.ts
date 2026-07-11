import type { CustomDictEntry, DictMeta, DictionaryConfig, MdxQueryResult } from './types'

export function normalizeQueryWord(word: string): string {
  return (word || '').trim().toLowerCase()
}

export function normalizeRawQueryWord(word: string): string {
  return (word || '').trim()
}

export function normalizeDictionaryConfig(config: unknown): DictionaryConfig {
  if (!config || typeof config !== 'object' || !('dicts' in config)) {
    return { dicts: [] }
  }

  const dicts = (config as { dicts?: unknown }).dicts
  return { dicts: Array.isArray(dicts) ? (dicts as DictMeta[]) : [] }
}

export function getEnabledDicts(dicts: DictMeta[]): DictMeta[] {
  return dicts.filter((dict) => dict.enabled !== false).sort((a, b) => a.order - b.order)
}

export function getTargetDicts(dicts: DictMeta[], dictIds?: string[]): DictMeta[] {
  if (dictIds && dictIds.length > 0) {
    return dicts.filter((dict) => dictIds.includes(dict.id)).sort((a, b) => a.order - b.order)
  }

  return getEnabledDicts(dicts)
}

export function createMdxDictMeta(filePath: string, order: number): DictMeta {
  return {
    id: `mdx-${Buffer.from(filePath).toString('base64')}`,
    name:
      filePath
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.mdx$/i, '') || 'MDX Dict',
    type: 'mdx',
    path: filePath,
    enabled: true,
    order,
  }
}

export function createCustomDictMeta(params: { name: string; entries: CustomDictEntry[]; id: string; order: number }): DictMeta {
  return {
    id: params.id,
    name: params.name.trim(),
    type: 'custom',
    wordCount: params.entries.length,
    enabled: true,
    order: params.order,
  }
}

export function buildExpandedState(results: MdxQueryResult[], collapseFirstResult: boolean): Record<string, boolean> {
  const expanded: Record<string, boolean> = {}

  for (const result of results) {
    if (result.ok && result.content) {
      expanded[result.dictPath] = true
    }
  }

  if (collapseFirstResult && results.length > 0) {
    const firstResult = results[0]
    if (firstResult.ok && firstResult.content) {
      expanded[firstResult.dictPath] = false
    }
  }

  return expanded
}

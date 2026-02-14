import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

interface MdxResult {
  dictPath: string
  dictName: string
  ok: boolean
  content?: string
  error?: string
}

interface DictItem {
  path: string
  name: string
}

declare global {
  interface Window {
    queryMdxWord: (word: string) => Promise<MdxResult[]>
    getMdxDictConfig: () => DictItem[]
    selectMdxFiles: () => DictItem[] | null
    removeMdxDict: (filePath: string) => DictItem[]
    updateMdxDictOrder: (dicts: DictItem[]) => DictItem[]
    getMode: () => string
    services: {
      queryWord: (word: string) => Promise<MdxResult[]>
      getDictList: () => DictItem[]
      selectDictFiles: () => DictItem[] | null
      removeDict: (filePath: string) => DictItem[]
      updateDictOrder: (dicts: DictItem[]) => DictItem[]
    }
  }
}

export default function MdxQueryPage() {
  const [word, setWord] = useState('')
  const [results, setResults] = useState<MdxResult[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [dicts, setDicts] = useState<DictItem[]>([])

  useEffect(() => {
    const mode = window.getMode?.()
    if (mode === 'mdx-query') {
      const handleModeChange = (e: CustomEvent) => {
        const action = (e as any).detail
        if (action?.payload) {
          setWord(String(action.payload))
          handleSearch(String(action.payload))
        }
      }
      window.addEventListener('utools-mode-change', handleModeChange as EventListener)
      return () => {
        window.removeEventListener('utools-mode-change', handleModeChange as EventListener)
      }
    }
  }, [])

  useEffect(() => {
    loadDicts()
  }, [])

  const loadDicts = useCallback(() => {
    try {
      const config = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      setDicts(config)
    } catch (e) {
      console.error('getMdxDictConfig error', e)
    }
  }, [])

  const handleSearch = useCallback(async (searchWord?: string) => {
    const w = (searchWord || word).trim()
    if (!w) return
    setLoading(true)
    try {
      const res = await window.queryMdxWord?.(w) || await window.services?.queryWord?.(w) || []
      setResults(res)
      const exp: Record<string, boolean> = {}
      for (const r of res) {
        if (r.ok && r.content) {
          exp[r.dictPath] = true
        }
      }
      setExpanded(exp)
    } catch (e) {
      console.error('queryMdxWord error', e)
      toast.error('查询失败')
    } finally {
      setLoading(false)
    }
  }, [word])

  const toggleExpand = useCallback((dictPath: string) => {
    setExpanded(prev => ({ ...prev, [dictPath]: !prev[dictPath] }))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  if (dicts.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-8 text-gray-300">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-xl font-medium mb-2">还没有添加词典</h2>
        <p className="text-gray-500 mb-4">请先在 uTools 中输入"管理词典"添加 MDX 词典</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900 p-4">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入要查询的单词..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">查询中...</div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.dictPath}
                className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden"
              >
                <div
                  className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-gray-700"
                  onClick={() => toggleExpand(item.dictPath)}
                >
                  <span className="text-indigo-400">{expanded[item.dictPath] ? '▼' : '▶'}</span>
                  <span className="font-medium text-gray-200">{item.dictName}</span>
                  {!item.ok && <span className="text-xs text-red-400 ml-2">{item.error || '未找到'}</span>}
                </div>
                {expanded[item.dictPath] && item.content && (
                  <div className="border-t border-gray-700 px-4 py-3">
                    <div
                      className="prose prose-invert prose-sm max-w-none text-gray-300"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : word && !loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">未找到结果</div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            输入单词开始查询
          </div>
        )}
      </div>
    </div>
  )
}

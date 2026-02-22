import { useCallback, useEffect, useState } from 'react'
import './index.css'

const log = (msg: string) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  const line = `[${timestamp}] [MdxQuery] ${msg}`
  console.log(line)
  ;(window as any).debugLog?.(`[MdxQuery] ${msg}`)
}

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
    getMode: () => string
    getAction: () => { code: string; payload?: string } | null
    services: {
      queryWord: (word: string) => Promise<MdxResult[]>
      getDictList: () => DictItem[]
    }
  }
}

export default function MdxQueryPage() {
  const [loading, setLoading] = useState(true)
  const [dicts, setDicts] = useState<DictItem[]>([])
  const [results, setResults] = useState<MdxResult[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  log(`render: loading=${loading}, dicts.length=${dicts.length}, results.length=${results.length}`)

  const loadDicts = useCallback(() => {
    log('loadDicts called')
    try {
      const config = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      log(`loadDicts: found ${config.length} dicts`)
      setDicts(config)
    } catch (e) {
      console.error('getDictList error', e)
    }
  }, [])

  const handleSearch = useCallback(async (word: string) => {
    const w = word.trim()
    log(`handleSearch: word="${w}"`)
    if (!w) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await window.queryMdxWord?.(w) || await window.services?.queryWord?.(w) || []
      log(`handleSearch: got ${res.length} results`)
      setResults(res)
      const exp: Record<string, boolean> = {}
      for (const r of res) {
        if (r.ok && r.content) {
          exp[r.dictPath] = true
        }
      }
      setExpanded(exp)
    } catch (e) {
      console.error('queryWord error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleExpand = useCallback((dictPath: string) => {
    setExpanded(prev => ({ ...prev, [dictPath]: !prev[dictPath] }))
  }, [])

  useEffect(() => {
    log('useEffect: loadDicts')
    loadDicts()
  }, [loadDicts])

  useEffect(() => {
    log('useEffect: setup mode change listener for search')
    
    const handleModeChange = (e: CustomEvent) => {
      const action = e.detail
      log(`handleModeChange: action.payload=${action?.payload}`)
      if (action?.payload) {
        const inputWord = String(action.payload).trim()
        if (inputWord) {
          handleSearch(inputWord)
        }
      }
    }
    window.addEventListener('utools-mode-change', handleModeChange as EventListener)

    const action = window.getAction?.()
    log(`useEffect: getAction() = ${JSON.stringify(action)}`)
    if (action?.payload) {
      const inputWord = String(action.payload).trim()
      if (inputWord) {
        handleSearch(inputWord)
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }

    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange as EventListener)
    }
  }, [handleSearch])

  if (loading) {
    return (
      <div className="mdict-page">
        <div className="loading">查询中...</div>
      </div>
    )
  }

  if (results.length > 0) {
    return (
      <div className="mdict-page">
        <div className="result-list">
          {results.map((item) => (
            <div key={item.dictPath} className="result-item">
              <div className="result-header" onClick={() => toggleExpand(item.dictPath)}>
                <span className="collapse-icon">{expanded[item.dictPath] ? '▼' : '▶'}</span>
                <span className="dict-name">{item.dictName}</span>
              </div>
              {expanded[item.dictPath] && (
                <div className="result-body">
                  {item.ok && item.content ? (
                    <div className="result-content" dangerouslySetInnerHTML={{ __html: item.content }} />
                  ) : item.error ? (
                    <div className="error-text">{item.error}</div>
                  ) : (
                    <div className="empty-text">未查到结果</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (dicts.length === 0) {
    return (
      <div className="mdict-page">
        <div className="no-result">还没有添加词典，请先在 uTools 中输入&quot;管理词典&quot;添加 MDX 词典</div>
      </div>
    )
  }

  return (
    <div className="mdict-page">
      <div className="no-result">未查到结果</div>
    </div>
  )
}

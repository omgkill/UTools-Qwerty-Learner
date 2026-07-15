import './index.css'
import { useMdxDicts, useMdxQuery } from '@/features/dictionary/presentation/hooks'
import { hotkeyConfigAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate, useParams } from 'react-router-dom'

const log = (msg: string) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  const line = `[${timestamp}] [MdxQuery] ${msg}`
  console.log(line)
  ;(window as unknown as { debugLog?: (message: string) => void }).debugLog?.(`[MdxQuery] ${msg}`)
}

export default function MdxQueryPage() {
  const { word: routeWord } = useParams<{ word?: string }>()
  const navigate = useNavigate()
  const hotkeyConfig = useAtomValue(hotkeyConfigAtom)
  const pageRef = useRef<HTMLDivElement>(null)

  const isFromRoute = Boolean(routeWord)
  const { dicts } = useMdxDicts()
  const { loading, results, expanded, toggleExpand } = useMdxQuery({
    routeWord,
    collapseFirstResult: isFromRoute,
    log,
  })

  log(`render: loading=${loading}, dicts.length=${dicts.length}, results.length=${results.length}, routeWord=${routeWord}`)

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    if (!loading && pageRef.current) {
      pageRef.current.focus()
    }
  }, [loading])

  useHotkeys(
    hotkeyConfig.goBack,
    () => {
      if (isFromRoute) {
        handleBack()
      }
    },
    { preventDefault: true },
    [isFromRoute, handleBack],
  )

  const renderBackButton = () => (
    <button onClick={handleBack} className="back-btn" title={`返回（${hotkeyConfig.goBack.toUpperCase()}）`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  )

  const renderHeader = () => {
    if (!isFromRoute) return null
    return <div className="mdict-header">{renderBackButton()}</div>
  }

  if (loading) {
    return (
      <div ref={pageRef} tabIndex={0} className="mdict-page outline-none">
        {renderHeader()}
        <div className="loading">查询中...</div>
      </div>
    )
  }

  if (results.length > 0) {
    return (
      <div ref={pageRef} tabIndex={0} className="mdict-page outline-none">
        {renderHeader()}
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
      <div ref={pageRef} tabIndex={0} className="mdict-page outline-none">
        {renderHeader()}
        <div className="no-result">还没有添加词典，请先在 uTools 中输入&ldquo;管理词典&rdquo;添加 MDX 词典</div>
      </div>
    )
  }

  return (
    <div ref={pageRef} tabIndex={0} className="mdict-page outline-none">
      {renderHeader()}
      <div className="no-result">未查到结果</div>
    </div>
  )
}

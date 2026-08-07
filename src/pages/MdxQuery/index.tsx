import './index.css'
import { useMdxDicts, useMdxQuery } from '@/features/dictionary/presentation/hooks'
import { hotkeyConfigAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate, useParams } from 'react-router-dom'

const log = (msg: string) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  const line = `[${timestamp}] [MdxQuery] ${msg}`
  console.log(line)
  ;(window as unknown as { debugLog?: (message: string) => void }).debugLog?.(`[MdxQuery] ${msg}`)
}

// 词典 HTML 按白纸设计：浅色背景 + 深色文字。渲染后统一适配深色主题：
// 浅背景 → 深灰 #1f2937；背景已统一为深色，字体统一白色保证对比度。
// 词典里 font[color] 等带 !important 的规则（index.css）保留特殊颜色。
const parseRgb = (value: string): [number, number, number] | null => {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

// 亮度 ≥120（约 #777 及更亮）都算浅色背景，统一改深灰，避免漏掉浅灰白底
const isLightBackground = (rgb: [number, number, number] | null): boolean => {
  if (!rgb) return false
  const [r, g, b] = rgb
  return 0.299 * r + 0.587 * g + 0.114 * b >= 120
}

const adaptDictContentToDark = (root: HTMLElement | null) => {
  if (!root) return
  const elements = Array.from(root.querySelectorAll<HTMLElement>('.result-content *'))
  for (const el of elements) {
    const computed = window.getComputedStyle(el)
    if (isLightBackground(parseRgb(computed.backgroundColor))) {
      // 用 !important 内联样式，压过词典内嵌样式里可能存在的 !important
      el.style.setProperty('background-color', '#1f2937', 'important')
    }
    el.style.color = '#ffffff'
  }
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

  // 在绘制前适配词典内容，避免白块闪烁；结果或展开状态变化时重新适配
  useLayoutEffect(() => {
    adaptDictContentToDark(pageRef.current)
  }, [results, expanded])

  // 连续查询时组件不会卸载，.mdict-page / .result-list 作为滚动容器会被 React 复用，
  // 上次查询的滚动位置会残留 —— 新查询开始或新结果渲染前重置回顶部
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return
    page.scrollTo(0, 0)
    page.querySelector<HTMLElement>('.result-list')?.scrollTo(0, 0)
  }, [loading, results])

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

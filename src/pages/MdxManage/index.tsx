import { useCallback, useEffect, useRef, useState } from 'react'
import './index.css'

interface DictItem {
  path: string
  name: string
}

declare global {
  interface Window {
    getMdxDictConfig: () => DictItem[]
    selectMdxFiles: () => DictItem[] | null
    removeMdxDict: (filePath: string) => DictItem[]
    updateMdxDictOrder: (dicts: DictItem[]) => DictItem[]
    services: {
      getDictList: () => DictItem[]
      selectDictFiles: () => DictItem[] | null
      removeDict: (filePath: string) => DictItem[]
      updateDictOrder: (dicts: DictItem[]) => DictItem[]
    }
  }
}

export default function MdxManagePage() {
  const [dicts, setDicts] = useState<DictItem[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const prevPositions = useRef<Map<string, DOMRect>>(new Map())

  const loadDicts = useCallback(() => {
    try {
      const config = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      setDicts(config)
    } catch (e) {
      console.error('getDictList error', e)
    }
  }, [])

  useEffect(() => {
    loadDicts()
  }, [loadDicts])

  const recordPositions = useCallback(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('.dict-item')
    items.forEach((item) => {
      const path = item.getAttribute('data-path')
      if (path) {
        prevPositions.current.set(path, item.getBoundingClientRect())
      }
    })
  }, [])

  const playFlipAnimation = useCallback(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('.dict-item')

    items.forEach((item) => {
      const path = item.getAttribute('data-path')
      if (!path) return

      const prevRect = prevPositions.current.get(path)
      if (!prevRect) return

      const currentRect = item.getBoundingClientRect()
      const deltaY = prevRect.top - currentRect.top

      if (deltaY !== 0) {
        (item as HTMLElement).style.transform = `translateY(${deltaY}px)`
        ;(item as HTMLElement).style.transition = 'none'

        requestAnimationFrame(() => {
          ;(item as HTMLElement).style.transition = 'transform 0.3s ease'
          ;(item as HTMLElement).style.transform = 'translateY(0)'
        })
      }
    })

    prevPositions.current.clear()
  }, [])

  const handleAddDict = useCallback(() => {
    try {
      const res = window.selectMdxFiles?.() || window.services?.selectDictFiles?.()
      if (res) {
        setDicts(res)
      }
    } catch (e) {
      console.error('selectDictFiles error', e)
    }
  }, [])

  const saveOrder = useCallback((newDicts: DictItem[]) => {
    try {
      const res = window.updateMdxDictOrder?.(newDicts) || window.services?.updateDictOrder?.(newDicts)
      if (res) setDicts(res)
    } catch (e) {
      console.error('updateDictOrder error', e)
    }
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    recordPositions()
    const arr = [...dicts]
    const tmp = arr[index - 1]
    arr[index - 1] = arr[index]
    arr[index] = tmp
    setDicts(arr)
    saveOrder(arr)
    requestAnimationFrame(() => {
      playFlipAnimation()
    })
  }, [dicts, saveOrder, recordPositions, playFlipAnimation])

  const moveDown = useCallback((index: number) => {
    if (index >= dicts.length - 1) return
    recordPositions()
    const arr = [...dicts]
    const tmp = arr[index + 1]
    arr[index + 1] = arr[index]
    arr[index] = tmp
    setDicts(arr)
    saveOrder(arr)
    requestAnimationFrame(() => {
      playFlipAnimation()
    })
  }, [dicts, saveOrder, recordPositions, playFlipAnimation])

  const handleRemove = useCallback((path: string) => {
    try {
      const res = window.removeMdxDict?.(path) || window.services?.removeDict?.(path)
      if (res) setDicts(res)
    } catch (e) {
      console.error('removeDict error', e)
    }
  }, [])

  return (
    <div className="dict-manage">
      <div className="header">
        <h1>词典管理</h1>
        <p className="subtitle">管理 MDX 词典顺序，查词时将按此顺序依次展示结果</p>
      </div>

      <div className="info-card">
        <div className="info-icon">ℹ️</div>
        <div className="info-text">
          <strong>自动加载资源文件</strong>
          <p>添加 MDX 词典时，会自动加载同目录下同名的 MDD 文件（图片、音频等资源）</p>
        </div>
      </div>

      <div className="toolbar">
        <button className="add-btn" onClick={handleAddDict}>
          <span className="btn-icon">+</span>
          添加词典
        </button>
      </div>

      {dicts.length > 0 ? (
        <div className="dict-list" ref={listRef}>
          {dicts.map((item, index) => (
            <div key={item.path} data-path={item.path} className="dict-item">
              <div className="dict-number">{index + 1}</div>
              <div className="dict-main">
                <div className="dict-name">{item.name}</div>
                <div className="dict-path">{item.path}</div>
              </div>
              <div className="dict-actions">
                <button
                  className="action-btn"
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                  title="上移"
                >
                  ↑
                </button>
                <button
                  className="action-btn"
                  disabled={index === dicts.length - 1}
                  onClick={() => moveDown(index)}
                  title="下移"
                >
                  ↓
                </button>
                <button
                  className="action-btn danger"
                  onClick={() => handleRemove(item.path)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <p>还没有添加任何词典</p>
          <p className="empty-hint">点击上方"添加词典"按钮开始使用</p>
        </div>
      )}
    </div>
  )
}

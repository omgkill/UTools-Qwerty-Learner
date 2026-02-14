import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

interface DictItem {
  id: string
  name: string
  path: string
  enabled: boolean
  order: number
}

declare global {
  interface Window {
    getMdxDictConfig: () => DictItem[]
    selectMdxFiles: () => DictItem[] | null
    removeMdxDict: (id: string) => boolean
    updateMdxDictOrder: (dicts: DictItem[]) => void
  }
}

export default function MdxManagePage() {
  const [dicts, setDicts] = useState<DictItem[]>([])

  useEffect(() => {
    loadDicts()
  }, [])

  const loadDicts = useCallback(() => {
    try {
      const config = window.getMdxDictConfig?.() || []
      setDicts(config)
    } catch (e) {
      console.error('getMdxDictConfig error', e)
    }
  }, [])

  const handleAddDict = useCallback(() => {
    try {
      const res = window.selectMdxFiles?.()
      if (res) {
        setDicts(res)
        toast.success('词典添加成功')
      }
    } catch (e) {
      console.error('selectMdxFiles error', e)
      toast.error('添加词典失败')
    }
  }, [])

  const handleRemove = useCallback((id: string) => {
    try {
      window.removeMdxDict?.(id)
      setDicts(prev => prev.filter(d => d.id !== id))
      toast.success('词典已删除')
    } catch (e) {
      console.error('removeMdxDict error', e)
      toast.error('删除失败')
    }
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    const arr = [...dicts]
    const tmp = arr[index - 1]
    arr[index - 1] = arr[index]
    arr[index] = tmp
    setDicts(arr)
    window.updateMdxDictOrder?.(arr)
  }, [dicts])

  const moveDown = useCallback((index: number) => {
    if (index >= dicts.length - 1) return
    const arr = [...dicts]
    const tmp = arr[index + 1]
    arr[index + 1] = arr[index]
    arr[index] = tmp
    setDicts(arr)
    window.updateMdxDictOrder?.(arr)
  }, [dicts])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">词典管理</h1>
          <p className="mt-1 text-gray-400">管理 MDX 词典，查词时将按顺序依次查询</p>
        </div>

        <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-medium text-indigo-300">自动加载资源文件</p>
              <p className="mt-1 text-sm text-gray-400">
                添加 MDX 词典时，会自动加载同目录下同名的 MDD 文件（图片、音频等资源）
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAddDict}
          className="mb-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          <span>+</span>
          添加词典
        </button>

        {dicts.length > 0 ? (
          <div className="space-y-3">
            {dicts.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-medium text-indigo-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="truncate text-sm text-gray-500">{item.path}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded border border-gray-600 px-2 py-1 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === dicts.length - 1}
                    className="rounded border border-gray-600 px-2 py-1 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="rounded border border-red-500/30 px-2 py-1 text-red-400 hover:bg-red-500/10"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-400">还没有添加任何词典</p>
            <p className="mt-1 text-sm text-gray-500">点击上方"添加词典"按钮开始使用</p>
          </div>
        )}
      </div>
    </div>
  )
}

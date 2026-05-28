import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WordBank } from '@/types'

export default function GalleryPage() {
  const navigate = useNavigate()
  const [wordBanks, setWordBanks] = useState<WordBank[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const config = window.readLocalWordBankConfig()
    const customWordBanks = config.filter((wb: WordBank) => wb.id && wb.id.startsWith('x-dict-'))
    setWordBanks(customWordBanks)
    setIsLoading(false)
  }, [])

  const handleImport = async () => {
    // 在 Web 环境使用文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const words = JSON.parse(text)

        // 验证词库格式
        if (!Array.isArray(words) || words.length === 0) {
          alert('词库格式错误：需要是包含单词的数组')
          return
        }

        // 生成词库 ID
        const id = `x-dict-${Date.now()}`
        const name = file.name.replace('.json', '')

        // 创建词库元数据
        const wordBankMeta: WordBank = {
          id,
          name,
          description: `自定义词库: ${name}`,
          category: 'custom',
          tags: ['custom'],
          url: '',
          length: words.length,
          language: 'en',
          languageCategory: 'custom',
          chapterCount: 1,
        }

        // 保存词库内容
        window.newLocalWordBankFromJson(words, wordBankMeta)

        // 更新列表
        setWordBanks((prev) => [...prev, wordBankMeta])
      } catch (err) {
        console.error('导入失败:', err)
        alert('导入失败：' + (err as Error).message)
      }
    }
    input.click()
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此词库？')) return

    window.delLocalWordBank(id)
    setWordBanks((prev) => prev.filter((wb) => wb.id !== id))
  }

  const handleSelect = (id: string) => {
    // 设置当前词库
    localStorage.setItem('currentWordBank', id)
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">词库管理</h1>

        {/* 导入按钮 */}
        <button
          onClick={handleImport}
          className="mb-6 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          导入词库 (JSON)
        </button>

        {/* 词库列表 */}
        {wordBanks.length === 0 ? (
          <div className="text-gray-400">
            <p>暂无词库，请导入 JSON 词库文件</p>
            <p className="mt-2 text-sm">
              词库格式: [{`{ name: "word", trans: ["翻译"], usphone: "音标", ukphone: "音标" }`}]
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {wordBanks.map((wb) => (
              <div
                key={wb.id}
                className="flex items-center justify-between rounded-lg bg-gray-800 p-4"
              >
                <div>
                  <div className="font-medium">{wb.name}</div>
                  <div className="text-sm text-gray-400">
                    {wb.length} 词 · {wb.description}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(wb.id)}
                    className="rounded bg-indigo-600 px-3 py-1 text-sm hover:bg-indigo-700"
                  >
                    学习
                  </button>
                  <button
                    onClick={() => handleDelete(wb.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
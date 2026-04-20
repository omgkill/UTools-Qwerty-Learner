import type { Page } from '@playwright/test'

/**
 * uTools Mock 工具
 *
 * 用于E2E测试中模拟uTools环境，确保应用能在测试环境正常运行
 */

const STORAGE_KEY = 'qwerty-learner-db'
const WORD_BANK_CONFIG_KEY = 'local-wordbank-config'

/**
 * 注入 uTools mock 到页面中
 * 使用 addInitScript 确保在页面加载前注入
 */
export async function setupUtoolsMock(page: Page) {
  await page.addInitScript(() => {
    const STORAGE_KEY = 'qwerty-learner-db'
    const WORD_BANK_CONFIG_KEY = 'local-wordbank-config'

    function loadDb() {
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : {}
      } catch (e) {
        return {}
      }
    }

    function saveDb(db: Record<string, any>) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
      } catch (e) {}
    }

    function generateRev() {
      return Math.random().toString(36).substr(2, 9)
    }

    // 创建完整的 utools mock
    // 设置标记，防止 preload.js 重复注入默认 Mock
    ;(window as any)._e2eMockInjected = true
    ;(window as any).utools = {
      isDev: () => true,
      getFeatures: () => [],
      setFeature: () => {},
      removeFeature: () => {},
      fetchUserPayments: () => Promise.resolve([]),
      db: {
        get: (id: string) => {
          const db = loadDb()
          const doc = db[id]
          if (!doc) return null
          return JSON.parse(JSON.stringify(doc))
        },
        put: (doc: any) => {
          const db = loadDb()
          const existing = db[doc._id]
          const newDoc = {
            _id: doc._id,
            _rev: existing ? existing._rev : generateRev(),
            data: doc.data,
          }
          db[doc._id] = newDoc
          saveDb(db)
          return { ok: true, id: doc._id, rev: newDoc._rev }
        },
        remove: (id: string) => {
          const db = loadDb()
          if (db[id]) {
            delete db[id]
            saveDb(db)
            return { ok: true, id }
          }
          return { ok: false, id }
        },
        allDocs: () => {
          const db = loadDb()
          return Object.values(db).map((doc) => JSON.parse(JSON.stringify(doc)))
        },
      },
    }

    // 添加 readLocalWordBankConfig 等函数（来自 preload.js）
    ;(window as any).readLocalWordBankConfig = () => {
      const doc = (window as any).utools.db.get(WORD_BANK_CONFIG_KEY)
      return doc ? doc.data : []
    }

    ;(window as any).writeLocalWordBankConfig = (config: any) => {
      const doc = (window as any).utools.db.get(WORD_BANK_CONFIG_KEY)
      ;(window as any).utools.db.put({
        _id: WORD_BANK_CONFIG_KEY,
        data: config,
        _rev: doc ? doc._rev : undefined,
      })
    }

    ;(window as any).readLocalWordBank = (id: string) => {
      const doc = (window as any).utools.db.get(id)
      return doc ? doc.data : []
    }

    ;(window as any).newLocalWordBankFromJson = (jsonData: any, wordBankMeta: any) => {
      const contentDoc = (window as any).utools.db.get(wordBankMeta.id)
      ;(window as any).utools.db.put({
        _id: wordBankMeta.id,
        data: jsonData,
        _rev: contentDoc ? contentDoc._rev : undefined,
      })

      const config = (window as any).readLocalWordBankConfig()
      const existingIndex = config.findIndex((d: any) => d.id === wordBankMeta.id)

      if (existingIndex >= 0) {
        config[existingIndex] = wordBankMeta
      } else {
        config.push(wordBankMeta)
      }

      ;(window as any).writeLocalWordBankConfig(config)
    }

    // 设置默认模式
    ;(window as any).getMode = () => 'typing'
    ;(window as any).getAction = () => ({ code: 'typing' })

    console.log('[E2E] utools mock injected via addInitScript')
  })
}

/**
 * 创建测试词典
 */
export async function createTestDictionary(
  page: Page,
  dictName: string,
  words: Array<{ name: string; trans: string }>
): Promise<string> {
  return await page.evaluate(
    ({ dictName, words, STORAGE_KEY }) => {
      const uuid = 'test-' + Date.now()
      const dictId = 'x-dict-' + uuid

      const wordBankMeta = {
        id: dictId,
        name: dictName,
        url: `/dicts/${uuid}.json`,
        language: 'en',
        description: 'E2E测试词库',
        category: '自定义',
        tags: ['Default'],
        length: words.length,
        chapterCount: Math.ceil(words.length / 20),
        languageCategory: 'custom',
      }

      const wordList = words.map((w) => ({
        name: w.name,
        trans: Array.isArray(w.trans) ? w.trans : [w.trans],
        usphone: '',
        ukphone: '',
      }))

      let db: Record<string, any> = {}
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) db = JSON.parse(data)
      } catch (e) {}

      // 保存词库内容
      db[dictId] = {
        _id: dictId,
        _rev: Math.random().toString(36).substr(2, 9),
        data: wordList,
      }

      // 保存词库配置
      const CONFIG_KEY = 'local-wordbank-config'
      let config: any[] = []
      try {
        const configDoc = db[CONFIG_KEY]
        if (configDoc?.data) config = configDoc.data
      } catch (e) {}

      config.push(wordBankMeta)

      db[CONFIG_KEY] = {
        _id: CONFIG_KEY,
        _rev: Math.random().toString(36).substr(2, 9),
        data: config,
      }

      // 保存当前词库选择
      db['currentWordBank'] = {
        _id: 'currentWordBank',
        _rev: Math.random().toString(36).substr(2, 9),
        data: dictId,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))

      console.log('Created dictionary:', dictName, 'with', words.length, 'words')
      return dictId
    },
    { dictName, words, STORAGE_KEY }
  )
}

/**
 * 设置单词进度
 */
export async function setWordProgress(
  page: Page,
  dictId: string,
  word: string,
  masteryLevel: number,
  nextReviewTime?: number
) {
  await page.evaluate(
    ({ dictId, wordName, level, nextReview, STORAGE_KEY }) => {
      let db: Record<string, any> = {}
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) db = JSON.parse(data)
      } catch (e) {}

      const key = `progress:${dictId}:${wordName}`

      db[key] = {
        _id: key,
        _rev: Math.random().toString(36).substr(2, 9),
        data: {
          word: wordName,
          dict: dictId,
          masteryLevel: level,
          nextReviewTime: nextReview ?? (level > 0 ? Date.now() - 1000 : 0),
        },
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    },
    { dictId, wordName: word, level: masteryLevel, nextReview: nextReviewTime, STORAGE_KEY }
  )
}

/**
 * 清除所有测试数据
 */
export async function clearAllData(page: Page) {
  try {
    await page.evaluate((STORAGE_KEY) => {
      try {
        localStorage.setItem(STORAGE_KEY, '{}')
        const keysToKeep = [STORAGE_KEY]
        const allKeys = Object.keys(localStorage)
        for (const key of allKeys) {
          if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key)
          }
        }
      } catch (e) {
        // localStorage may not be accessible during navigation
        console.log('clearAllData: localStorage not accessible')
      }
    }, STORAGE_KEY)
  } catch (e) {
    // page.evaluate may fail if page is not ready
    console.log('clearAllData: page not ready')
  }
}

/**
 * 输入单词
 */
export async function typeWord(page: Page, word: string) {
  // 只输入字母，跳过非字母字符
  const letters = word.toLowerCase().replace(/[^a-z]/g, '')

  // 先等待输入框准备好
  await page.waitForTimeout(300)

  for (const letter of letters) {
    await page.keyboard.press(letter)
    await page.waitForTimeout(100)
  }

  // 等待单词完成（检查是否显示下一个单词或学习完成）
  await page.waitForTimeout(500)

  // 检查是否有完成提示
  const hasFinished = await page.locator('text=学习完成').isVisible().catch(() => false)
  if (hasFinished) {
    console.log('学习已完成')
  }
}

/**
 * 获取当前显示的单词名称
 */
export async function getCurrentWordName(page: Page): Promise<string | null> {
  const wordNameElement = page.locator('[data-testid="word-name"]')
  const isVisible = await wordNameElement.isVisible().catch(() => false)
  if (isVisible) {
    return await wordNameElement.textContent()
  }
  // 如果隐藏元素不可见，尝试从 word-component 获取第一个单词
  const wordComponent = page.locator('[data-testid="word-component"]')
  const text = await wordComponent.textContent().catch(() => null)
  if (!text) return null
  // 提取纯英文单词部分（去掉中文释义和按钮文本）
  const match = text.match(/^[a-zA-Z]+/)
  return match ? match[0] : null
}

/**
 * 创建测试词典并立即设置为当前词典
 */
export async function createAndSelectDictionary(
  page: Page,
  dictName: string,
  words: Array<{ name: string; trans: string }>
): Promise<string> {
  const dictId = await createTestDictionary(page, dictName, words)
  await setCurrentDictionary(page, dictId)
  return dictId
}

/**
 * 导航到学习页面（确保词典已选择）
 */
export async function navigateToLearningPage(page: Page) {
  // 等待页面导航完成
  await page.waitForURL(/\/#\/?$/, { timeout: 10000 }).catch(() => {
    // 如果不在首页，强制导航
    page.goto('/').catch(() => {})
  })

  // 等待学习页面元素出现
  await page.waitForSelector('[data-testid="word-component"], text=掌握, text=学习完成', { timeout: 15000 }).catch(async () => {
    // 如果没有出现学习页面元素，尝试刷新
    await page.reload()
    await page.waitForSelector('[data-testid="word-component"], text=掌握, text=学习完成', { timeout: 15000 })
  })
}

/**
 * 等待页面准备就绪
 * 用于确保页面加载完成，包括 React 应用挂载和初始化
 */
export async function waitForPageReady(page: Page) {
  // 等待页面基本加载
  await page.waitForLoadState('domcontentloaded')

  // 等待 React 应用初始化完成 - 检查 Loading 组件消失
  // 应用在初始化时会显示 Loading，初始化完成后显示实际内容
  await page.waitForFunction(
    () => {
      // 检查应用是否已初始化（不再是 Loading 状态）
      const root = document.getElementById('root')
      if (!root) return false

      // 检查是否有实际内容（不是只有 Loading）
      const hasLoading = root.querySelector('.loading') !== null || root.textContent?.includes('加载') || root.children.length === 0
      const hasContent = root.querySelector('main') !== null ||
        root.querySelector('header') !== null ||
        root.querySelector('[data-testid="word-component"]') !== null ||
        root.querySelector('[data-testid="learning-page-layout"]') !== null ||
        root.textContent?.includes('自定义词库') ||
        root.textContent?.includes('掌握') ||
        root.textContent?.includes('学习完成')

      return hasContent && !hasLoading
    },
    { timeout: 15000 }
  ).catch(async () => {
    // 如果超时，等待一下再继续
    await page.waitForTimeout(1000)
  })
}

/**
 * 设置当前词典
 */
export async function setCurrentDictionary(page: Page, dictId: string) {
  await page.evaluate(
    ({ dictId, STORAGE_KEY }) => {
      let db: Record<string, any> = {}
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) db = JSON.parse(data)
      } catch (e) {}

      db['currentWordBank'] = {
        _id: 'currentWordBank',
        _rev: Math.random().toString(36).substr(2, 9),
        data: dictId,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    },
    { dictId, STORAGE_KEY }
  )
}
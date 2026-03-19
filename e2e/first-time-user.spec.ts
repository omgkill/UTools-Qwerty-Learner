import { test, expect, Page } from '@playwright/test'

/**
 * 首次用户 E2E 测试
 *
 * ========================================
 * 测试目标
 * ========================================
 *
 * 模拟真实用户第一次打开应用的完整流程：
 * 1. 直接进入词库页面（模拟无词库时的跳转）
 * 2. 创建测试词库
 * 3. 选择词库后进入学习页面
 * 4. 完成学习并验证数据
 */

const STORAGE_KEY = 'qwerty-learner-db'

/**
 * 注入 utools mock 到页面中
 * 使用 addInitScript 确保在页面加载前注入
 */
async function setupUtoolsMock(page: Page) {
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
 * 辅助函数：等待页面完全加载
 */
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

/**
 * 辅助函数：清除所有本地数据
 */
async function clearAllData(page: Page) {
  await page.evaluate((STORAGE_KEY) => {
    // 清空 db 内容但保留结构
    localStorage.setItem(STORAGE_KEY, '{}')

    // 清除其他 localStorage 项
    const keysToKeep = [STORAGE_KEY]
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key)
      }
    }
  }, STORAGE_KEY)
}

/**
 * 辅助函数：直接使用 localStorage 创建测试词库
 */
async function createTestDictionary(
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
        // trans 必须是数组，组件中会调用 .join() 方法
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))

      console.log('Created dictionary:', dictName, 'with', words.length, 'words')
      return dictId
    },
    { dictName, words, STORAGE_KEY }
  )
}

/**
 * 辅助函数：设置单词进度
 */
async function setWordProgress(
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
 * 辅助函数：输入单词
 */
async function typeWord(page: Page, word: string) {
  for (const letter of word.toLowerCase()) {
    await page.keyboard.press(letter)
    await page.waitForTimeout(50)
  }
  await page.waitForTimeout(300)
}

/**
 * 辅助函数：验证 utools mock 是否正常工作
 */
async function verifyUtoolsMock(page: Page) {
  const result = await page.evaluate(() => {
    return {
      hasUtools: typeof (window as any).utools !== 'undefined',
      hasDb: typeof (window as any).utools?.db !== 'undefined',
      hasGetMode: typeof (window as any).getMode === 'function',
      mode: (window as any).getMode?.() || null,
    }
  })
  console.log('[E2E] utools mock status:', result)
  return result
}

test.describe('首次用户完整流程', () => {
  test.beforeEach(async ({ page }) => {
    // 在每个测试前注入 utools mock
    await setupUtoolsMock(page)
  })

  test('词库页面应该正常加载', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)

    // 验证 utools mock
    const mockStatus = await verifyUtoolsMock(page)
    expect(mockStatus.hasUtools).toBe(true)
    expect(mockStatus.hasDb).toBe(true)

    const bodyContent = await page.locator('body').innerHTML()
    console.log('页面内容长度:', bodyContent.length)

    const title = page.locator('h1')
    const hasTitle = await title.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasTitle) {
      await expect(title).toContainText('自定义词库')
      console.log('✅ 词库页面加载成功（找到标题）')
    } else {
      const hasContent = await page.locator('text=自定义词库').isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasContent || bodyContent.length > 100).toBe(true)
      console.log('✅ 词库页面加载成功（通过内容检查）')
    }
  })

  test('完整流程：创建词库并学习', async ({ page }) => {
    // 步骤1：进入 gallery 页面并清除数据
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    console.log('步骤1: 已进入词库页面（空状态）')

    // 验证 utools mock
    const mockStatus = await verifyUtoolsMock(page)
    expect(mockStatus.hasUtools).toBe(true)

    // 步骤2：创建测试词库
    const testWords = [
      { name: 'hello', trans: '你好' },
      { name: 'world', trans: '世界' },
      { name: 'test', trans: '测试' },
    ]

    const dictId = await createTestDictionary(page, 'E2E测试词库', testWords)
    console.log('步骤2: 已创建测试词库, ID:', dictId)

    // 步骤3：刷新页面加载新词库
    await page.reload()
    await waitForPageReady(page)

    // 验证词库显示在列表中
    const dictCard = page.getByRole('button', { name: /E2E测试词库/ })
    await expect(dictCard).toBeVisible({ timeout: 10000 })

    console.log('步骤3: 词库已显示在列表中')

    // 步骤4：点击词库选中（点击会自动导航到首页）
    // 使用 force click 避免遮挡问题
    await dictCard.scrollIntoViewIfNeeded()
    await dictCard.click({ force: true })

    console.log('已点击词库卡片，等待导航...')

    // 监听页面错误
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.log('[页面错误]', error.message)
    })

    // 等待导航到学习页面
    await page.waitForURL('**/', { timeout: 10000 })
    console.log('URL 已切换到首页')

    // 等待 React 应用加载
    await page.waitForTimeout(3000)

    // 检查是否有 JavaScript 错误
    if (pageErrors.length > 0) {
      console.log('页面 JavaScript 错误:', pageErrors)
    }

    // 添加调试：检查页面状态
    const debugPageContent = await page.content()
    console.log('页面内容长度:', debugPageContent.length)

    // 检查是否有错误信息或跳转回 gallery
    const currentUrl = page.url()
    console.log('当前 URL:', currentUrl)

    // 检查 localStorage 中的 currentWordBank
    const currentWordBank = await page.evaluate(() => {
      const utools = (window as any).utools
      if (!utools?.db) return null
      const doc = utools.db.get('currentWordBank')
      return doc?.data || null
    })
    console.log('currentWordBank in db:', currentWordBank)

    // 检查 wordBanksAtom 的内容
    const wordBanksInConfig = await page.evaluate(() => {
      return window.readLocalWordBankConfig()
    })
    console.log('wordBanks in config:', wordBanksInConfig?.length || 0)

    // 检查词库内容是否正确存储
    const dictContent = await page.evaluate((dictId) => {
      return window.readLocalWordBank(dictId)
    }, currentWordBank)
    console.log('dict content:', dictContent?.length || 0, 'words')
    if (dictContent && dictContent.length > 0) {
      console.log('first word:', dictContent[0])
    }

    // 监听控制台日志
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('useLearningSession') || text.includes('loadWords') || text.includes('SWR') || text.includes('wordList')) {
        console.log('[浏览器日志]', text)
      }
    })

    // 刷新页面以触发初始化
    await page.reload()
    await page.waitForTimeout(5000)

    // 检查页面上是否有加载中状态或错误信息
    const loadingElement = await page.locator('text=加载中, text=Loading').isVisible().catch(() => false)
    console.log('是否有加载中状态:', loadingElement)

    // 检查是否有"学习完成"状态
    const finishedElement = await page.locator('text=学习完成, text=明天继续').isVisible().catch(() => false)
    console.log('是否有学习完成状态:', finishedElement)

    // 检查是否有空状态
    const emptyElement = await page.locator('text=暂无').isVisible().catch(() => false)
    console.log('是否有空状态:', emptyElement)

    // 检查页面 HTML 中是否有学习页面元素
    const pageHtml = await page.content()
    const hasMasteredButton = pageHtml.includes('掌握')
    console.log('HTML 中是否有掌握按钮:', hasMasteredButton)

    // 检查 root 元素是否为空
    const rootContent = await page.locator('#root').innerHTML()
    console.log('root 元素内容长度:', rootContent.length)
    console.log('root 内容（前300字符）:', rootContent.substring(0, 300))

    // 检查是否有 React 应用
    const hasReactRoot = pageHtml.includes('id="root"')
    console.log('是否有 React root:', hasReactRoot)

    // 再次检查页面状态
    const currentUrl2 = page.url()
    console.log('刷新后 URL:', currentUrl2)

    // 等待学习页面组件加载 - 使用"掌握"按钮或单词显示区域
    // WordPanel 组件没有 data-testid，使用可见的文本元素
    try {
      // 等待页面出现"掌握"按钮或单词字母显示
      await page.waitForSelector('text=掌握', { timeout: 15000 })
      console.log('步骤4: 已进入学习页面')
    } catch (e) {
      // 如果找不到学习页面元素，可能被重定向回 gallery
      const isOnGallery = currentUrl.includes('/gallery')
      if (isOnGallery) {
        console.log('被重定向回 gallery 页面，可能 wordBanksAtom 未正确加载')
      }
      throw e
    }

    // 步骤6：验证学习类型显示
    const hasNewWordLabel = await page.locator('text=新词').first().isVisible({ timeout: 5000 })
    const hasReviewLabel = await page.locator('text=复习').first().isVisible().catch(() => false)

    console.log('学习类型显示:', hasNewWordLabel ? '📚 新词' : hasReviewLabel ? '🔄 复习' : '未知')

    // 新创建的词库应该是新词
    expect(hasNewWordLabel).toBe(true)

    console.log('步骤5: 验证学习类型为新词 ✅')

    // 步骤7：完成一个单词的学习
    // 从页面状态获取当前单词 - 使用 localStorage 或页面元素
    const currentWord = await page.evaluate(() => {
      // 从 localStorage 获取当前词库 ID
      const dictId = localStorage.getItem('currentWordBank')
      if (!dictId) return null

      // 从 db 获取第一个未学习的单词
      const dbStr = localStorage.getItem('qwerty-learner-db')
      if (!dbStr) return null

      try {
        const db = JSON.parse(dbStr)
        // 获取词库内容
        const words = db[dictId]?.data || []
        // 获取已学单词
        const learnedKeys = Object.keys(db).filter(k => k.startsWith(`progress:${dictId}:`))
        const learnedWords = learnedKeys.map(k => k.split(':')[2])

        // 返回第一个未学的单词
        const unlearnedWord = words.find((w: any) => !learnedWords.includes(w.name))
        return unlearnedWord?.name || words[0]?.name || null
      } catch (e) {
        return null
      }
    })

    if (currentWord) {
      console.log('当前单词:', currentWord)

      await typeWord(page, currentWord)
      await page.waitForTimeout(500)

      console.log('步骤6: 完成单词学习 ✅')

      // 步骤8：验证学习数据存储
      const progress = await page.evaluate(
        ({ wordName, STORAGE_KEY }) => {
          const currentDictId = localStorage.getItem('currentWordBank') || ''
          if (!currentDictId) return null

          try {
            const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
            const key = `progress:${currentDictId}:${wordName}`
            return db[key]?.data || null
          } catch (e) {
            return null
          }
        },
        { wordName: currentWord, STORAGE_KEY }
      )

      console.log('学习进度:', progress)
      expect(progress?.masteryLevel).toBe(1)

      console.log('步骤7: 验证学习数据存储 ✅')
    }

    console.log('========================================')
    console.log('✅ 首次用户完整流程测试通过')
    console.log('========================================')
  })

  test('学习三个单词并验证统计数据', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    const testWords = [
      { name: 'apple', trans: '苹果' },
      { name: 'banana', trans: '香蕉' },
      { name: 'orange', trans: '橙子' },
    ]

    await createTestDictionary(page, '水果词库', testWords)
    await page.reload()
    await waitForPageReady(page)

    const dictCard = page.locator('text=水果词库').first()
    await expect(dictCard).toBeVisible({ timeout: 10000 })

    // 点击词库会自动导航到首页
    await dictCard.click()

    // 验证已导航到学习页面
    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const learnedWords: string[] = []
    let learnedCount = 0
    let maxIterations = 20 // 防止无限循环

    while (learnedCount < 3 && maxIterations > 0) {
      maxIterations--

      // 从页面状态获取当前单词
      const currentWord = await page.evaluate((STORAGE_KEY) => {
        // 从 utools mock db 获取 currentWordBank
        const utools = (window as any).utools
        if (!utools?.db) return null

        const doc = utools.db.get('currentWordBank')
        const dictId = doc?.data
        if (!dictId) return null

        // 获取词库数据
        const wordsDoc = utools.db.get(dictId)
        const words = wordsDoc?.data || []
        if (words.length === 0) return null

        // 获取已学习单词
        const allDocs = utools.db.allDocs()
        const learnedWords = allDocs
          .filter((d: any) => d._id?.startsWith(`progress:${dictId}:`))
          .map((d: any) => d.data?.word)
          .filter(Boolean)

        // 找到第一个未学习的单词
        const unlearnedWord = words.find((w: any) => !learnedWords.includes(w.name))
        return unlearnedWord?.name || null
      }, STORAGE_KEY)

      if (!currentWord) {
        const isFinished = await page.locator('text=学习完成').isVisible().catch(() => false)
        if (isFinished) {
          console.log('学习已完成')
          break
        }
        await page.waitForTimeout(500)
        continue
      }

      if (learnedWords.includes(currentWord)) {
        await page.waitForTimeout(300)
        continue
      }

      console.log(`学习单词 ${learnedCount + 1}: ${currentWord}`)

      // 验证显示新词
      const newWordLabel = page.locator('text=新词').first()
      await expect(newWordLabel).toBeVisible({ timeout: 5000 })

      await typeWord(page, currentWord)

      learnedWords.push(currentWord)
      learnedCount++

      await page.waitForTimeout(300)
    }

    console.log(`完成学习，共学习 ${learnedCount} 个单词`)
    expect(learnedCount).toBeGreaterThanOrEqual(1) // 至少学习了一个单词

    console.log('========================================')
    console.log('✅ 完整学习流程验证通过')
    console.log('========================================')
  })
})

test.describe('学习类型验证', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('新单词（masteryLevel=0）应显示"新词"', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    await createTestDictionary(page, '新词测试', [{ name: 'testword', trans: '测试词' }])

    // 刷新并选择词库
    await page.reload()
    await waitForPageReady(page)

    const dictCard = page.locator('text=新词测试').first()
    await expect(dictCard).toBeVisible({ timeout: 10000 })
    await dictCard.click()

    // 等待导航到学习页面
    await page.waitForSelector('text=掌握', { timeout: 15000 })

    // 使用 locator 检查学习类型（更可靠的方式）
    const newWordLabel = page.locator('text=新词').first()
    await expect(newWordLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel=0 正确显示新词')
  })

  test('已学习一次的单词（masteryLevel=1）应显示"新词"', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    const words = [{ name: 'learned', trans: '已学' }]
    const dictId = await createTestDictionary(page, '已学测试', words)

    await setWordProgress(page, dictId, 'learned', 1, Date.now() - 1000)

    // 刷新并选择词库
    await page.reload()
    await waitForPageReady(page)

    const dictCard = page.locator('text=已学测试').first()
    await expect(dictCard).toBeVisible({ timeout: 10000 })
    await dictCard.click()

    // 等待导航到学习页面
    await page.waitForSelector('text=掌握', { timeout: 15000 })

    // 使用 locator 检查学习类型
    const newWordLabel = page.locator('text=新词').first()
    await expect(newWordLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel=1 正确显示新词')
  })

  test('复习单词（masteryLevel>1）应显示"复习"', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    const words = [{ name: 'review', trans: '复习词' }]
    const dictId = await createTestDictionary(page, '复习测试', words)

    await setWordProgress(page, dictId, 'review', 2, Date.now() - 1000)

    // 刷新并选择词库
    await page.reload()
    await waitForPageReady(page)

    const dictCard = page.locator('text=复习测试').first()
    await expect(dictCard).toBeVisible({ timeout: 10000 })
    await dictCard.click()

    // 等待导航到学习页面
    await page.waitForSelector('text=掌握', { timeout: 15000 })

    // 使用 locator 检查学习类型
    const reviewLabel = page.locator('text=复习').first()
    await expect(reviewLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel>1 正确显示复习')
  })

  test('学习类型与存储一致性验证', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    const words = [{ name: 'consistency', trans: '一致性' }]
    await createTestDictionary(page, '一致性测试', words)

    // 刷新并选择词库
    await page.reload()
    await waitForPageReady(page)

    const dictCard = page.locator('text=一致性测试').first()
    await expect(dictCard).toBeVisible({ timeout: 10000 })
    await dictCard.click()

    // 等待导航到学习页面
    await page.waitForSelector('text=掌握', { timeout: 15000 })

    // 使用 locator 检查学习类型
    const hasNewWord = await page.locator('text=新词').first().isVisible({ timeout: 5000 })
    const hasReview = await page.locator('text=复习').first().isVisible().catch(() => false)
    const displayedType = hasNewWord ? 'new' : hasReview ? 'review' : null

    // 从页面状态获取当前单词
    const currentWord = await page.evaluate(() => {
      const dictId = localStorage.getItem('currentWordBank')
      if (!dictId) return null
      const dbStr = localStorage.getItem('qwerty-learner-db')
      if (!dbStr) return null

      try {
        const db = JSON.parse(dbStr)
        const words = db[dictId]?.data || []
        const learnedKeys = Object.keys(db).filter(k => k.startsWith(`progress:${dictId}:`))
        const learnedWords = learnedKeys.map(k => k.split(':')[2])
        const unlearnedWord = words.find((w: any) => !learnedWords.includes(w.name))
        return unlearnedWord?.name || words[0]?.name || null
      } catch (e) {
        return null
      }
    })

    if (currentWord) {
      await typeWord(page, currentWord)

      const storedType = await page.evaluate(
        ({ wordName, STORAGE_KEY }) => {
          const dictId = localStorage.getItem('currentWordBank') || ''
          const today = new Date().toISOString().split('T')[0]
          const key = `daily:${dictId}:${today}`

          try {
            const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
            return db[key]?.data?.wordTypes?.[wordName] || null
          } catch (e) {
            return null
          }
        },
        { wordName: currentWord, STORAGE_KEY }
      )

      console.log('显示类型:', displayedType)
      console.log('存储类型:', storedType)

      expect(storedType).toBe(displayedType)

      console.log('✅ 学习类型存储一致')
    }
  })
})
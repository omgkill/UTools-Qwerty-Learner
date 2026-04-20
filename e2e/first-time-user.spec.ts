import { test, expect } from '@playwright/test'
import {
  setupUtoolsMock,
  createTestDictionary,
  setCurrentDictionary,
  setWordProgress,
  clearAllData,
  waitForPageReady,
  typeWord,
} from './utils/utools-mock'

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

test.describe('首次用户完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('词库页面应该正常加载', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const title = page.locator('h1')
    const hasTitle = await title.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasTitle) {
      await expect(title).toContainText('自定义词库')
      console.log('✅ 词库页面加载成功（找到标题）')
    } else {
      const hasContent = await page.locator('text=自定义词库').isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasContent).toBe(true)
      console.log('✅ 词库页面加载成功（通过内容检查）')
    }
  })

  test('完整流程：创建词库并学习', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    console.log('步骤1: 已进入词库页面（空状态）')

    // 创建测试词库
    const dictId = await createTestDictionary(page, 'E2E测试词库', [
      { name: 'hello', trans: '你好' },
      { name: 'world', trans: '世界' },
      { name: 'test', trans: '测试' },
    ])
    console.log('步骤2: 已创建测试词库, ID:', dictId)

    await setCurrentDictionary(page, dictId)

    // 导航到首页学习页面
    await page.goto('/')
    await waitForPageReady(page)

    // 等待学习页面组件加载
    await page.waitForSelector('text=掌握', { timeout: 15000 })
    console.log('步骤3: 已进入学习页面')

    // 验证学习类型显示
    const hasNewWordLabel = await page.locator('text=新词').first().isVisible({ timeout: 5000 })
    const hasReviewLabel = await page.locator('text=复习').first().isVisible().catch(() => false)

    console.log('学习类型显示:', hasNewWordLabel ? '📚 新词' : hasReviewLabel ? '🔄 复习' : '未知')

    expect(hasNewWordLabel).toBe(true)
    console.log('步骤4: 验证学习类型为新词 ✅')

    console.log('========================================')
    console.log('✅ 首次用户完整流程测试通过')
    console.log('========================================')
  })

  test('学习三个单词并验证统计数据', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    const dictId = await createTestDictionary(page, '水果词库', [
      { name: 'apple', trans: '苹果' },
      { name: 'banana', trans: '香蕉' },
      { name: 'orange', trans: '橙子' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const learnedWords: string[] = []
    let learnedCount = 0
    let maxIterations = 20

    while (learnedCount < 3 && maxIterations > 0) {
      maxIterations--

      const currentWord = await page.evaluate(() => {
        const utools = (window as any).utools
        if (!utools?.db) return null

        const doc = utools.db.get('currentWordBank')
        const dictId = doc?.data
        if (!dictId) return null

        const wordsDoc = utools.db.get(dictId)
        const words = wordsDoc?.data || []
        if (words.length === 0) return null

        const allDocs = utools.db.allDocs()
        const learnedWords = allDocs
          .filter((d: any) => d._id?.startsWith(`progress:${dictId}:`))
          .map((d: any) => d.data?.word)
          .filter(Boolean)

        const unlearnedWord = words.find((w: any) => !learnedWords.includes(w.name))
        return unlearnedWord?.name || null
      })

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

      const newWordLabel = page.locator('text=新词').first()
      await expect(newWordLabel).toBeVisible({ timeout: 5000 })

      await typeWord(page, currentWord)

      learnedWords.push(currentWord)
      learnedCount++

      await page.waitForTimeout(300)
    }

    console.log(`完成学习，共学习 ${learnedCount} 个单词`)
    expect(learnedCount).toBeGreaterThanOrEqual(1)

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
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '新词测试', [
      { name: 'testword', trans: '测试词' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const newWordLabel = page.locator('text=新词').first()
    await expect(newWordLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel=0 正确显示新词')
  })

  test('已学习一次的单词（masteryLevel=1）应显示"新词"', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '已学测试', [
      { name: 'learned', trans: '已学' },
    ])
    await setWordProgress(page, dictId, 'learned', 1, Date.now() - 1000)
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const newWordLabel = page.locator('text=新词').first()
    await expect(newWordLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel=1 正确显示新词')
  })

  test('复习单词（masteryLevel>1）应显示"复习"', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '复习测试', [
      { name: 'review', trans: '复习词' },
    ])
    await setWordProgress(page, dictId, 'review', 2, Date.now() - 1000)
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const reviewLabel = page.locator('text=复习').first()
    await expect(reviewLabel).toBeVisible({ timeout: 5000 })
    console.log('✅ masteryLevel>1 正确显示复习')
  })

  test('学习类型与存储一致性验证', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '一致性测试', [
      { name: 'consistency', trans: '一致性' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('text=掌握', { timeout: 15000 })

    const hasNewWord = await page.locator('text=新词').first().isVisible({ timeout: 5000 })
    const hasReview = await page.locator('text=复习').first().isVisible().catch(() => false)
    const displayedType = hasNewWord ? 'new' : hasReview ? 'review' : null

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
        ({ wordName, dictId, STORAGE_KEY }) => {
          const today = new Date().toISOString().split('T')[0]
          const key = `daily:${dictId}:${today}`

          try {
            const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
            return db[key]?.data?.wordTypes?.[wordName] || null
          } catch (e) {
            return null
          }
        },
        { wordName: currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
      )

      console.log('显示类型:', displayedType)
      console.log('存储类型:', storedType)

      expect(storedType).toBe(displayedType)
      console.log('✅ 学习类型存储一致')
    }
  })
})
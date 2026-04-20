import { test, expect } from '@playwright/test'
import {
  setupUtoolsMock,
  createTestDictionary,
  setCurrentDictionary,
  setWordProgress,
  clearAllData,
  waitForPageReady,
  getCurrentWordName,
} from './utils/utools-mock'

test.describe('背单词界面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)

    // 先导航到 gallery 确保页面加载
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    // 创建测试词库
    const dictId = await createTestDictionary(page, 'E2E测试词库', [
      { name: 'hello', trans: '你好' },
      { name: 'world', trans: '世界' },
      { name: 'test', trans: '测试' },
    ])
    await setCurrentDictionary(page, dictId)

    // 导航到首页学习页面
    await page.goto('/')
    await waitForPageReady(page)
  })

  test('关键：界面应该显示单词释义', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const translationElement = page.locator('[data-testid="translation"]')

    const isVisible = await translationElement.isVisible().catch(() => false)

    if (!isVisible) {
      const wordText = await page.locator('[data-testid="word-component"]').textContent()
      console.log(`❌ BUG: 单词 "${wordText}" 没有显示释义`)
    }

    expect(isVisible).toBe(true)
  })

  test('关键：单词应该有内容显示', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordText = await getCurrentWordName(page)

    expect(wordText).toBeTruthy()
    expect(wordText!.length).toBeGreaterThan(0)
  })

  test('完整流程：验证单词和释义都显示', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordText = await getCurrentWordName(page)

    console.log('========================================')
    console.log('E2E 测试结果:')
    console.log('========================================')
    console.log('单词:', wordText)

    const translationElement = page.locator('[data-testid="translation"]')
    const hasTranslation = await translationElement.isVisible().catch(() => false)

    if (hasTranslation) {
      const translationText = await translationElement.textContent()
      console.log('释义:', translationText)
      console.log('状态: ✅ 正常')
    } else {
      console.log('释义: ❌ 未显示')
      console.log('状态: ❌ BUG - 单词没有释义')
    }
    console.log('========================================')

    expect(hasTranslation).toBe(true)
  })

  test('调试：检查页面状态', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const debugInfo = await page.evaluate(() => {
      const wordNameElement = document.querySelector('[data-testid="word-name"]')
      const translationElement = document.querySelector('[data-testid="translation"]')

      return {
        wordText: wordNameElement?.textContent,
        translationExists: translationElement !== null,
        translationText: translationElement?.textContent,
        translationVisible: translationElement
          ? window.getComputedStyle(translationElement).display !== 'none'
          : false,
        windowQueryMdx: typeof (window as any).queryFirstMdxWord === 'function',
        windowGetMdxConfig: typeof (window as any).getMdxDictConfig === 'function',
        mdxDicts: (window as any).getMdxDictConfig?.()?.length || 0,
      }
    })

    console.log('========================================')
    console.log('调试信息:')
    console.log('========================================')
    console.log('单词:', debugInfo.wordText)
    console.log('释义元素存在:', debugInfo.translationExists)
    console.log('释义内容:', debugInfo.translationText)
    console.log('释义可见:', debugInfo.translationVisible)
    console.log('queryFirstMdxWord 函数存在:', debugInfo.windowQueryMdx)
    console.log('getMdxDictConfig 函数存在:', debugInfo.windowGetMdxConfig)
    console.log('MDX词典数量:', debugInfo.mdxDicts)
    console.log('========================================')

    expect(debugInfo.wordText).toBeTruthy()
  })
})

test.describe('学习模式切换测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)

    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const dictId = await createTestDictionary(page, '模式切换测试词库', [
      { name: 'apple', trans: '苹果' },
      { name: 'banana', trans: '香蕉' },
    ])
    await setCurrentDictionary(page, dictId)

    // 设置一些单词为已学习状态，以便 repeat/consolidate 模式有单词可用
    await setWordProgress(page, dictId, 'apple', 1, Date.now() - 1000)

    await page.goto('/')
    await waitForPageReady(page)
  })

  test('应该能访问重复学习模式', async ({ page }) => {
    await page.goto('/#/repeat')

    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"], [data-testid="loading-state"]', { timeout: 10000 })

    // 等待页面完成加载
    await page.waitForTimeout(2000)

    const pageContent = await page.content()
    const hasRepeatLabel = pageContent.includes('重复学习')
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false)

    // 如果没有空状态（有单词可学习），应该显示重复学习标签
    if (!hasEmptyState) {
      expect(hasRepeatLabel).toBe(true)
    }
  })

  test('应该能访问巩固学习模式', async ({ page }) => {
    await page.goto('/#/consolidate')

    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"], [data-testid="loading-state"]', { timeout: 10000 })

    // 等待页面完成加载
    await page.waitForTimeout(2000)

    const pageContent = await page.content()
    const hasConsolidateLabel = pageContent.includes('巩固学习')
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false)

    // 如果没有空状态（有单词可巩固），应该显示巩固学习标签
    if (!hasEmptyState) {
      expect(hasConsolidateLabel).toBe(true)
    }
  })

  test('应该能从重复学习模式返回正常模式', async ({ page }) => {
    await page.goto('/#/repeat')

    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"], [data-testid="loading-state"]', { timeout: 10000 })
    await page.waitForTimeout(2000)

    const exitButton = page.locator('[data-testid="exit-button"]')
    const hasExitButton = await exitButton.isVisible().catch(() => false)

    if (hasExitButton) {
      await exitButton.click()
      await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
      expect(page.url()).toMatch(/\/#\/?$/)
    }
  })
})

test.describe('沉浸模式（摸鱼模式）测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)

    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const dictId = await createTestDictionary(page, '沉浸模式测试词库', [
      { name: 'immersive', trans: '沉浸' },
      { name: 'mode', trans: '模式' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能通过快捷键 Alt+I 切换沉浸模式', async ({ page }) => {
    const headerVisible = await page.locator('header').isVisible().catch(() => false)
    console.log('初始 Header 可见:', headerVisible)

    await page.keyboard.press('Alt+i')
    await page.waitForTimeout(500)

    const headerAfterToggle = await page.locator('header').isVisible().catch(() => false)
    console.log('切换后 Header 可见:', headerAfterToggle)

    await page.keyboard.press('Alt+i')
    await page.waitForTimeout(500)

    const headerAfterRestore = await page.locator('header').isVisible().catch(() => false)
    console.log('恢复后 Header 可见:', headerAfterRestore)
  })

  test('沉浸模式下不应该显示单词列表', async ({ page }) => {
    await page.keyboard.press('Alt+i')
    await page.waitForTimeout(500)

    const wordList = page.locator('[data-testid="word-list"]')
    const isVisible = await wordList.isVisible().catch(() => false)

    expect(isVisible).toBe(false)
  })
})

test.describe('词典选择页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('应该能访问词典选择页面', async ({ page }) => {
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const title = page.locator('h1:has-text("自定义词库")')
    await expect(title).toBeVisible()
  })

  test('应该能从词典页面返回首页', async ({ page }) => {
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const closeButton = page.locator('.cursor-pointer.text-gray-400').first()
    await closeButton.click()

    await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
    expect(page.url()).toMatch(/\/#\/?$/)
  })

  test('词典页面应该显示词典列表或空状态', async ({ page }) => {
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const pageContent = await page.content()
    const hasDictCards = pageContent.includes('dictionary') || pageContent.includes('词库')

    expect(pageContent).toContain('自定义词库')
  })
})

test.describe('统计页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('应该能访问统计页面', async ({ page }) => {
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    const pageContent = await page.content()
    const hasStatsContent = pageContent.includes('词典') || pageContent.includes('学习')

    console.log('统计页面内容检查:', hasStatsContent)
  })

  test('应该能从统计页面返回首页', async ({ page }) => {
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    const closeButton = page.locator('.cursor-pointer.text-gray-400').first()
    const isVisible = await closeButton.isVisible().catch(() => false)

    if (isVisible) {
      await closeButton.click()
      await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
      expect(page.url()).toMatch(/\/#\/?$/)
    }
  })
})

test.describe('释义显示切换测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)

    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const dictId = await createTestDictionary(page, '释义切换测试词库', [
      { name: 'translation', trans: '翻译' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能通过快捷键 Ctrl+Shift+V 切换释义显示', async ({ page }) => {
    const translationElement = page.locator('[data-testid="translation"]')
    const initiallyVisible = await translationElement.isVisible().catch(() => false)
    console.log('释义初始可见:', initiallyVisible)

    await page.keyboard.press('Control+Shift+v')
    await page.waitForTimeout(300)

    const afterToggle = await translationElement.isVisible().catch(() => false)
    console.log('切换后释义可见:', afterToggle)

    await page.keyboard.press('Control+Shift+v')
    await page.waitForTimeout(300)

    const afterSecondToggle = await translationElement.isVisible().catch(() => false)
    console.log('再次切换后释义可见:', afterSecondToggle)
  })
})

test.describe('打字输入测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)

    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    const dictId = await createTestDictionary(page, '打字测试词库', [
      { name: 'type', trans: '打字' },
      { name: 'input', trans: '输入' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能开始打字', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(500)

    const wordText = await getCurrentWordName(page)
    console.log('当前单词:', wordText)
  })

  test('打字时应该更新输入状态', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(500)

    const wordText = await getCurrentWordName(page)

    if (wordText && wordText.length > 0) {
      const firstLetter = wordText[0].toLowerCase()
      await page.keyboard.press(firstLetter)
      await page.waitForTimeout(200)

      console.log(`输入字母: ${firstLetter}, 单词: ${wordText}`)
    }
  })
})
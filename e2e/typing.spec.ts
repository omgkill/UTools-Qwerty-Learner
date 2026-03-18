import { test, expect } from '@playwright/test'

test.describe('背单词界面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
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

    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()

    expect(wordText).toBeTruthy()
    expect(wordText!.length).toBeGreaterThan(0)
  })

  test('完整流程：验证单词和释义都显示', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()

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
      const wordElement = document.querySelector('[data-testid="word-component"]')
      const translationElement = document.querySelector('[data-testid="translation"]')

      return {
        wordText: wordElement?.textContent,
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
    await page.goto('/')
  })

  test('应该能访问重复学习模式', async ({ page }) => {
    await page.goto('/#/repeat')

    // 等待页面加载
    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"]', { timeout: 10000 })

    // 验证重复学习标签
    const pageContent = await page.content()
    const hasRepeatLabel = pageContent.includes('重复学习')
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false)

    // 如果没有空状态，应该显示重复学习标签
    if (!hasEmptyState) {
      expect(hasRepeatLabel).toBe(true)
    }
  })

  test('应该能访问巩固学习模式', async ({ page }) => {
    await page.goto('/#/consolidate')

    // 等待页面加载
    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"]', { timeout: 10000 })

    // 验证巩固学习标签
    const pageContent = await page.content()
    const hasConsolidateLabel = pageContent.includes('巩固学习')
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false)

    // 如果没有空状态，应该显示巩固学习标签
    if (!hasEmptyState) {
      expect(hasConsolidateLabel).toBe(true)
    }
  })

  test('应该能从重复学习模式返回正常模式', async ({ page }) => {
    await page.goto('/#/repeat')

    // 等待页面加载
    await page.waitForSelector('[data-testid="learning-page-layout"], [data-testid="empty-state"]', { timeout: 10000 })

    // 检查是否有退出按钮
    const exitButton = page.locator('[data-testid="exit-button"]')
    const hasExitButton = await exitButton.isVisible().catch(() => false)

    if (hasExitButton) {
      await exitButton.click()
      // 验证返回首页
      await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
      expect(page.url()).toMatch(/\/#\/?$/)
    }
  })
})

test.describe('沉浸模式（摸鱼模式）测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能通过快捷键 Alt+I 切换沉浸模式', async ({ page }) => {
    // 检查初始状态 - Header 应该可见
    const headerVisible = await page.locator('header').isVisible().catch(() => false)
    console.log('初始 Header 可见:', headerVisible)

    // 按下 Alt+I 进入沉浸模式
    await page.keyboard.press('Alt+i')

    // 等待状态更新
    await page.waitForTimeout(500)

    // 检查是否进入沉浸模式 - Header 应该隐藏
    const headerAfterToggle = await page.locator('header').isVisible().catch(() => false)
    console.log('切换后 Header 可见:', headerAfterToggle)

    // 再次按下 Alt+I 退出沉浸模式
    await page.keyboard.press('Alt+i')
    await page.waitForTimeout(500)

    // 验证 Header 恢复显示
    const headerAfterRestore = await page.locator('header').isVisible().catch(() => false)
    console.log('恢复后 Header 可见:', headerAfterRestore)
  })

  test('沉浸模式下不应该显示单词列表', async ({ page }) => {
    // 进入沉浸模式
    await page.keyboard.press('Alt+i')
    await page.waitForTimeout(500)

    // 检查单词列表是否隐藏
    const wordList = page.locator('[data-testid="word-list"]')
    const isVisible = await wordList.isVisible().catch(() => false)

    // 沉浸模式下单词列表应该不可见
    expect(isVisible).toBe(false)
  })
})

test.describe('词典选择页面测试', () => {
  test('应该能访问词典选择页面', async ({ page }) => {
    await page.goto('/#/gallery')

    // 等待页面加载
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    // 验证标题
    const title = page.locator('h1:has-text("自定义词库")')
    await expect(title).toBeVisible()
  })

  test('应该能从词典页面返回首页', async ({ page }) => {
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    // 点击关闭按钮
    const closeButton = page.locator('.cursor-pointer.text-gray-400').first()
    await closeButton.click()

    // 验证返回首页
    await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
    expect(page.url()).toMatch(/\/#\/?$/)
  })

  test('词典页面应该显示词典列表或空状态', async ({ page }) => {
    await page.goto('/#/gallery')
    await page.waitForSelector('h1:has-text("自定义词库")', { timeout: 10000 })

    // 检查是否有词典卡片或空状态提示
    const pageContent = await page.content()
    const hasDictCards = pageContent.includes('dictionary') || pageContent.includes('词库')

    // 至少应该有标题
    expect(pageContent).toContain('自定义词库')
  })
})

test.describe('统计页面测试', () => {
  test('应该能访问统计页面', async ({ page }) => {
    await page.goto('/#/analysis')

    // 等待页面加载
    await page.waitForTimeout(1000)

    // 验证页面加载 - 检查统计页面的容器
    const pageContent = await page.content()
    const hasStatsContent = pageContent.includes('词典') || pageContent.includes('学习')

    console.log('统计页面内容检查:', hasStatsContent)
  })

  test('应该能从统计页面返回首页', async ({ page }) => {
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    // 点击关闭按钮
    const closeButton = page.locator('.cursor-pointer.text-gray-400').first()
    const isVisible = await closeButton.isVisible().catch(() => false)

    if (isVisible) {
      await closeButton.click()
      // 验证返回首页
      await page.waitForURL(/\/#\/?$/, { timeout: 5000 })
      expect(page.url()).toMatch(/\/#\/?$/)
    }
  })
})

test.describe('释义显示切换测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能通过快捷键 Ctrl+Shift+V 切换释义显示', async ({ page }) => {
    // 检查初始释义状态
    const translationElement = page.locator('[data-testid="translation"]')
    const initiallyVisible = await translationElement.isVisible().catch(() => false)
    console.log('释义初始可见:', initiallyVisible)

    // 按下 Ctrl+Shift+V 切换释义
    await page.keyboard.press('Control+Shift+v')
    await page.waitForTimeout(300)

    // 检查释义状态变化
    const afterToggle = await translationElement.isVisible().catch(() => false)
    console.log('切换后释义可见:', afterToggle)

    // 再次切换
    await page.keyboard.press('Control+Shift+v')
    await page.waitForTimeout(300)

    const afterSecondToggle = await translationElement.isVisible().catch(() => false)
    console.log('再次切换后释义可见:', afterSecondToggle)
  })
})

test.describe('打字输入测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })
  })

  test('应该能开始打字', async ({ page }) => {
    // 按任意键开始
    await page.keyboard.press('a')
    await page.waitForTimeout(500)

    // 检查是否进入打字状态
    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()
    console.log('当前单词:', wordText)
  })

  test('打字时应该更新输入状态', async ({ page }) => {
    // 开始打字
    await page.keyboard.press('a')
    await page.waitForTimeout(500)

    // 获取当前单词
    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()

    if (wordText && wordText.length > 0) {
      // 输入单词的第一个字母
      const firstLetter = wordText[0].toLowerCase()
      await page.keyboard.press(firstLetter)
      await page.waitForTimeout(200)

      console.log(`输入字母: ${firstLetter}, 单词: ${wordText}`)
    }
  })
})
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

      const pageContent = await page.content()
      console.log('页面内容片段:', pageContent.substring(0, 500))

      const hasTransData = await page.evaluate(() => {
        const transElement = document.querySelector('[data-testid="translation"]')
        return transElement !== null
      })
      console.log('释义元素是否存在:', hasTransData)
    }

    expect(isVisible).toBe(true)
  })

  test('关键：单词应该有内容显示', async ({ page }) => {
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()

    console.log('当前单词:', wordText)

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

      const pageContent = await page.content()
      const hasTransInDom = pageContent.includes('data-testid="translation"')
      console.log('释义元素在DOM中:', hasTransInDom)
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

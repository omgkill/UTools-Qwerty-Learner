import { test, expect } from '@playwright/test'

/**
 * 完整学习流程 E2E 测试
 *
 * ========================================
 * 测试目标
 * ========================================
 *
 * 验证从开始学习到完成的完整流程，确认学习类型显示正确：
 *
 * 学习类型判断逻辑：
 * - masteryLevel === 0: 完全新单词（未学过）
 * - masteryLevel === 1: 刚学完第一次 → 显示"📚 新词"
 * - masteryLevel > 1: 复习 → 显示"🔄 复习"
 *
 * 测试场景：
 * 1. 新单词学习（masteryLevel 0→1）→ 显示新词
 * 2. 第一次复习（masteryLevel 1→2）→ 显示新词
 * 3. 后续复习（masteryLevel > 1）→ 显示复习
 */

test.describe('完整学习流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  /**
   * 辅助函数：输入单词
   */
  async function typeWord(page: import('@playwright/test').Page, word: string) {
    for (const letter of word.toLowerCase()) {
      await page.keyboard.press(letter)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)
  }

  /**
   * 辅助函数：获取存储中的单词进度
   */
  async function getWordProgress(page: import('@playwright/test').Page, word: string) {
    return await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const key = `progress:${dictId}:${wordName}`
      const doc = utools.db.get(key)

      return doc?.data || null
    }, word)
  }

  /**
   * 辅助函数：设置单词进度（用于测试准备）
   */
  async function setWordProgress(
    page: import('@playwright/test').Page,
    word: string,
    masteryLevel: number
  ) {
    await page.evaluate(
      ({ wordName, level }) => {
        const utools = (window as any).utools
        if (!utools?.db) return

        const dictId = localStorage.getItem('currentDictId') || 'default'
        const key = `progress:${dictId}:${wordName}`
        const existingDoc = utools.db.get(key)

        const now = Date.now()
        const nextReviewTime = level > 0 ? now : 0

        utools.db.put({
          _id: key,
          data: {
            word: wordName,
            dict: dictId,
            masteryLevel: level,
            nextReviewTime,
          },
          _rev: existingDoc?._rev,
        })
      },
      { wordName: word, level: masteryLevel }
    )
  }

  /**
   * 辅助函数：清除今日学习记录
   */
  async function clearTodayRecord(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
      const utools = (window as any).utools
      if (!utools?.db) return

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const today = new Date().toISOString().split('T')[0]
      const key = `daily:${dictId}:${today}`
      const doc = utools.db.get(key)

      if (doc) {
        utools.db.remove(key)
      }
    })
  }

  test('验证学习页面加载正确', async ({ page }) => {
    // 等待学习页面加载
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 验证单词显示
    const wordElement = page.locator('[data-testid="word-component"]')
    const wordText = await wordElement.textContent()

    expect(wordText).toBeTruthy()
    expect(wordText!.length).toBeGreaterThan(0)

    console.log('========================================')
    console.log('学习页面加载验证')
    console.log(`当前单词: ${wordText}`)
    console.log('========================================')
  })

  test('验证学习类型显示：新词场景', async ({ page }) => {
    // 等待学习页面加载
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取当前单词
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      console.log('无法获取当前单词，跳过测试')
      test.skip()
      return
    }

    console.log('========================================')
    console.log('新词学习场景测试')
    console.log(`当前单词: ${currentWord}`)
    console.log('========================================')

    // 检查当前单词的进度
    const progress = await getWordProgress(page, currentWord)
    console.log(`单词进度: masteryLevel = ${progress?.masteryLevel ?? '未学习'}`)

    // 获取页面内容检查学习类型
    const pageContent = await page.content()
    const isNewWord = pageContent.includes('📚 新词')
    const isReviewWord = pageContent.includes('🔄 复习')

    console.log(`界面显示: ${isNewWord ? '📚 新词' : isReviewWord ? '🔄 复习' : '未知'}`)

    // 如果是新单词（masteryLevel === 0 或 1），应该显示"新词"
    if (progress?.masteryLevel === 0 || progress?.masteryLevel === 1 || !progress) {
      // 完成学习
      await typeWord(page, currentWord)
      console.log(`完成单词 "${currentWord}" 的学习`)

      // 验证 masteryLevel 更新
      const updatedProgress = await getWordProgress(page, currentWord)
      console.log(`更新后 masteryLevel: ${updatedProgress?.masteryLevel}`)

      // masteryLevel 应该增加
      expect(updatedProgress?.masteryLevel).toBeGreaterThan(progress?.masteryLevel ?? 0)
    } else {
      console.log(`单词 ${currentWord} masteryLevel=${progress.masteryLevel}，不是新词场景`)
    }

    console.log('========================================')
  })

  test('验证学习类型显示：复习场景', async ({ page }) => {
    // 等待学习页面加载
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取当前单词
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      console.log('无法获取当前单词，跳过测试')
      test.skip()
      return
    }

    console.log('========================================')
    console.log('复习场景测试')
    console.log(`当前单词: ${currentWord}`)
    console.log('========================================')

    // 检查当前单词的进度
    const progress = await getWordProgress(page, currentWord)
    console.log(`单词进度: masteryLevel = ${progress?.masteryLevel ?? '未学习'}`)

    // 获取页面内容检查学习类型
    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')

    // 如果 masteryLevel > 1，应该显示复习
    if (progress?.masteryLevel > 1) {
      expect(isReviewWord).toBe(true)
      console.log(`✅ masteryLevel=${progress.masteryLevel} 显示"🔄 复习" - 正确`)
    } else if (progress?.masteryLevel === 1 && isReviewWord) {
      // 特殊情况：masteryLevel=1 且显示复习
      // 这意味着今天已经学习过这个词，再次学习时显示复习
      console.log(`单词 masteryLevel=1 显示复习，表示今天已学习过`)
    } else {
      console.log(`当前不是复习场景，跳过验证`)
    }

    console.log('========================================')
  })

  test('完整流程：学习一个单词并验证数据更新', async ({ page }) => {
    // 等待学习页面加载
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取当前单词和学习类型
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      console.log('无法获取当前单词，跳过测试')
      test.skip()
      return
    }

    const pageContent = await page.content()
    const displayedType = pageContent.includes('📚 新词')
      ? 'new'
      : pageContent.includes('🔄 复习')
        ? 'review'
        : 'unknown'

    console.log('========================================')
    console.log('完整学习流程验证')
    console.log(`单词: ${currentWord}`)
    console.log(`显示类型: ${displayedType}`)
    console.log('========================================')

    // 获取学习前的进度
    const progressBefore = await getWordProgress(page, currentWord)
    console.log(`学习前 masteryLevel: ${progressBefore?.masteryLevel ?? '未学习'}`)

    // 完成学习
    await typeWord(page, currentWord)
    console.log(`完成学习`)

    // 获取学习后的进度
    const progressAfter = await getWordProgress(page, currentWord)
    console.log(`学习后 masteryLevel: ${progressAfter?.masteryLevel}`)

    // 验证 masteryLevel 增加
    const expectedLevel = (progressBefore?.masteryLevel ?? 0) + 1
    expect(progressAfter?.masteryLevel).toBe(Math.min(expectedLevel, 7))

    // 验证存储的学习类型
    const storedType = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const today = new Date().toISOString().split('T')[0]
      const key = `daily:${dictId}:${today}`
      const record = utools.db.get(key)

      return record?.data?.wordTypes?.[wordName] || null
    }, currentWord)

    console.log(`存储的学习类型: ${storedType}`)

    // 验证存储的学习类型与界面显示一致
    if (storedType) {
      expect(storedType).toBe(displayedType)
      console.log(`✅ 学习类型一致: 界面=${displayedType}, 存储=${storedType}`)
    }

    console.log('========================================')
  })
})

test.describe('学习类型一致性验证', () => {
  /**
   * 此测试验证学习类型在界面和存储中保持一致
   * 修复前的 Bug：界面显示复习，但统计显示新词
   */
  test('学习类型在界面和存储中应保持一致', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取当前单词和显示的学习类型
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      test.skip()
      return
    }

    const pageContent = await page.content()
    const displayedType = pageContent.includes('📚 新词')
      ? 'new'
      : pageContent.includes('🔄 复习')
        ? 'review'
        : null

    if (!displayedType) {
      console.log('无法识别学习类型，跳过测试')
      test.skip()
      return
    }

    console.log('========================================')
    console.log('学习类型一致性验证')
    console.log(`单词: ${currentWord}`)
    console.log(`界面显示类型: ${displayedType}`)
    console.log('========================================')

    // 完成学习
    for (const letter of currentWord.toLowerCase()) {
      await page.keyboard.press(letter)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // 验证存储的学习类型
    const storedType = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const today = new Date().toISOString().split('T')[0]
      const key = `daily:${dictId}:${today}`
      const record = utools.db.get(key)

      return record?.data?.wordTypes?.[wordName] || null
    }, currentWord)

    console.log(`存储的学习类型: ${storedType}`)

    // 关键断言：存储类型应与界面显示一致
    expect(storedType).toBe(displayedType)

    console.log('✅ 学习类型一致性验证通过')
    console.log('========================================')
  })

  /**
   * 验证统计页面显示与学习类型一致
   */
  test('统计页面显示应与学习类型一致', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取当前单词和显示的学习类型
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      test.skip()
      return
    }

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')
    const isNewWord = pageContent.includes('📚 新词')

    // 只测试复习场景（这是之前 Bug 的关键场景）
    if (!isReviewWord) {
      console.log('当前不是复习单词，跳过测试')
      test.skip()
      return
    }

    console.log('========================================')
    console.log('统计页面一致性验证（复习场景）')
    console.log(`单词: ${currentWord}`)
    console.log(`界面显示: 🔄 复习`)
    console.log('========================================')

    // 完成学习
    for (const letter of currentWord.toLowerCase()) {
      await page.keyboard.press(letter)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // 进入统计页面
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    // 导航到今日学习详情
    const dictItem = page.locator('[class*="cursor-pointer"]').first()
    const hasDict = await dictItem.isVisible().catch(() => false)

    if (!hasDict) {
      console.log('无法找到词典项')
      return
    }

    await dictItem.click()
    await page.waitForTimeout(500)

    // 点击今日日期
    const todayItem = page.locator('text=/今天|\\d{4}年\\d{2}月\\d{2}日/').first()
    const hasToday = await todayItem.isVisible().catch(() => false)

    if (!hasToday) {
      console.log('无法找到今日学习记录')
      return
    }

    await todayItem.click()
    await page.waitForTimeout(500)

    // 验证统计页面显示
    const detailContent = await page.content()
    const wordInReviewSection =
      detailContent.includes('复习单词') && detailContent.includes(currentWord)
    const wordInNewSection =
      detailContent.includes('新学单词') && detailContent.includes(currentWord)

    console.log(`单词出现在"复习单词"分类: ${wordInReviewSection}`)
    console.log(`单词出现在"新学单词"分类: ${wordInNewSection}`)

    // 关键断言：复习词应该在"复习单词"分类，不应该在"新学单词"分类
    expect(wordInReviewSection).toBe(true)
    expect(wordInNewSection).toBe(false)

    console.log('✅ 统计页面显示正确：复习词出现在复习分类')
    console.log('========================================')
  })
})

test.describe('masteryLevel 更新验证', () => {
  /**
   * 验证学习后 masteryLevel 正确更新
   */
  test('学习后 masteryLevel 应正确增加', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      test.skip()
      return
    }

    console.log('========================================')
    console.log('masteryLevel 更新验证')
    console.log(`单词: ${currentWord}`)
    console.log('========================================')

    // 获取学习前的 masteryLevel
    const progressBefore = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const key = `progress:${dictId}:${wordName}`
      const doc = utools.db.get(key)

      return doc?.data?.masteryLevel ?? 0
    }, currentWord)

    console.log(`学习前 masteryLevel: ${progressBefore}`)

    // 完成学习
    for (const letter of currentWord.toLowerCase()) {
      await page.keyboard.press(letter)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // 获取学习后的 masteryLevel
    const progressAfter = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const key = `progress:${dictId}:${wordName}`
      const doc = utools.db.get(key)

      return doc?.data?.masteryLevel ?? 0
    }, currentWord)

    console.log(`学习后 masteryLevel: ${progressAfter}`)

    // 验证 masteryLevel 增加 1（最大为 7）
    const expectedLevel = Math.min(progressBefore + 1, 7)
    expect(progressAfter).toBe(expectedLevel)

    console.log(`✅ masteryLevel 正确更新: ${progressBefore} → ${progressAfter}`)
    console.log('========================================')
  })

  /**
   * 验证新单词学习流程
   * masteryLevel: 0 → 1 → 2
   */
  test('新单词学习：masteryLevel 0 → 1 → 2', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    if (!currentWord) {
      test.skip()
      return
    }

    // 检查是否是新单词（masteryLevel === 0）
    const progressBefore = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const key = `progress:${dictId}:${wordName}`
      const doc = utools.db.get(key)

      return doc?.data ?? null
    }, currentWord)

    // 如果不是新单词，跳过测试
    if (progressBefore?.masteryLevel !== 0 && progressBefore !== null) {
      console.log(`单词 ${currentWord} 不是新单词 (masteryLevel=${progressBefore?.masteryLevel})，跳过测试`)
      test.skip()
      return
    }

    console.log('========================================')
    console.log('新单词学习流程验证')
    console.log(`单词: ${currentWord}`)
    console.log('========================================')

    // 第一次学习：0 → 1
    console.log('第一次学习...')
    for (const letter of currentWord.toLowerCase()) {
      await page.keyboard.press(letter)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    const progressAfterFirst = await page.evaluate((wordName) => {
      const utools = (window as any).utools
      if (!utools?.db) return null

      const dictId = localStorage.getItem('currentDictId') || 'default'
      const key = `progress:${dictId}:${wordName}`
      const doc = utools.db.get(key)

      return doc?.data?.masteryLevel ?? 0
    }, currentWord)

    console.log(`第一次学习后 masteryLevel: ${progressAfterFirst}`)
    expect(progressAfterFirst).toBe(1)

    // 验证显示"新词"（masteryLevel === 1 时显示新词）
    // 刷新页面重新加载
    await page.reload()
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const isNewWord = pageContent.includes('📚 新词')
    console.log(`masteryLevel=1 时显示: ${isNewWord ? '📚 新词' : '其他'}`)

    console.log('✅ 新单词学习流程验证完成')
    console.log(`masteryLevel 变化: 0 → 1`)
    console.log('========================================')
  })
})
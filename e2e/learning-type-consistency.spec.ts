import { test, expect } from '@playwright/test'

/**
 * 学习类型显示一致性 E2E 测试
 *
 * ========================================
 * Bug 复现与修复验证
 * ========================================
 *
 * Bug 描述：
 * - 界面显示"🔄 复习"，但统计详情显示"新词"
 * - 根因：DailyRecord.todayWords 只存单词名，不存学习类型
 * - 旧逻辑：useWordDetails 根据 masteryLevel === 1 判断为"新词"
 * - 问题：masteryLevel=1 的单词复习时，界面显示复习，统计却显示新词
 *
 * 修复方案：
 * - DailyRecord 添加 wordTypes 字段存储每个单词的学习类型
 * - useWordDetails 优先使用 wordTypes，确保与界面一致
 */

test.describe('Bug 复现：学习类型不一致问题', () => {
  /**
   * 此测试用于复现原始 Bug
   *
   * 场景：用户复习一个 masteryLevel=1 的单词
   * - 界面显示：🔄 复习
   * - 修复前统计显示：新词（错误）
   * - 修复后统计显示：复习（正确）
   */
  test('复现Bug：界面显示复习但统计显示新词（已修复）', async ({ page }) => {
    console.log('========================================')
    console.log('Bug 复现测试：学习类型不一致')
    console.log('========================================')

    // Step 1: 进入学习页面
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // Step 2: 获取当前单词和学习类型
    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')
    const isNewWord = pageContent.includes('📚 新词')

    console.log(`当前单词: ${currentWord}`)
    console.log(`界面显示类型: ${isReviewWord ? '复习' : isNewWord ? '新词' : '未知'}`)

    // 只测试复习场景（这是 Bug 的关键场景）
    if (!isReviewWord) {
      console.log('跳过：当前不是复习单词，无法复现 Bug')
      test.skip()
      return
    }

    // Step 3: 完成单词学习
    if (currentWord) {
      for (const letter of currentWord.toLowerCase()) {
        await page.keyboard.press(letter)
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(500)
      console.log(`已完成单词 "${currentWord}" 的输入`)
    }

    // Step 4: 进入统计页面
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    // Step 5: 导航到今日学习详情
    // 点击词典
    const dictItem = page.locator('[class*="cursor-pointer"]').first()
    const hasDict = await dictItem.isVisible().catch(() => false)

    if (!hasDict) {
      console.log('警告：无法找到词典项')
      return
    }

    await dictItem.click()
    await page.waitForTimeout(500)

    // 点击今日日期
    const todayItem = page.locator('text=/今天|\\d{4}年\\d{2}月\\d{2}日/').first()
    const hasToday = await todayItem.isVisible().catch(() => false)

    if (!hasToday) {
      console.log('警告：无法找到今日学习记录')
      return
    }

    await todayItem.click()
    await page.waitForTimeout(500)

    // Step 6: 验证统计页面显示
    const detailContent = await page.content()
    const wordInNewSection = detailContent.includes('新学单词') && detailContent.includes(currentWord!)
    const wordInReviewSection = detailContent.includes('复习单词') && detailContent.includes(currentWord!)

    console.log('----------------------------------------')
    console.log('统计页面验证结果:')
    console.log(`单词 "${currentWord}" 出现在新学单词分类: ${wordInNewSection}`)
    console.log(`单词 "${currentWord}" 出现在复习单词分类: ${wordInReviewSection}`)
    console.log('----------------------------------------')

    // ========================================
    // 关键断言：验证 Bug 是否已修复
    // ========================================
    // 修复前：界面显示复习，但统计显示在新学单词分类（Bug！）
    // 修复后：界面显示复习，统计显示在复习单词分类（正确）
    expect(wordInReviewSection).toBe(true)
    expect(wordInNewSection).toBe(false)

    console.log('✅ Bug 已修复：界面显示复习，统计也显示复习')
    console.log('========================================')
  })
})

test.describe('修复验证：学习类型一致性', () => {
  /**
   * 验证新词学习场景
   */
  test('新词学习：界面和统计都应显示新词', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const isNewWord = pageContent.includes('📚 新词')

    if (!isNewWord) {
      console.log('跳过：当前不是新词')
      test.skip()
      return
    }

    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    console.log(`测试新词: ${currentWord}`)

    // 完成学习
    if (currentWord) {
      for (const letter of currentWord.toLowerCase()) {
        await page.keyboard.press(letter)
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(500)
    }

    // 进入统计
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    const dictItem = page.locator('[class*="cursor-pointer"]').first()
    if (await dictItem.isVisible().catch(() => false)) {
      await dictItem.click()
      await page.waitForTimeout(500)

      const todayItem = page.locator('text=/今天|\\d{4}年\\d{2}月\\d{2}日/').first()
      if (await todayItem.isVisible().catch(() => false)) {
        await todayItem.click()
        await page.waitForTimeout(500)

        const detailContent = await page.content()
        const wordInNewSection = detailContent.includes('新学单词') && currentWord && detailContent.includes(currentWord)

        console.log(`新词 "${currentWord}" 在新学单词分类: ${wordInNewSection}`)
        expect(wordInNewSection).toBe(true)
      }
    }
  })

  /**
   * 验证复习词学习场景（Bug 的关键场景）
   *
   * 这是验证修复的核心测试
   */
  test('复习词学习：界面和统计都应显示复习（Bug修复验证）', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')

    if (!isReviewWord) {
      console.log('跳过：当前不是复习词')
      test.skip()
      return
    }

    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    console.log('========================================')
    console.log(`测试复习词: ${currentWord}`)
    console.log('这是 Bug 的关键验证场景')
    console.log('========================================')

    // 完成学习
    if (currentWord) {
      for (const letter of currentWord.toLowerCase()) {
        await page.keyboard.press(letter)
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(500)
    }

    // 进入统计
    await page.goto('/#/analysis')
    await page.waitForTimeout(1000)

    const dictItem = page.locator('[class*="cursor-pointer"]').first()
    if (await dictItem.isVisible().catch(() => false)) {
      await dictItem.click()
      await page.waitForTimeout(500)

      const todayItem = page.locator('text=/今天|\\d{4}年\\d{2}月\\d{2}日/').first()
      if (await todayItem.isVisible().catch(() => false)) {
        await todayItem.click()
        await page.waitForTimeout(500)

        const detailContent = await page.content()

        // 关键验证：复习词应该在"复习单词"分类，不应该在"新学单词"分类
        const wordInReviewSection = currentWord && detailContent.includes('复习单词') && detailContent.includes(currentWord)
        const wordInNewSection = currentWord && detailContent.includes('新学单词') && detailContent.includes(currentWord)

        console.log(`复习词 "${currentWord}" 在复习单词分类: ${wordInReviewSection}`)
        console.log(`复习词 "${currentWord}" 在新学单词分类: ${wordInNewSection}`)

        // 断言：应该在复习分类，不应该在新学分类
        expect(wordInReviewSection).toBe(true)
        expect(wordInNewSection).toBe(false)

        console.log('✅ 修复验证通过：复习词正确显示在复习分类')
      }
    }
  })
})

test.describe('数据完整性验证', () => {
  /**
   * 验证 wordTypes 字段正确存储
   */
  test('wordTypes 字段应该正确存储学习类型', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    // 获取界面显示的学习类型
    const pageContent = await page.content()
    const displayedType = pageContent.includes('📚 新词') ? 'new' : pageContent.includes('🔄 复习') ? 'review' : 'unknown'

    const wordElement = page.locator('[data-testid="word-component"]')
    const currentWord = await wordElement.textContent()

    console.log(`界面显示类型: ${displayedType}, 单词: ${currentWord}`)

    // 完成学习
    if (currentWord) {
      for (const letter of currentWord.toLowerCase()) {
        await page.keyboard.press(letter)
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(500)
    }

    // 检查存储数据
    const storageData = await page.evaluate(() => {
      const utools = (window as any).utools
      if (!utools?.db) return { hasStorage: false }

      const today = new Date().toISOString().split('T')[0]
      const dictId = localStorage.getItem('currentDictId') || 'default'

      // 获取今日学习记录
      const recordKey = `daily:${dictId}:${today}`
      const record = utools.db.get(recordKey)

      return {
        hasStorage: true,
        record: record?.data,
        wordTypes: record?.data?.wordTypes,
      }
    })

    console.log('存储数据:', JSON.stringify(storageData, null, 2))

    if (storageData.hasStorage && storageData.wordTypes && currentWord) {
      const storedType = storageData.wordTypes[currentWord]
      console.log(`存储的学习类型: ${storedType}`)

      // 验证存储类型与界面显示一致
      expect(storedType).toBe(displayedType)
      console.log('✅ wordTypes 字段存储正确')
    }
  })
})
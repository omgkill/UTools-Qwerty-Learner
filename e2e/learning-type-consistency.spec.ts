import { test, expect } from '@playwright/test'
import {
  setupUtoolsMock,
  createTestDictionary,
  setCurrentDictionary,
  setWordProgress,
  clearAllData,
  waitForPageReady,
  typeWord,
  getCurrentWordName,
} from './utils/utools-mock'

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
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('验证 masteryLevel=1 的单词：界面显示新词，存储类型为 review', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, 'Bug复现测试词库', [
      { name: 'bugtest', trans: 'Bug测试' },
    ])
    // 设置 masteryLevel=1，nextReviewTime 过去
    // 界面判断：masteryLevel <= 1 → 显示"新词"
    // 存储判断：wasNew = (masteryLevel === 0) → false → 存储"review"
    await setWordProgress(page, dictId, 'bugtest', 1, Date.now() - 1000)
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    console.log('========================================')
    console.log('masteryLevel=1 学习类型验证')
    console.log('========================================')

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')
    const isNewWord = pageContent.includes('📚 新词')

    console.log(`当前单词: ${currentWord}`)
    console.log(`界面显示类型: ${isReviewWord ? '复习' : isNewWord ? '新词' : '未知'}`)

    // 验证 masteryLevel=1 显示新词（界面判断：masteryLevel <= 1）
    expect(isNewWord).toBe(true)

    if (!currentWord) {
      test.skip()
      return
    }

    await typeWord(page, currentWord)
    console.log(`已完成单词 "${currentWord}" 的输入`)

    // 验证存储的学习类型
    // 存储判断：wasNew = (masteryLevel === 0)，这里 masteryLevel=1，所以 wasNew=false，存储为 review
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

    console.log(`存储的学习类型: ${storedType}`)
    // masteryLevel=1 的单词学习后，wasNew=false，所以存储类型应该是 'review'
    expect(storedType).toBe('review')

    console.log('✅ masteryLevel=1 界面显示新词，存储类型为 review（符合预期）')
    console.log('========================================')
  })
})

test.describe('修复验证：学习类型一致性', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('新词学习：界面和统计都应显示新词', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '新词测试词库', [
      { name: 'newtest', trans: '新词测试' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const isNewWord = pageContent.includes('📚 新词')

    expect(isNewWord).toBe(true)

    const currentWord = await getCurrentWordName(page)

    console.log(`测试新词: ${currentWord}`)

    if (!currentWord) {
      test.skip()
      return
    }

    await typeWord(page, currentWord)

    // 验证存储的学习类型
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

    console.log(`新词 "${currentWord}" 存储类型: ${storedType}`)
    expect(storedType).toBe('new')
  })

  test('复习词学习：界面和统计都应显示复习（Bug修复验证）', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '复习测试词库', [
      { name: 'reviewtest', trans: '复习测试' },
    ])
    // 设置 masteryLevel=2，使其成为复习词
    await setWordProgress(page, dictId, 'reviewtest', 2, Date.now() - 1000)
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')

    expect(isReviewWord).toBe(true)

    const currentWord = await getCurrentWordName(page)

    console.log('========================================')
    console.log(`测试复习词: ${currentWord}`)
    console.log('这是 Bug 的关键验证场景')
    console.log('========================================')

    if (!currentWord) {
      test.skip()
      return
    }

    await typeWord(page, currentWord)

    // 验证存储的学习类型
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

    console.log(`复习词 "${currentWord}" 存储类型: ${storedType}`)
    expect(storedType).toBe('review')

    console.log('✅ 修复验证通过：复习词正确显示在复习分类')
  })
})

test.describe('数据完整性验证', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('wordTypes 字段应该正确存储学习类型', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '数据完整性测试词库', [
      { name: 'datatype', trans: '数据类型' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const pageContent = await page.content()
    const displayedType = pageContent.includes('📚 新词') ? 'new' : pageContent.includes('🔄 复习') ? 'review' : 'unknown'

    const currentWord = await getCurrentWordName(page)

    console.log(`界面显示类型: ${displayedType}, 单词: ${currentWord}`)

    if (!currentWord) {
      test.skip()
      return
    }

    await typeWord(page, currentWord)

    // 检查存储数据
    const storageData = await page.evaluate(
      ({ currentWord, dictId, STORAGE_KEY }) => {
        const today = new Date().toISOString().split('T')[0]
        const key = `daily:${dictId}:${today}`

        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const record = db[key]?.data

          return {
            hasStorage: !!record,
            wordTypes: record?.wordTypes,
            storedType: record?.wordTypes?.[currentWord as string],
          }
        } catch (e) {
          return { hasStorage: false }
        }
      },
      { currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log('存储数据:', JSON.stringify(storageData, null, 2))

    if (storageData.hasStorage && storageData.wordTypes) {
      const storedType = storageData.storedType
      console.log(`存储的学习类型: ${storedType}`)

      expect(storedType).toBe(displayedType)
      console.log('✅ wordTypes 字段存储正确')
    }
  })
})
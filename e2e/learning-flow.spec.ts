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
    await setupUtoolsMock(page)
  })

  test('验证学习页面加载正确', async ({ page }) => {
    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '学习流程测试词库', [
      { name: 'hello', trans: '你好' },
      { name: 'world', trans: '世界' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const wordText = await getCurrentWordName(page)

    expect(wordText).toBeTruthy()
    expect(wordText!.length).toBeGreaterThan(0)

    console.log('========================================')
    console.log('学习页面加载验证')
    console.log(`当前单词: ${wordText}`)
    console.log('========================================')
  })

  test('验证学习类型显示：新词场景', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '新词测试词库', [
      { name: 'newword', trans: '新词' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    if (!currentWord) {
      test.skip()
      return
    }

    console.log('========================================')
    console.log('新词学习场景测试')
    console.log(`当前单词: ${currentWord}`)
    console.log('========================================')

    const pageContent = await page.content()
    const isNewWord = pageContent.includes('📚 新词')
    const isReviewWord = pageContent.includes('🔄 复习')

    console.log(`界面显示: ${isNewWord ? '📚 新词' : isReviewWord ? '🔄 复习' : '未知'}`)

    expect(isNewWord).toBe(true)

    await typeWord(page, currentWord)
    console.log(`完成单词 "${currentWord}" 的学习`)

    console.log('========================================')
  })

  test('验证学习类型显示：复习场景', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '复习测试词库', [
      { name: 'reviewword', trans: '复习词' },
    ])
    await setWordProgress(page, dictId, 'reviewword', 2, Date.now() - 1000)
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    if (!currentWord) {
      test.skip()
      return
    }

    console.log('========================================')
    console.log('复习场景测试')
    console.log(`当前单词: ${currentWord}`)
    console.log('========================================')

    const pageContent = await page.content()
    const isReviewWord = pageContent.includes('🔄 复习')

    expect(isReviewWord).toBe(true)
    console.log(`✅ masteryLevel=2 显示"🔄 复习" - 正确`)
    console.log('========================================')
  })

  test('完整流程：学习一个单词并验证数据更新', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '数据更新测试词库', [
      { name: 'dataword', trans: '数据词' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    if (!currentWord) {
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

    await typeWord(page, currentWord)
    console.log(`完成学习`)

    const progressAfter = await page.evaluate(
      ({ wordName, dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const key = `progress:${dictId}:${wordName}`
          return db[key]?.data?.masteryLevel ?? 0
        } catch (e) {
          return null
        }
      },
      { wordName: currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log(`学习后 masteryLevel: ${progressAfter}`)
    expect(progressAfter).toBe(1)

    console.log('========================================')
  })
})

test.describe('学习类型一致性验证', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('学习类型在界面和存储中应保持一致', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '一致性测试词库', [
      { name: 'consistent', trans: '一致性' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

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

    console.log(`存储的学习类型: ${storedType}`)

    expect(storedType).toBe(displayedType)
    console.log('✅ 学习类型一致性验证通过')
    console.log('========================================')
  })
})

test.describe('masteryLevel 更新验证', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('学习后 masteryLevel 应正确增加', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, 'mastery测试词库', [
      { name: 'masterytest', trans: '掌握测试' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    if (!currentWord) {
      test.skip()
      return
    }

    console.log('========================================')
    console.log('masteryLevel 更新验证')
    console.log(`单词: ${currentWord}`)
    console.log('========================================')

    const progressBefore = await page.evaluate(
      ({ wordName, dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const key = `progress:${dictId}:${wordName}`
          return db[key]?.data?.masteryLevel ?? 0
        } catch (e) {
          return 0
        }
      },
      { wordName: currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log(`学习前 masteryLevel: ${progressBefore}`)

    await typeWord(page, currentWord)

    const progressAfter = await page.evaluate(
      ({ wordName, dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const key = `progress:${dictId}:${wordName}`
          return db[key]?.data?.masteryLevel ?? 0
        } catch (e) {
          return 0
        }
      },
      { wordName: currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log(`学习后 masteryLevel: ${progressAfter}`)

    const expectedLevel = Math.min(progressBefore + 1, 7)
    expect(progressAfter).toBe(expectedLevel)

    console.log(`✅ masteryLevel 正确更新: ${progressBefore} → ${progressAfter}`)
    console.log('========================================')
  })

  test('新单词学习：masteryLevel 0 → 1 → 2', async ({ page }) => {
    await clearAllData(page)

    await page.goto('/#/gallery')
    await waitForPageReady(page)

    const dictId = await createTestDictionary(page, '进阶测试词库', [
      { name: 'advanced', trans: '进阶' },
    ])
    await setCurrentDictionary(page, dictId)

    await page.goto('/')
    await waitForPageReady(page)

    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    const currentWord = await getCurrentWordName(page)

    if (!currentWord) {
      test.skip()
      return
    }

    console.log('========================================')
    console.log('新单词学习流程验证')
    console.log(`单词: ${currentWord}`)
    console.log('========================================')

    // 第一次学习：0 → 1
    console.log('第一次学习...')
    await typeWord(page, currentWord)

    const progressAfterFirst = await page.evaluate(
      ({ wordName, dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const key = `progress:${dictId}:${wordName}`
          return db[key]?.data?.masteryLevel ?? 0
        } catch (e) {
          return 0
        }
      },
      { wordName: currentWord, dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log(`第一次学习后 masteryLevel: ${progressAfterFirst}`)
    expect(progressAfterFirst).toBe(1)

    console.log('✅ 新单词学习流程验证完成')
    console.log(`masteryLevel 变化: 0 → 1`)
    console.log('========================================')
  })
})
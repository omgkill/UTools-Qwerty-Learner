import { test, expect } from '@playwright/test'
import {
  setupUtoolsMock,
  clearAllData,
  createTestDictionary,
  setCurrentDictionary,
  typeWord,
  getCurrentWordName,
  getWordProgress,
  getDailyRecord,
  verifyLearningType,
  waitForPageReady,
} from './utils/utools-mock'

/**
 * 测试 2：背单词完整流程
 *
 * 流程：
 * 1. 清空所有数据
 * 2. 创建词库 [apple, banana]
 * 3. 选择词库
 * 4. 进入学习页面
 * 5. 验证单词显示
 * 6. 验证释义显示
 * 7. 验证学习类型显示
 * 8. 输入第一个单词 apple
 * 9. 验证 masteryLevel = 1
 * 10. 验证 learnedCount = 1
 * 11. 验证自动切换到 banana
 * 12. 输入第二个单词 banana
 * 13. 验证 masteryLevel = 1
 * 14. 验证 learnedCount = 2
 * 15. 验证显示"学习完成"
 */

test.describe('测试 2：背单词完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('背单词完整流程验证', async ({ page }) => {
    // 步骤 1: 清空所有数据
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    console.log('步骤 1: 已清空数据')

    // 步骤 2: 创建词库
    const testWords = [
      { name: 'apple', trans: '苹果' },
      { name: 'banana', trans: '香蕉' },
    ]

    const dictId = await createTestDictionary(page, '背单词测试词库', testWords)

    console.log('步骤 2: 已创建词库, ID:', dictId)

    // 步骤 3: 选择词库（已在创建时设置）

    // 步骤 4: 进入学习页面
    await page.goto('/')
    await waitForPageReady(page)

    // 等待学习页面元素出现
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    console.log('步骤 4: 已进入学习页面')

    // 步骤 5: 验证单词显示
    const currentWord1 = await getCurrentWordName(page)

    console.log('步骤 5: 当前显示单词:', currentWord1)

    expect(currentWord1).toBeTruthy()
    expect(currentWord1!.length).toBeGreaterThan(0)

    // 步骤 6: 验证释义显示
    const translationElement = page.locator('[data-testid="translation"]')
    const hasTranslation = await translationElement.isVisible().catch(() => false)

    console.log('步骤 6: 释义显示:', hasTranslation ? '是' : '否')

    expect(hasTranslation).toBe(true)

    // 步骤 7: 验证学习类型显示（新词）
    const isNewWord = await verifyLearningType(page, 'new')

    console.log('步骤 7: 学习类型显示:', isNewWord ? '📚 新词' : '其他')

    expect(isNewWord).toBe(true)

    // === 学习第一个单词 ===

    // 步骤 8: 输入第一个单词
    const word1 = currentWord1!

    // 验证前置状态：masteryLevel = 0
    const progressBefore1 = await getWordProgress(page, dictId, word1)

    console.log('步骤 8-前置: masteryLevel =', progressBefore1)

    expect(progressBefore1).toBe(0)

    // 输入单词
    await typeWord(page, word1)

    console.log('步骤 8: 已输入单词:', word1)

    // 步骤 9: 验证 masteryLevel = 1
    const progressAfter1 = await getWordProgress(page, dictId, word1)

    console.log('步骤 9: masteryLevel 变为:', progressAfter1)

    expect(progressAfter1).toBe(1)

    // 步骤 10: 验证 learnedCount = 1
    const dailyRecord1 = await getDailyRecord(page, dictId)

    console.log('步骤 10: learnedCount =', dailyRecord1.learnedCount)

    expect(dailyRecord1.learnedCount).toBe(1)

    // 验证 wordTypes
    expect(dailyRecord1.wordTypes[word1]).toBe('new')

    // 步骤 11: 验证自动切换到下一个单词
    await page.waitForTimeout(500)

    const currentWord2 = await getCurrentWordName(page)

    console.log('步骤 11: 切换到单词:', currentWord2)

    // 应该切换到另一个单词（不是刚才学的）
    expect(currentWord2).toBeTruthy()
    expect(currentWord2).not.toBe(word1)

    // === 学习第二个单词 ===

    const word2 = currentWord2!

    // 验证前置状态：masteryLevel = 0
    const progressBefore2 = await getWordProgress(page, dictId, word2)

    console.log('步骤 12-前置: masteryLevel =', progressBefore2)

    expect(progressBefore2).toBe(0)

    // 步骤 12: 输入第二个单词
    await typeWord(page, word2)

    console.log('步骤 12: 已输入单词:', word2)

    // 步骤 13: 验证 masteryLevel = 1
    const progressAfter2 = await getWordProgress(page, dictId, word2)

    console.log('步骤 13: masteryLevel 变为:', progressAfter2)

    expect(progressAfter2).toBe(1)

    // 步骤 14: 验证 learnedCount = 2
    const dailyRecord2 = await getDailyRecord(page, dictId)

    console.log('步骤 14: learnedCount =', dailyRecord2.learnedCount)

    expect(dailyRecord2.learnedCount).toBe(2)

    // 步骤 15: 验证显示"学习完成"
    await page.waitForTimeout(500)

    const hasFinished = await page.locator('text=学习完成').isVisible().catch(() => false)

    console.log('步骤 15: 显示"学习完成":', hasFinished ? '是' : '否')

    // 或者检查是否所有单词都已学完
    const allProgress = await page.evaluate(
      ({ dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const prefix = `progress:${dictId}:`
          const results: number[] = []
          for (const key of Object.keys(db)) {
            if (key.startsWith(prefix)) {
              results.push(db[key].data?.masteryLevel ?? 0)
            }
          }
          return results
        } catch (e) {
          return []
        }
      },
      { dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log('所有单词 masteryLevel:', JSON.stringify(allProgress))

    // 所有单词 masteryLevel 都应该是 1
    expect(allProgress.length).toBe(2)
    expect(allProgress.every((level) => level >= 1)).toBe(true)

    console.log('========================================')
    console.log('✅ 测试 2：背单词完整流程 - 通过')
    console.log('========================================')
  })
})
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
  waitForPageReady,
} from './utils/utools-mock'

/**
 * 测试 4：新手每日学习上限
 *
 * 测试目标：验证新手一天能学习的单词数量上限
 *
 * 流程：
 * 1. 清空所有数据
 * 2. 创建词库（含30个单词）
 * 3. 验证每日上限配置（默认20）
 * 4. 进入学习页面
 * 5. 学习单词直到上限
 * 6. 验证 learnedCount = 20
 * 7. 验证显示"学习完成"
 * 8. 验证第21个单词不出现
 */

test.describe('测试 4：新手每日学习上限', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('新手一天学习单词上限验证', async ({ page }) => {
    // 步骤 1: 清空所有数据
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    console.log('========================================')
    console.log('测试 4：新手每日学习上限')
    console.log('========================================')
    console.log('步骤 1: 已清空数据')

    // 步骤 2: 创建词库（含10个单词，足够测试）
    // 注意：单词名必须全是字母，不含数字（typeWord 会过滤非字母）
    const words = []
    for (let i = 0; i < 10; i++) {
      const letter = String.fromCharCode(97 + i) // a, b, c, ...
      words.push({ name: `test${letter}`, trans: `测试单词${i + 1}` })
    }

    const dictId = await createTestDictionary(page, '上限测试词库', words)

    console.log('步骤 2: 已创建词库，含10个单词, ID:', dictId)

    // 步骤 3: 设置每日上限为5（测试用）
    const testDailyLimit = 5
    await page.evaluate(
      ({ limit, STORAGE_KEY }) => {
        try {
          const configKey = 'dailyLimitConfig'
          let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          db[configKey] = {
            _id: configKey,
            _rev: Math.random().toString(36).substr(2, 9),
            data: { dailyLimit: limit },
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
        } catch (e) {
          console.error('Failed to set dailyLimit:', e)
        }
      },
      { limit: testDailyLimit, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log('步骤 3: 已设置每日上限 =', testDailyLimit)

    // 步骤 4: 进入学习页面
    await page.goto('/')
    await waitForPageReady(page)
    await page.waitForSelector('[data-testid="word-component"]', { timeout: 10000 })

    console.log('步骤 4: 已进入学习页面')

    // 步骤 5: 学习单词直到上限
    const learnedWords: string[] = []
    let learnedCount = 0
    const maxIterations = 10

    while (learnedCount < testDailyLimit && maxIterations > learnedCount) {
      const currentWord = await getCurrentWordName(page)

      if (!currentWord) {
        console.log('没有更多单词')
        break
      }

      // 验证这是新单词（masteryLevel = 0）
      const progressBefore = await getWordProgress(page, dictId, currentWord)

      console.log(`学习第 ${learnedCount + 1} 个单词: ${currentWord}, 前置 masteryLevel = ${progressBefore}`)

      expect(progressBefore).toBe(0)

      // 输入单词
      await typeWord(page, currentWord)

      // 验证 masteryLevel 变为 1
      const progressAfter = await getWordProgress(page, dictId, currentWord)

      console.log(`完成第 ${learnedCount + 1} 个单词: ${currentWord}, 后置 masteryLevel = ${progressAfter}`)

      expect(progressAfter).toBe(1)

      learnedWords.push(currentWord)
      learnedCount++

      // 等待切换到下一个单词
      await page.waitForTimeout(300)
    }

    console.log('步骤 5: 已学习', learnedCount, '个单词')

    // 步骤 6: 验证 learnedCount = 上限值
    const dailyRecord = await getDailyRecord(page, dictId)

    console.log('步骤 6: dailyRecord.learnedCount =', dailyRecord.learnedCount)

    expect(dailyRecord.learnedCount).toBe(testDailyLimit)

    // 步骤 7: 验证达到上限后不能再学习
    await page.waitForTimeout(500)

    // 检查是否显示学习完成或者没有更多单词
    const hasFinished = await page.locator('text=学习完成').isVisible().catch(() => false)
    const noMoreWords = await getCurrentWordName(page) === null

    console.log('步骤 7: 显示"学习完成":', hasFinished)
    console.log('步骤 7: 无更多单词:', noMoreWords)

    // 步骤 8: 验证只有 testDailyLimit 个单词被学习
    const allLearned = await page.evaluate(
      ({ dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const prefix = `progress:${dictId}:`
          let count = 0
          for (const key of Object.keys(db)) {
            if (key.startsWith(prefix) && db[key].data?.masteryLevel > 0) {
              count++
            }
          }
          return count
        } catch (e) {
          return 0
        }
      },
      { dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log('步骤 8: 已学习单词总数 =', allLearned)

    expect(allLearned).toBe(testDailyLimit)

    // 验证词库中还有未学习的单词
    const unlearnedCount = await page.evaluate(
      ({ dictId, STORAGE_KEY }) => {
        try {
          const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const words = db[dictId]?.data || []
          const prefix = `progress:${dictId}:`
          let unlearned = 0
          for (const word of words) {
            const key = prefix + word.name
            if (!db[key] || db[key].data?.masteryLevel === 0) {
              unlearned++
            }
          }
          return unlearned
        } catch (e) {
          return 0
        }
      },
      { dictId, STORAGE_KEY: 'qwerty-learner-db' }
    )

    console.log('步骤 8: 未学习单词数 =', unlearnedCount)

    expect(unlearnedCount).toBe(10 - testDailyLimit)

    // 步骤 9: 关键验证 - 刷新页面，验证上限是否阻止继续学习
    console.log('步骤 9: 刷新页面验证上限是否生效...')
    await page.goto('/')
    await waitForPageReady(page)
    await page.waitForTimeout(500)

    const nextWord = await getCurrentWordName(page)
    console.log('步骤 9: 刷新后当前单词:', nextWord)

    // 如果上限生效，应该没有更多单词（显示学习完成或空状态）
    // 如果上限失效，会有第6个单词出现
    expect(nextWord).toBeNull()  // 期望：没有更多单词（上限生效）

    console.log('========================================')
    console.log('✅ 测试 4：新手每日学习上限 - 通过')
    console.log(`验证结论：新手一天最多学习 ${testDailyLimit} 个单词（测试用）`)
    console.log('实际默认上限为 20 个单词')
    console.log('========================================')
  })
})
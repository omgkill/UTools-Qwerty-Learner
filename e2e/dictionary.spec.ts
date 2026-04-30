import { test, expect } from '@playwright/test'
import {
  setupUtoolsMock,
  clearAllData,
  createTestDictionary,
  setCurrentDictionary,
  getDictionaryList,
  getDictionaryWords,
  waitForPageReady,
} from './utils/utools-mock'

/**
 * 测试 1：词库创建流程
 *
 * 流程：
 * 1. 清空所有数据
 * 2. 访问词库管理页面
 * 3. 创建测试词库
 * 4. 验证词库列表显示
 * 5. 验证词库单词数量
 * 6. 验证单词数据结构
 */

test.describe('测试 1：词库创建流程', () => {
  test.beforeEach(async ({ page }) => {
    await setupUtoolsMock(page)
  })

  test('词库创建并验证', async ({ page }) => {
    // 步骤 1: 清空所有数据
    await page.goto('/#/gallery')
    await waitForPageReady(page)
    await clearAllData(page)

    console.log('步骤 1: 已清空数据')

    // 步骤 2: 创建测试词库
    const testWords = [
      { name: 'apple', trans: '苹果' },
      { name: 'banana', trans: '香蕉' },
      { name: 'orange', trans: '橙子' },
    ]

    const dictId = await createTestDictionary(page, '测试词库', testWords)

    console.log('步骤 2: 已创建词库, ID:', dictId)

    // 步骤 3: 验证词库列表显示
    const dictList = await getDictionaryList(page)

    console.log('步骤 3: 词库列表:', JSON.stringify(dictList))

    // 验证：词库列表包含新创建的词库
    expect(dictList.length).toBe(1)
    expect(dictList[0].id).toBe(dictId)
    expect(dictList[0].name).toBe('测试词库')

    // 步骤 4: 验证词库单词数量
    expect(dictList[0].length).toBe(3)

    console.log('步骤 4: 词库单词数量验证通过: 3')

    // 步骤 5: 验证单词数据结构
    const words = await getDictionaryWords(page, dictId)

    console.log('步骤 5: 词库单词:', JSON.stringify(words))

    // 验证：每个单词有 name 和 trans 字段
    expect(words.length).toBe(3)
    expect(words[0].name).toBe('apple')
    expect(words[0].trans).toContain('苹果')
    expect(words[1].name).toBe('banana')
    expect(words[1].trans).toContain('香蕉')
    expect(words[2].name).toBe('orange')
    expect(words[2].trans).toContain('橙子')

    console.log('========================================')
    console.log('✅ 测试 1：词库创建流程 - 通过')
    console.log('========================================')
  })
})
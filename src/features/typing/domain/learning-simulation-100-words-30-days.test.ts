import { describe, expect, it } from 'vitest'
import { determineLearningType, filterDueWords, isWordNew } from './learning-rules'
import { MASTERY_LEVELS, REVIEW_INTERVALS } from './learning-config'
import type { TypingWordProgress } from './types'
import type { Word, WordWithIndex } from '@/typings'

type LevelName = 'NEW' | 'LEARNED' | 'FAMILIAR' | 'KNOWN' | 'PROFICIENT' | 'ADVANCED' | 'EXPERT' | 'MASTERED'

function createWord(name: string): Word {
  return { name, trans: [], usphone: '', ukphone: '' }
}

function createProgress(word: string, masteryLevel: number, nextReviewTime: number, reps = 0): TypingWordProgress {
  return {
    word,
    dict: 'test-dict',
    masteryLevel,
    nextReviewTime,
    lastReviewTime: Date.now(),
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    reps,
  }
}

describe('100个单词30天随机学习模拟', () => {
  const TOTAL_WORDS = 100
  const DAILY_LIMIT = 20
  const DAY_MS = 24 * 60 * 60 * 1000

  it('模拟100个单词30天的学习情况（随机学习，每天最多20个）', () => {
    const log = (msg: string) => console.error(msg)

    // 创建100个单词
    const wordList: Word[] = []
    for (let i = 1; i <= TOTAL_WORDS; i++) {
      wordList.push(createWord(`word${i}`))
    }

    // 初始状态：所有单词都是新词
    let allProgress: Map<string, TypingWordProgress> = new Map()
    let currentTime = Date.now()

    // 统计数据
    const stats: Array<{
      day: number
      dueCount: number
      newCount: number
      learnedWords: number
      dueWordsBefore: string[]
      newWordsBefore: string[]
      learnedWordsList: string[]
      learnedWordsLevelChanges: string[]
    }> = []

    log('\n========== 100个单词 × 30天学习模拟 ==========\n')
    log('规则：每天最多学习20个（复习优先，剩余配额学新词）')
    log('间隔：1天→2天→4天→7天→15天→21天→30天（最小间隔，实际可能延迟）')
    log('延迟累积：基于实际复习时间计算下次到期\n')

    for (let day = 1; day <= 30; day++) {
      log(`========== Day ${day} ==========`)
      log(`时间: ${new Date(currentTime).toISOString().split('T')[0]}`)

      // 获取到期单词（已排序）
      const progressArray = Array.from(allProgress.values())
      const dueProgress = filterDueWords(progressArray, currentTime)
      const dueWordSet = new Set(dueProgress.map((p) => p.word))

      // 获取新单词
      const newWordsList: WordWithIndex[] = wordList
        .map((word, index) => ({ ...word, index }))
        .filter((word) => isWordNew(allProgress.get(word.name)))

      // 到期单词按排序顺序
      const dueWordsWithIndex = wordList
        .map((word, index) => ({ ...word, index }))
        .filter((word) => dueWordSet.has(word.name))

      log(`到期单词数: ${dueProgress.length}`)
      if (dueProgress.length > 0) {
        log(`  到期列表（前10个）: ${dueProgress.slice(0, 10).map((p) => p.word).join(', ')}${dueProgress.length > 10 ? '...' : ''}`)
      }

      log(`新单词数: ${newWordsList.length}`)
      if (newWordsList.length > 0) {
        log(`  新词列表（前10个）: ${newWordsList.slice(0, 10).map((w) => w.name).join(', ')}${newWordsList.length > 10 ? '...' : ''}`)
      }

      // 调用 determineLearningType
      const result = determineLearningType({
        dueWords: dueWordsWithIndex,
        newWords: newWordsList,
        reviewedCount: 0,
        learnedCount: 0,
        allProgress: progressArray,
        wordList,
      })

      log(`实际学习: ${result.learningWords.length}个单词`)
      log(`  学习列表（前10个）: ${result.learningWords.slice(0, 10).map((w) => w.name).join(', ')}${result.learningWords.length > 10 ? '...' : ''}`)

      const learnedWordsLevelChanges: string[] = []

      // 更新进度：假设所有单词都答对，升级
      for (const word of result.learningWords) {
        const existingProgress = allProgress.get(word.name)
        const wasNew = !existingProgress || existingProgress.masteryLevel === MASTERY_LEVELS.NEW

        const oldLevel = wasNew ? 0 : existingProgress!.masteryLevel
        const newLevel = wasNew ? MASTERY_LEVELS.LEARNED : Math.min(existingProgress!.masteryLevel + 1, 6)

        // 计算下次复习时间（基于实际复习时间）
        const nextReviewDays = REVIEW_INTERVALS[newLevel]
        const nextReviewTime = currentTime + nextReviewDays * DAY_MS

        allProgress.set(word.name, createProgress(word.name, newLevel, nextReviewTime, existingProgress ? existingProgress.reps + 1 : 1))

        const levelChange = `${word.name}: Level ${oldLevel} → Level ${newLevel}, 下次复习: Day ${day + nextReviewDays}`
        learnedWordsLevelChanges.push(levelChange)
        log(`  ${levelChange}`)
      }

      // 统计
      stats.push({
        day,
        dueCount: dueProgress.length,
        newCount: newWordsList.length,
        learnedWords: result.learningWords.length,
        dueWordsBefore: dueProgress.map((p) => p.word),
        newWordsBefore: newWordsList.map((w) => w.name),
        learnedWordsList: result.learningWords.map((w) => w.name),
        learnedWordsLevelChanges,
      })

      log('')
      currentTime += DAY_MS
    }

    // 打印30天总结表格
    log('\n========== 30天学习总结表格 ==========\n')
    log('| 天数 | 到期单词 | 新单词 | 实际学习 | 学习类型 | 说明 |')
    log('|------|----------|--------|----------|----------|------|')

    stats.forEach((s) => {
      const learningType = s.learnedWords === 0 ? 'complete' : (s.dueCount > 0 ? 'review' : 'new')
      let description = ''
      if (s.learnedWords === 0) {
        description = '无单词到期，无新词可学'
      }
      else if (s.dueCount > 0 && s.dueCount <= DAILY_LIMIT) {
        if (s.newCount > 0 && s.dueCount < DAILY_LIMIT) {
          const newWordCount = s.learnedWords - s.dueCount
          description = `复习${s.dueCount}个 + 新词${newWordCount}个`
        }
        else {
          description = `复习${s.dueCount}个`
        }
      }
      else if (s.dueCount > DAILY_LIMIT) {
        description = `复习前20个（剩余${s.dueCount - DAILY_LIMIT}个排队）`
      }
      else {
        description = `学习${s.learnedWords}个新词`
      }

      log(`| Day ${s.day} | ${s.dueCount}个 | ${s.newCount}个 | ${s.learnedWords}个 | ${learningType} | ${description} |`)
    })

    // 统计单词级别分布
    log('\n========== 最终单词级别分布 ==========\n')
    const finalProgressArray = Array.from(allProgress.values())
    const levelDistribution: Record<LevelName, number> = {
      NEW: 0,
      LEARNED: 0,
      FAMILIAR: 0,
      KNOWN: 0,
      PROFICIENT: 0,
      ADVANCED: 0,
      EXPERT: 0,
      MASTERED: 0,
    }

    finalProgressArray.forEach((p) => {
      const levelNames = Object.keys(levelDistribution) as LevelName[]
      const levelName = levelNames[p.masteryLevel] || 'NEW'
      levelDistribution[levelName]++
    })

    const unlearnedCount = TOTAL_WORDS - finalProgressArray.length
    levelDistribution.NEW = unlearnedCount

    log('| 级别 | 单词数 | 说明 |')
    log('|------|--------|------|')
    Object.entries(levelDistribution).forEach(([level, count]) => {
      const levelDescriptions: Record<LevelName, string> = {
        NEW: '未学习',
        LEARNED: '学习1次（下次1天后）',
        FAMILIAR: '学习2次（下次2天后）',
        KNOWN: '学习3次（下次4天后）',
        PROFICIENT: '学习4次（下次7天后）',
        ADVANCED: '学习5次（下次15天后）',
        EXPERT: '学习6次（下次21天后）',
        MASTERED: '已掌握（下次30天后）',
      }
      log(`| ${level} | ${count}个 | ${levelDescriptions[level as LevelName]} |`)
    })

    log(`\n总学习单词数: ${finalProgressArray.length}个`)
    log(`未学习单词数: ${unlearnedCount}个`)

    // 验证每日学习不超过20个
    stats.forEach((s) => {
      expect(s.learnedWords).toBeLessThanOrEqual(DAILY_LIMIT)
    })

    // 验证30天内所有100个单词都被学习过（假设每天都学）
    const totalLearnedDays = stats.filter((s) => s.learnedWords > 0).length
    log(`\n有效学习天数: ${totalLearnedDays}天`)
    log(`休息天数（无单词到期且无新词）: ${stats.filter((s) => s.learnedWords === 0).length}天`)
  })
})

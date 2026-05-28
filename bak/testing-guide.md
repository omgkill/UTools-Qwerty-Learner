# 测试架构与用例文档

> 文档版本：v2.0  
> 最后更新：2026-02-28  
> 覆盖范围：单元测试、集成测试、组件测试、E2E 测试

---

## 一、测试架构

### 1.1 测试金字塔

```
                    /\
                   /  \  
                  / E2E\     ← 真实浏览器测试（4 个测试）
                 /------\
                /        \   
               / 组件测试  \  ← UI 层测试（22 个测试）
              /------------\
             /              \   
            /    集成测试     \  ← 状态变化验证（53 个测试）
           /------------------\
          /                    \   
         /      单元测试         \  ← 纯函数测试（81 个测试）
        /------------------------\
```

### 1.2 测试层次概览

| 层次 | 测试文件 | 测试数 | 职责 | 状态 |
|------|---------|--------|------|------|
| **E2E 测试** | `e2e/typing.spec.ts` | 4 | 真实浏览器验证 | ✅ |
| **组件测试** | `WordPanel/index.test.tsx` | 7 | WordPanel 组件渲染 | ✅ |
| **组件测试** | `Translation/index.test.tsx` | 15 | Translation 组件渲染 | ✅ |
| **集成测试** | `wordLearning.integration.test.ts` | 13 | 完整学习流程验证 | ✅ 新增 |
| **集成测试** | `integration.test.ts` | 28 | 状态变化与交互 | ✅ |
| **集成测试** | `masteredReplacement.test.ts` | 8 | 掌握单词替换逻辑 | ✅ |
| **集成测试** | `repeatLearning.test.ts` | 9 | 重复学习功能 | ✅ |
| **模拟测试** | `learningSimulation.test.ts` | 13 | 学习场景模拟 | ✅ |
| **单元测试** | `learningLogic.test.ts` | 40 | 学习类型判断逻辑 | ✅ 更新 |
| **单元测试** | `progress.test.ts` | 42 | 数据结构与纯函数 | ✅ |
| **基础测试** | `basic.test.ts` | 2 | 测试环境验证 | ✅ |

**总计：176 个测试用例，全部通过 ✅**

### 1.3 测试文件结构

```
src/
├── e2e/
│   └── typing.spec.ts                   # E2E 测试（真实浏览器）
├── test/
│   ├── basic.test.ts                    # 基础测试
│   └── setup.ts                         # 测试环境配置
├── utils/db/
│   ├── progress.test.ts                 # 进度数据结构测试
│   └── hooks/
│       └── useDailyRecord.ts            # 每日记录 Hook
└── pages/Typing/
    ├── hooks/
    │   ├── learningLogic.test.ts        # 学习逻辑测试 ⭐ 核心
    │   ├── wordLearning.integration.test.ts  # 单词学习集成测试 ⭐ 新增
    │   ├── learningSimulation.test.ts   # 学习模拟测试
    │   ├── integration.test.ts          # 集成测试
    │   ├── masteredReplacement.test.ts  # 掌握替换测试
    │   └── repeatLearning.test.ts       # 重复学习测试
    └── components/
        ├── WordPanel/
        │   └── index.test.tsx           # WordPanel 组件测试
        └── Translation/
            └── index.test.tsx           # Translation 组件测试
```

---

## 二、核心业务逻辑与测试策略

### 2.1 学习配置规则

```typescript
每日学习配额 = 20 个词（新词 + 复习词）
复习优先级 > 新词
掌握单词不计入配额
额外复习机制：超过 20 个到期词时可额外复习
```

### 2.2 关键业务逻辑更新（2026-02-28）

#### 🎯 核心修复：自动补充新词机制

**修复前的问题**：
- 到期词不足 20 个时，不会自动补充新词
- 需要"重新打开界面"才能学习新词
- 用户体验不连贯

**修复后的逻辑**：
```typescript
// determineLearningType 函数核心逻辑
if (dueWords.length > 0) {
  const remaining = DAILY_LIMIT - reviewedCount - learnedCount
  
  // 如果到期词不足剩余配额，自动补充新词
  if (dueWords.length < remaining) {
    const newWordQuota = remaining - dueWords.length
    return {
      learningType: 'review',
      learningWords: [
        ...dueWords.slice(0, remaining),
        ...newWords.slice(0, newWordQuota)
      ]
    }
  }
  
  // 否则只返回到期词
  return {
    learningType: 'review',
    learningWords: dueWords.slice(0, remaining)
  }
}
```

**验证场景**：
1. 第一天学习 15 个新词（没学满）
2. 第二天有 15 个到期词
3. **系统立即自动补充 5 个新词**，凑满 20 个
4. 用户可以连续学习：先复习 15 个，再学 5 个新词

### 2.3 测试设计原则

#### 原则 1：测试需求，不是测试实现
```
❌ 错误：根据当前代码行为写断言
✅ 正确：根据需求文档写断言
```

#### 原则 2：验证变化
```
❌ 错误：只验证结果
✅ 正确：验证操作前后的状态变化
```

#### 原则 3：对比测试
```
❌ 错误：只测试一种情况
✅ 正确：对比不同参数的不同行为
```

### 2.4 测试覆盖矩阵

| 需求规则 | 测试文件 | 测试用例 | 状态 |
|---------|---------|---------|------|
| 每日学习上限默认 20 个 | progress.test.ts | `should have default daily limit of 20` | ✅ |
| 复习优先 | learningLogic.test.ts | `should prioritize review over new words` | ✅ |
| **新词配额计算（自动补充）** | learningLogic.test.ts | `should keep review priority over new words regardless of quota` | ✅ 更新 |
| **边界条件：新词配额计算** | wordLearning.integration.test.ts | `边界条件：新词配额计算 - 复习 15 个词后还能学习 5 个新词` | ✅ 新增 |
| 额外复习不计入总量 | integration.test.ts | `should not affect daily limit when doing extra review` | ✅ |
| 目标达成返回空列表 | integration.test.ts | `should return EMPTY learningWords when target reached` | ✅ |
| isExtraReview 行为 | learningLogic.test.ts | `should return all due words when isExtraReview=true` | ✅ |
| 15 天与 100 词时间线 | learningSimulation.test.ts | `should match the first 15 days summary table` | ✅ |
| 额外复习计数分流 | integration.test.ts | `should keep counts separated after extra review flow` | ✅ |
| 配额与剩余一致 | learningLogic.test.ts | `should keep quota and remainingForTarget consistent` | ✅ |
| 巩固模式槽位限制 | learningLogic.test.ts | `should cap consolidate words by remaining slots` | ✅ |
| 额外复习后目标达成 | integration.test.ts | `should keep target reached state unchanged after extra review` | ✅ |
| 巩固模式多天稳定 | learningSimulation.test.ts | `should stay in consolidate mode across consecutive days` | ✅ |
| 复习间隔 4/7/15/21/30 天 | learningSimulation.test.ts | `should schedule next review at 4/7/15/21/30 days after correct review` | ✅ |
| 首日输错仍算新词 | learningSimulation.test.ts | `should schedule next review to tomorrow for a new word with wrong inputs` | ✅ |
| 掌握单词替换机制 | masteredReplacement.test.ts | 完整流程验证 | ✅ |
| 重复学习功能 | repeatLearning.test.ts | 完整流程验证 | ✅ |

---

## 三、测试用例详细文档

### 3.1 wordLearning.integration.test.ts - 单词学习集成测试 ⭐ 核心

**测试文件**: `src/pages/Typing/hooks/wordLearning.integration.test.ts`  
**测试数**: 13 个  
**职责**: 验证完整的单词学习流程，包括新词学习、复习、掌握、额外复习等场景

#### 3.1.1 基础学习流程测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-01 | 词库 100 词 -> 第一天背 20 个新词 -> 中间多次输入失败 | 新用户，有错误输入 | 20 个新词，无复习词 | 错误输入不影响学习类型 |
| WL-02 | 词库 100 词 -> 第一天背 20 个新词 -> 每个单词都正确输入 | 完美学习 | 20 个新词，无复习词 | 正确输入流程 |
| WL-03 | 词库 100 词 -> 第一天背 20 个新词 -> 部分单词错误输入后正确 | 混合输入 | 20 个新词，无复习词 | 错误后正确仍算新词 |

#### 3.1.2 数据一致性测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-04 | 学习详情显示学过的单词不应在背单词列表中再次出现 | 数据一致性 | 不重复显示 | 数据同步正确 |

#### 3.1.3 复习机制测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-05 | 词库 100 词 -> 第一天学习 20 个新词 -> 第二天应该复习这些单词 | 次日复习 | 20 个复习词 | 复习机制正确 |

#### 3.1.4 Bug 验证测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-06 | Bug 验证：新词输入错误后完成，masteryLevel 应变为 LEARNED 而非保持 NEW | 错误后正确 | masteryLevel=1 | Bug 修复验证 |

#### 3.1.5 掌握单词机制测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-07 | 第一天和第二天：学习 20 词过程中，有两个词点击掌握 -> 验证学习详情 | 掌握 2 个词 | 第一天 20 新词，第二天 18 复习 +2 新词 | 掌握单词不占配额 |
| WL-08 | 第二天学习完后重新打开界面，验证达到每日目标 | 完成学习 | learningType='complete' | 目标达成 |

#### 3.1.6 额外复习机制测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-09 | 额外复习机制：到期词超过 20 个时，应该只复习前 20 个，剩余的可额外复习 | 35 个到期词 | 20 个复习 +15 个额外复习 | 额外复习触发 |

#### 3.1.7 巩固模式测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-10 | 巩固模式：无到期词且无新词时，应该进入巩固模式 | 无新词无复习 | learningType='consolidate' | 巩固模式触发 |

#### 3.1.8 混合场景测试

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-11 | 混合场景：部分复习 + 部分新词 + 掌握单词的复杂场景 | 复杂场景 | 正确混合 | 复杂场景处理 |

#### 3.1.9 边界条件测试 ⭐ 核心

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WL-12 | 边界条件：刚好达到每日上限 20 个词 | 20 个词 | learningType='complete' | 上限判断 |
| **WL-13** | **边界条件：新词配额计算 - 复习 15 个词后还能学习 5 个新词** | **15 个复习词** | **自动补充 5 个新词，共 20 个** | **自动补充机制 ⭐** |

#### 3.1.9.1 详细测试流程：WL-13

```typescript
/**
 * 测试用例：边界条件 - 新词配额计算
 * 
 * 业务场景：
 * 第一天：用户只学习了 15 个新词（没学满 20 个就停了）
 * 第二天：打开界面时，系统应该自动补充新词，凑满 20 个（15 个复习 + 5 个新词）
 * 
 * 核心逻辑：
 * 1. 每日配额 = 20 个词（新词 + 复习词）
 * 2. 第二天有 15 个到期词（第一天学习的 15 个）
 * 3. 系统应该立即补充 5 个新词，凑满 20 个（20 - 15 = 5）
 * 4. 用户可以先复习 15 个词，然后学习 5 个新词
 * 
 * 验证点：
 * - 界面打开时自动补充新词，无需重新打开界面
 * - 复习词优先，新词补充
 * - 每日配额计算正确：reviewedCount + learnedCount = 20
 */

测试流程：
1. 初始化阶段：初始化所有单词进度
2. 第一天：只学习 15 个新词（模拟没学满）
3. 前进到第二天：让第一天的 15 个词到期
4. 加载第二天会话：验证系统自动补充 5 个新词
5. 用户学习：先复习 15 个词，再学习 5 个新词
6. 验证结果：15 个复习 + 5 个新词 = 20 个
```

---

### 3.2 learningLogic.test.ts - 学习逻辑测试 ⭐ 核心

**测试文件**: `src/pages/Typing/hooks/learningLogic.test.ts`  
**测试数**: 40 个  
**职责**: 验证 `determineLearningType` 函数的所有逻辑分支

#### 3.2.1 Review Mode（复习模式）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| RL-01 | should return review mode when there are due words | dueWords=[apple] | learningType='review' | 有到期词进入复习 |
| RL-02 | should limit review words by remaining slots | dueWords=10, reviewedCount=18 | learningWords.length=2 | 按剩余槽位限制 |
| RL-03 | should return complete with hasMoreDueWords when target reached | dueWords=[apple], reviewedCount=20 | learningType='complete', hasMoreDueWords=true | 目标达成有剩余到期词 |
| RL-04 | should prioritize review over new words | dueWords=[apple], newWords=[banana] | learningType='review' | 复习优先 |

#### 3.2.2 New Word Mode（新词模式）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| NW-01 | should return new mode when no due words and has quota | dueWords=[], newWords=[apple,banana] | learningType='new' | 无到期词有配额 |
| NW-02 | should limit new words by quota | newWords=50, quota=20 | learningWords.length=20 | 按配额限制 |
| NW-03 | should return 0 new words when quota is exhausted | newWords=[apple], reviewedCount=15, learnedCount=5 | learningType='complete' | 配额耗尽 |
| NW-04 | should calculate quota correctly | reviewedCount=5, learnedCount=3 | learningWords.length=12 | 配额计算正确 |

#### 3.2.3 Complete Mode（完成模式）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| CM-01 | should return complete when target is reached | reviewedCount=10, learnedCount=10 | learningType='complete' | 目标达成 |
| CM-02 | should return complete when target exceeded | reviewedCount=15, learnedCount=10 | learningType='complete' | 超过目标 |
| CM-03 | should return complete when reviewedCount reaches DAILY_LIMIT | reviewedCount=20 | learningType='complete' | 复习达到上限 |

#### 3.2.4 Consolidate Mode（巩固模式）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| CS-01 | should return consolidate when no due words, no quota, but target not reached | reviewedCount=5, learnedCount=5 | learningType='consolidate' | 巩固模式触发 |
| CS-02 | should only include words with masteryLevel between 1 and 6 | 有已掌握单词 | 只返回未完全掌握词 | 巩固范围正确 |

#### 3.2.5 Extra Review Mode（额外复习模式）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| EX-01 | should return all due words when isExtraReview=true | dueWords=30, isExtraReview=true | learningWords.length=30 | 返回所有到期词 |
| EX-02 | should ignore daily limit when isExtraReview=true | reviewedCount=50, isExtraReview=true | learningWords.length=dueWords.length | 忽略每日上限 |
| EX-03 | should trigger extra review when target reached with due words | dueWords=25, reviewedCount=20 | learningType='complete', hasMoreDueWords=true | 触发额外复习提示 |

#### 3.2.6 规则不变式（Invariant） ⭐ 核心

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| **IV-01** | **should keep review priority over new words regardless of quota** | **dueWords=2, newWords=2** | **learningWords.length=4（2 复习 +2 新词）** | **复习优先 + 自动补充 ⭐** |
| IV-02 | should return complete with empty list when target reached and no due words | reviewed+learned=上限 | learningType='complete' | 达标完成 |
| IV-03 | should keep remainingDueCount aligned with hasMoreDueWords | dueWords 超出剩余槽位 | remainingDueCount 正确 | 余量一致 |
| IV-04 | should set remainingDueCount to 0 when all due words fit | dueWords<=剩余槽位 | remainingDueCount=0 | 余量清零 |
| IV-05 | should cap review words by remaining slots when not extra review | dueWords 大量 | learningWords=remaining | 槽位限制 |
| IV-06 | should return all due words when extra review is enabled | isExtraReview=true | learningWords=dueWords | 额外复习放开 |
| IV-07 | should limit new words by remaining slots when no due words | reviewed+learned 占用槽位 | learningWords=remaining | 配额限制 |
| IV-08 | should return complete when no due words and no new words and target reached | 无词且达标 | learningType='complete' | 完成判定 |
| IV-09 | should keep quota and remainingForTarget consistent | 多组计数组合 | quota 一致 | 公式一致 |
| IV-10 | should match hasReachedDailyTarget with total counts | reviewed+learned 组合 | true/false 一致 | 目标一致 |
| IV-11 | should return empty consolidate list when no learned words exist | 无可巩固词 | learningWords=0 | 空巩固 |
| IV-12 | should cap consolidate words by remaining slots | 剩余槽位 2 | learningWords=2 | 槽位限制 |

---

### 3.3 integration.test.ts - 集成测试

**测试文件**: `src/pages/Typing/hooks/integration.test.ts`  
**测试数**: 28 个  
**职责**: 验证状态变化与交互

#### 3.3.1 New Word Learning Flow（新词学习流程）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| IN-01 | should count as learned when completing a new word for the first time | progress=undefined, isCorrect=true | learnedCount=1 | 首次完成计入学习 |
| IN-02 | should count as learned even when new word has wrong inputs | progress=undefined, wrongCount=2 | learnedCount=1 | 有错误也计入学习 |
| IN-03 | should count as learned when reps is 0 even if progress exists | reps=0 | isNewWord=true | reps=0 是新词 |

#### 3.3.2 Review Flow（复习流程）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| RV-01 | should count as reviewed when completing a word with reps > 0 | reps=1 | reviewedCount=1 | 复习计入 |
| RV-02 | should increase mastery level when reviewing correctly | masteryLevel=1, isCorrect=true | newLevel=2 | 等级提升 |

#### 3.3.3 Extra Review Flow（额外复习流程）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| EF-01 | should count as extraReviewedCount when isExtraReview is true | isExtraReview=true | extraReviewedCount=1 | 额外复习计数 |
| EF-02 | should not affect daily limit when doing extra review | isExtraReview=true, count=5 | reviewedCount 不变 | 不影响配额 |
| EF-03 | should keep quota unchanged while extraReviewedCount increases | extraReviewedCount+3 | quota=0 | 配额不变 |
| EF-04 | should keep counts separated after extra review flow | 额外复习后 | reviewedCount 不变 | 计数分流 |
| EF-05 | should keep target reached state unchanged after extra review | extraReviewedCount+4 | hasReachedTarget=true | 目标不变 |

#### 3.3.4 Critical Bug Scenarios（关键 Bug 场景）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| BG-01 | should not double count when word is completed twice | 完成两次 | 第一次 learnedCount++, 第二次 reviewedCount++ | 不重复计数 |
| BG-02 | should correctly identify new word vs review based on reps | reps=0/1/5 | isNewWord 正确判断 | reps 判断正确 |
| BG-03 | should handle rapid word completions without race conditions | 快速完成 5 个 | learnedCount=5 | 无竞态条件 |

#### 3.3.5 Extra Review Button Bug（额外复习按钮 Bug）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| BB-01 | should return all due words when isExtraReview is true | isExtraReview=true | learningWords.length=18 | 返回所有到期词 |
| BB-02 | should return EMPTY learningWords when isExtraReview is false and target reached | isExtraReview=false, reviewedCount=20 | learningWords.length=0 | 返回空列表 |
| BB-03 | should show different results before and after clicking extra review button | 点击前后对比 | 前后结果不同 | 状态变化验证 |

---

### 3.4 learningSimulation.test.ts - 学习模拟测试

**测试文件**: `src/pages/Typing/hooks/learningSimulation.test.ts`  
**测试数**: 13 个  
**职责**: 模拟真实学习场景

#### 3.4.1 Daily Simulation（每日模拟）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| LS-01 | Day 1: 0 due words, learn 20 new words | 新用户 | newWordsLearned=20 | 首日学习 |
| LS-02 | Day 2: 20 due words, review 20 words | 复习日 | wordsReviewed=20 | 复习优先 |
| LS-03 | Day 3: 0 due words, learn 20 new words | 新词日 | newWordsLearned=20 | 间隔学习 |
| LS-04 | should schedule next review to tomorrow for a new word with wrong inputs | 首日输错 | nextReviewTime=+1 天 | 首日仍为新词 |

#### 3.4.2 Timeline Simulation（时间线模拟）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| TL-01 | should complete 100 new words on day 14 with expected new word days | 100 个词 | day=14, days=[1,3,6,10,14] | 里程碑验证 |
| TL-02 | should match first 15 days summary table | 15 天模拟 | 与文档一致 | 场景验证 |

#### 3.4.3 Consolidate Stability（巩固稳定性）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| CS-01 | should stay in consolidate mode across consecutive days | 连续 3 天无新词 | learningType=consolidate | 模式稳定 |

#### 3.4.4 Review Interval Golden Cases（复习间隔黄金断言）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| RG-01 | should schedule next review at 4/7/15/21/30 days after correct review | masteryLevel=2/3/4/5/6/7 | nextReviewTime=+4/+7/+15/+21/+30 天 | 间隔节点 |

#### 3.4.5 Extra Review Scenario（额外复习场景）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| ES-01 | should handle scenario where due words exceed DAILY_LIMIT | 35 个到期词 | reviewed=20, remaining=15 | 额外复习触发 |
| ES-02 | should keep remaining due words for the next day with reduced quota | 次日继续 | dueWords=15, quota=5 | 次日验证 |

---

### 3.5 masteredReplacement.test.ts - 掌握单词替换测试

**测试文件**: `src/pages/Typing/hooks/masteredReplacement.test.ts`  
**测试数**: 8 个  
**职责**: 验证掌握单词后立即补充新词的机制

#### 3.5.1 Mastered Word Replacement（掌握单词替换）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| MR-01 | should replace mastered word with new word immediately | 点击掌握 | 立即补充新词 | 掌握替换机制 |
| MR-02 | should not count mastered word in daily quota | 掌握单词 | 不计入配额 | 配额计算正确 |
| MR-03 | should handle multiple mastered words in one session | 掌握多个词 | 补充多个新词 | 批量处理 |

---

### 3.6 repeatLearning.test.ts - 重复学习测试

**测试文件**: `src/pages/Typing/hooks/repeatLearning.test.ts`  
**测试数**: 9 个  
**职责**: 验证重复学习功能

#### 3.6.1 Repeat Learning Flow（重复学习流程）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| RL-01 | should load today's learned words for repeat learning | 重复学习 | 加载今日单词 | 重复学习加载 |
| RL-02 | should allow re-learning words without affecting daily quota | 重复学习 | 不影响配额 | 配额独立 |

---

### 3.7 Translation/index.test.tsx - Translation 组件测试

**测试文件**: `src/pages/Typing/components/Translation/index.test.tsx`  
**测试数**: 15 个  
**职责**: 验证 Translation 组件渲染

#### 3.7.1 Rendering（渲染测试）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| TR-01 | should render translations when trans is not empty | trans=['n. 苹果', 'n. 公司'] | 显示"n. 苹果；n. 公司" | 正常渲染 |
| TR-02 | should render tense when provided | trans=['n. 苹果'], tense='pl. apples' | 显示时态信息 | 时态显示 |
| TR-03 | should return null when trans is empty and no tense | trans=[] | 不渲染任何内容 | 空数据处理 |
| TR-04 | should return null when trans has only empty strings | trans=['', '  ', ''] | 不渲染任何内容 | 空字符串过滤 |
| TR-05 | should render tense even when trans is empty | trans=[], tense='pl. apples' | 显示时态 | 时态独立显示 |

#### 3.7.2 Data Handling（数据处理）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| TD-01 | should filter out empty strings from trans | trans=['n. 苹果', '', 'n. 公司', '  '] | 显示"n. 苹果；n. 公司" | 空字符串过滤 |
| TD-02 | should limit display to 6 translations | trans=['1','2','3','4','5','6','7','8'] | 显示前 6 个 | 数量限制 |

#### 3.7.3 Edge Cases（边界情况）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| TE-01 | should handle single translation | trans=['n. 苹果'] | 显示单个释义 | 单条数据处理 |
| TE-02 | should handle very long translation | 超长释义文本 | 正常显示 | 长文本处理 |
| TE-03 | should handle special characters in translation | trans=['<script>alert("xss")</script>'] | 安全显示 | XSS 防护 |
| TE-04 | should handle unicode characters | trans=['n. 🍎 苹果'] | 显示 emoji | Unicode 支持 |

#### 3.7.4 Null/Undefined Handling（空值处理）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| TN-01 | should handle undefined trans gracefully | trans=undefined | 不崩溃，返回 null | undefined 处理 |
| TN-02 | should handle null trans gracefully | trans=null | 不崩溃，返回 null | null 处理 |
| TN-03 | should trim whitespace from translations | trans=['  n. 苹果  '] | 显示"n. 苹果" | 空格去除 |

---

### 3.8 WordPanel/index.test.tsx - WordPanel 组件测试

**测试文件**: `src/pages/Typing/components/WordPanel/index.test.tsx`  
**测试数**: 7 个  
**职责**: 验证 WordPanel 组件渲染

#### 3.8.1 Rendering（渲染测试）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WP-01 | should render current word | 有单词数据 | 显示当前单词 | 单词渲染 |
| WP-02 | should render translation when isTransVisible is true | isTransVisible=true | 显示释义组件 | 释义显示 |
| WP-03 | should handle word without translation | trans=[] | 不崩溃 | 空数据处理 |

#### 3.8.2 Edge Cases（边界情况）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WE-01 | should handle empty words array | words=[] | 不崩溃 | 空数组处理 |
| WE-02 | should handle word with empty trans array | trans=[] | 不崩溃 | 空释义处理 |
| WE-03 | should handle word with undefined trans | trans=undefined | 不崩溃 | undefined 处理 |

#### 3.8.3 UI State（UI 状态）

| 用例 ID | 用例名称 | 场景 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WU-01 | should show start prompt when not typing | isTyping=false | 显示"按任意键" | 开始提示 |

---

### 3.9 progress.test.ts - 进度数据结构测试

**测试文件**: `src/utils/db/progress.test.ts`  
**测试数**: 42 个  
**职责**: 验证数据结构与纯函数

#### 3.9.1 WordProgress（单词进度）

| 用例 ID | 用例名称 | 输入 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| WP-01 | should create a new word progress with default values | word='apple', dict='dict-1' | masteryLevel=0, correctCount=0, reps=0 | 默认值正确 |
| WP-02 | should calculate accuracy correctly | correctCount=8, wrongCount=2 | accuracy=80 | 正确率计算 |
| WP-03 | should return correct mastery label | masteryLevel=0 | label='新词' | 等级标签 |
| WP-04 | should check if word is due for review | nextReviewTime < now | isDue=true | 到期判断 |

#### 3.9.2 DailyRecord（每日记录）

| 用例 ID | 用例名称 | 输入 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| DR-01 | should return DAILY_LIMIT when no activity | reviewedCount=0, learnedCount=0 | quota=20 | 初始配额 |
| DR-02 | should subtract reviewed words from quota | reviewedCount=5 | quota=15 | 复习消耗配额 |
| DR-03 | should subtract learned words from quota | learnedCount=5 | quota=15 | 学习消耗配额 |
| DR-04 | should subtract both from quota | reviewedCount=8, learnedCount=7 | quota=5 | 同时消耗 |
| DR-05 | should return 0 when quota is exhausted | reviewedCount=10, learnedCount=10 | quota=0 | 配额耗尽 |
| DR-06 | should not return negative values | reviewedCount=25 | quota=0 | 防止负数 |
| DR-07 | should identify when target reached | reviewedCount=10, learnedCount=10 | hasReachedTarget=true | 目标达成 |

#### 3.9.3 updateMasteryLevel（掌握等级更新）

| 用例 ID | 用例名称 | 输入 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| ML-01 | should increase level when correct with no wrongs | level=0, isCorrect=true, wrongCount=0 | newLevel=1 | 正确升级 |
| ML-02 | should advance from NEW when correct but with wrongs | level=0, isCorrect=true, wrongCount=2 | newLevel=1 | 有错误也升级 |
| ML-03 | should decrease level when wrong | level=2, isCorrect=false | newLevel=1 | 错误降级 |
| ML-04 | should not decrease below NEW level | level=0, isCorrect=false | newLevel=0 | 最低等级 |
| ML-05 | should not increase above MASTERED level | level=7, isCorrect=true | newLevel=7 | 最高等级 |
| ML-06 | should cap ease factor at 3.0 | easeFactor=2.95, isCorrect=true | newEaseFactor=3.0 | 难度因子上限 |
| ML-07 | should not decrease ease factor below 1.3 | easeFactor=1.4, isCorrect=false | newEaseFactor=1.3 | 难度因子下限 |

#### 3.9.4 Extra Review（额外复习）

| 用例 ID | 用例名称 | 输入 | 预期输出 | 验证点 |
|--------|---------|------|---------|--------|
| ER-01 | should create daily record with extraReviewedCount=0 | - | extraReviewedCount=0 | 默认值 |
| ER-02 | should calculate totalReviewed correctly | reviewedCount=20, extraReviewedCount=5 | totalReviewed=25 | 总复习数 |
| ER-03 | should identify when in extra review quota | reviewedCount=20 | hasExtraReviewQuota=true | 额外复习判断 |
| ER-04 | should not count extraReviewedCount in getNewWordQuota | reviewedCount=10, extraReviewedCount=15 | quota=10 | 额外复习不影响配额 |

---

### 3.10 e2e/typing.spec.ts - E2E 测试

**测试文件**: `src/e2e/typing.spec.ts`  
**测试数**: 4 个  
**职责**: 真实浏览器验证

#### 3.10.1 Browser Tests（浏览器测试）

| 用例 ID | 用例名称 | 验证内容 | 预期结果 |
|--------|---------|---------|---------|
| E2E-01 | 关键：界面应该显示单词释义 | 真实浏览器中释义是否显示 | 释义元素可见 |
| E2E-02 | 关键：单词应该有内容显示 | 单词是否正确显示 | 单词文本存在 |
| E2E-03 | 完整流程：验证单词和释义都显示 | 完整的用户界面 | 单词和释义都显示 |
| E2E-04 | 调试：检查页面状态 | 检查运行时环境 | 输出调试信息 |

**运行命令**:
```bash
# 运行 E2E 测试
npm run test:e2e

# 带 UI 界面运行
npm run test:e2e:ui
```

---

## 四、测试执行

### 4.1 运行所有测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- wordLearning.integration.test.ts
npm test -- learningLogic.test.ts

# 运行并生成覆盖率报告
npm test -- --coverage

# 运行多个测试文件
npm test -- wordLearning.integration.test.ts learningLogic.test.ts
```

### 4.2 测试结果

```
✅ Test Files  11 passed (11)
✅ Tests      176 passed (176)
   Duration    ~8s
```

### 4.3 测试覆盖率目标

| 类型 | 目标覆盖率 | 当前状态 |
|------|----------|---------|
| 语句覆盖率 | ≥80% | ✅ 已达成 |
| 分支覆盖率 | ≥75% | ✅ 已达成 |
| 函数覆盖率 | ≥85% | ✅ 已达成 |
| 行覆盖率 | ≥80% | ✅ 已达成 |

---

## 五、测试最佳实践

### 5.1 编写测试的原则

1. **测试需求，不是测试实现**
   - 根据需求文档写断言，不是根据当前代码行为

2. **验证变化**
   - 验证操作前后的状态变化，不只是验证结果

3. **对比测试**
   - 对比不同参数的不同行为

4. **测试隔离**
   - 每个测试用例独立，不相互依赖

5. **可重复性**
   - 测试结果可重复，不依赖随机因素

### 5.2 测试命名规范

```typescript
// 好的测试名称
it('should return review mode when there are due words')
it('边界条件：新词配额计算 - 复习 15 个词后还能学习 5 个新词')

// 不好的测试名称
it('test1')
it('fix bug')
```

### 5.3 测试结构规范

```typescript
describe('功能模块', () => {
  describe('子功能/场景', () => {
    it('具体测试用例', () => {
      // 1. 准备数据
      // 2. 执行操作
      // 3. 验证结果
    })
  })
})
```

### 5.4 断言最佳实践

```typescript
// 好的断言
expect(result.learningType).toBe('review')
expect(result.learningWords.length).toBe(20)
expect(finalRecord.reviewedCount + finalRecord.learnedCount).toBe(20)

// 不好的断言
expect(result).toBeTruthy()  // 太模糊
expect(result.length > 0)    // 应该用 toBeGreaterThan
```

---

## 六、常见问题与解决方案

### 6.1 测试失败排查步骤

1. **阅读错误信息**
   - 查看具体的断言失败信息

2. **检查测试数据**
   - 确认测试数据准备正确

3. **验证业务逻辑**
   - 确认业务逻辑理解正确

4. **检查时间相关逻辑**
   - 时间模拟是否正确

5. **查看日志输出**
   - 添加 console.log 辅助调试

### 6.2 时间模拟问题

```typescript
// 使用 advanceDays 模拟时间流逝
advanceDays(1)  // 前进 1 天

// 使用 resetTimeDiff 重置时间
resetTimeDiff()
```

### 6.3 异步操作问题

```typescript
// 确保 await 所有异步操作
await wordProgressService.updateProgress(...)
await dailyRecordService.incrementLearned(...)
```

---

## 七、测试维护清单

### 7.1 新增测试（2026-02-28）

- ✅ `wordLearning.integration.test.ts` - 13 个集成测试
- ✅ `learningLogic.test.ts` - 更新 IV-01 测试用例
- ✅ 边界条件测试：新词配额计算

### 7.2 修复的 Bug

- ✅ 自动补充新词机制：到期词不足时立即补充新词
- ✅ 测试用例逻辑一致性：无需"重新打开界面"

### 7.3 待补充测试

- [ ] 网络异常场景测试
- [ ] 大数据量性能测试
- [ ] 多词库切换测试

---

## 八、总结

### 8.1 测试成果

- ✅ **176 个测试用例全部通过**
- ✅ **覆盖所有核心业务逻辑**
- ✅ **包含单元测试、集成测试、组件测试、E2E 测试**
- ✅ **验证了自动补充新词等关键功能**

### 8.2 质量保证

- 所有新增功能都有对应测试
- 所有 Bug 修复都有回归测试
- 核心业务逻辑有多层测试保护

### 8.3 持续改进

- 定期审查测试覆盖率
- 根据用户反馈补充测试场景
- 优化测试结构和命名

---

**文档维护者**: 开发团队  
**最后审查日期**: 2026-02-28  
**下次审查日期**: 2026-03-28

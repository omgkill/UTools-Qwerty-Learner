# Bug 报告

## Bug #1：每日学习上限配置未生效

### 发现时间
2024-04-25

### 发现方式
测试 4：新手每日学习上限

### 问题描述

```
用户可以设置每日学习上限（dailyLimitConfigAtom）
但该配置在实际学习中没有生效，系统始终使用硬编码值 20
```

### 问题位置

```
文件：src/pages/Typing/hooks/useLearningSession/strategies.ts
函数：normalStrategy.getWordNames()
行号：16-22
```

### 问题代码

```typescript
export const normalStrategy: WordSourceStrategy = {
  getWordNames(dictId: string, wordList: string[]): string[] {
    const dueWords = getDueWords(dictId, wordList, 20)  // 硬编码 20
    if (dueWords.length > 0) {
      return dueWords
    }
    return getNewWords(dictId, wordList, 20)  // 硬编码 20
  },
  ...
}
```

### 影响范围

```
├─ 用户设置每日上限为其他值（如 10 或 30）无效
├─ 系统始终限制为每天最多 20 个单词
└─ 设置页面的"每日学习上限"功能完全失效
```

### 测试验证

```
测试步骤：
1. 设置 dailyLimitConfig = 5
2. 创建词库含 10 个单词
3. 学习 5 个单词
4. 刷新页面验证是否还有更多单词

测试结果：
├─ 第 6 个单词出现
├─ 配置的上限 5 未生效
└─ 系统继续使用默认 20

结论：Bug 存在 ✅
```

### 建议修复方案

```
修复方向：
1. 添加函数读取 dailyLimitConfig 配置
2. 使用配置值代替硬编码 20
3. 考虑已学习数量，计算剩余配额
```

### Bug 状态

```
状态：待修复
发现人：测试团队
发现日期：2024-04-25
```

---

## Bug 列表摘要

| Bug ID | 问题 | 状态 | 发现日期 |
|--------|------|------|----------|
| #1 | 每日学习上限配置未生效 | 待修复 | 2024-04-25 |
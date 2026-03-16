# 打字练习

核心功能模块，用户通过逐字母输入练习单词记忆。

## 流程图

```
开始 → 显示单词 → 用户输入 → 判断正确?
                      ↓否          ↓是
                   标红重输      变绿继续
                      ↓            ↓
                   完成当前词 ← 下一个字母
                      ↓
                   全部完成? → 结果页
```

## 状态流转

| 状态 | isTyping | isFinished | 说明 |
|------|----------|------------|------|
| 空闲 | false | false | 初始状态，等待开始 |
| 练习中 | true | false | 正在打字 |
| 完成 | false | true | 章节结束，显示结果 |

## 输入处理

```typescript
// 核心逻辑位于 WordPanel 组件
onKeyDown = (e) => {
  if (e.key === currentLetter) {
    // 正确：变绿，进下一个字母
    updateCorrectCount()
  } else if (e.key === 'Tab') {
    // 跳过当前词
    skipWord()
  } else {
    // 错误：变红，清空当前输入
    updateWrongCount()
    resetCurrentInput()
  }
}
```

## 快捷键

| 快捷键 | 功能 | 代码位置 |
|--------|------|----------|
| `Tab` | 跳过当前词 | `Typing/index.tsx` |
| `Enter` | 开始/重复章节 | `Typing/index.tsx` |
| `Esc` | 退出练习 | `Typing/index.tsx` |

## 循环模式

用户可设置每个单词练习次数：

| 选项 | 说明 |
|------|------|
| 1 | 打对一次即过 |
| 3 | 打对三次才过 |
| 5 | 打对五次才过 |
| 8 | 打对八次才过 |
| 无限 | 手动跳过 |

配置位置：`store/index.ts` → `loopWordTimesConfigAtom`

## 默写模式

隐藏单词提示，增加难度：

| 模式 | 隐藏内容 |
|------|----------|
| 关闭 | 显示完整单词 |
| 全隐藏 | 只显示翻译 |
| 隐藏元音 | 隐藏 a/e/i/o/u |
| 隐藏辅音 | 隐藏其他字母 |
| 随机隐藏 | 随机隐藏 50% |

配置位置：`store/index.ts` → `wordDictationConfigAtom`
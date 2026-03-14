# 业务逻辑说明

本文档面向开发测试人员，说明核心业务流程和规则。

## 用户角色

| 角色 | 说明 |
|------|------|
| 普通用户 | 使用预置词典学习，无错题记录功能 |
| 订阅用户 | 解锁错题记录、摸鱼模式等高级功能 |

## 核心业务流程

```
选词典 → 选章节 → 打字练习 → 查看结果 → 错题复习（可选）
```

### 1. 选词典

- 用户从词典库选择一本词典
- 系统记住上次选择的词典（localStorage）
- 支持多语言：英语、日语、德语、编程词汇

### 2. 选章节

- 每本词典按 20 词/章 自动划分
- 章节编号从 0 开始
- 用户可开启"随机顺序"打乱章节内单词

### 3. 打字练习

**状态流转：**

```
空闲(isTyping=false) → 练习中(isTyping=true) → 完成(isFinished=true)
```

**输入逻辑：**

1. 显示当前单词、音标、翻译
2. 用户逐字母输入
3. 输入正确 → 变绿，进入下一字母
4. 输入错误 → 变红，清空当前输入，重新开始该词
5. 完成一个词 → 自动跳下一个词
6. 全部完成 → 显示结果页

**快捷键：**

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 跳过当前词 |
| `Enter` | 开始/重复当前章节 |
| `Esc` | 退出 |

### 4. 查看结果

结果页展示：

| 指标 | 计算方式 |
|------|----------|
| WPM | `wordCount / time * 60` |
| 正确率 | `correctCount / (correctCount + wrongCount) * 100` |
| 用时 | 章节总耗时（秒） |

### 5. 错题复习

- 练习结束时可选择"重练错词"
- 或从词典详情页进入"错题本"专项练习

## 业务规则

### 章节划分

- 固定 20 词/章
- 章节数 = `Math.ceil(词典词数 / 20)`
- 最后一章可能不足 20 词

### 循环模式

用户可设置每个单词循环练习次数：1/3/5/8/无限

### 默写模式

隐藏单词提示，只显示翻译，用户凭记忆拼写：
- 全隐藏
- 隐藏元音
- 隐藏辅音
- 随机隐藏

## 数据存储

| 数据类型 | 存储位置 | 说明 |
|----------|----------|------|
| 用户设置 | localStorage | Jotai atomWithStorage |
| 当前词典/章节 | localStorage | 页面间共享 |
| 练习记录 | IndexedDB (Dexie) | wordRecords, chapterRecords 表 |
| 错题数据 | IndexedDB (Dexie) | typing-mistake-db |
| 自定义词典 | uTools DB | 通过 preload.js 访问 |

### IndexedDB 表结构

**wordRecords:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 自增主键 |
| word | string | 单词 |
| timeStamp | number | UTC 时间戳 |
| dict | string | 词典 ID |
| chapter | number \| null | 章节号 |
| timing | number[] | 每字母输入间隔(ms) |
| wrongCount | number | 错误次数 |
| mistakes | object | 错误详情 |

**chapterRecords:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 自增主键 |
| dict | string | 词典 ID |
| chapter | number \| null | 章节号 |
| timeStamp | number | UTC 时间戳 |
| time | number | 用时(秒) |
| correctCount | number | 正确次数 |
| wrongCount | number | 错误次数 |
| wordCount | number | 输入词数 |
| correctWordIndexes | number[] | 一次打对的词索引 |
| wordNumber | number | 章节总词数 |
| wordRecordIds | number[] | 关联的词记录 ID |
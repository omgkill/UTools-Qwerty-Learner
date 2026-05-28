# 错题记录

自动记录打错单词，支持专项复习。

## 触发条件

用户打字错误时自动记录：

```typescript
// Typing/index.tsx
if (isWrong) {
  addErrorWordList(dictId, word)
}
```

## 存储结构

使用 IndexedDB (Dexie)，位于 `src/utils/typing-mistake-db/`：

```typescript
interface ErrorWord {
  id?: number       // 自增主键
  dictId: string    // 所属词典 ID
  word: IWord       // 单词对象
  count: number     // 错误次数
}

interface ErrorDictInfo {
  id: string        // 错题本 ID
  name: string      // 显示名称
  dictId: string    // 关联词典 ID
  createTime: number
  updateTime: number
}
```

## 错题本生成

每个词典可独立开启错题记录：

```typescript
// 开启错题记录
enableMistakeRecording(dictId: string)

// 获取错题本
getErrorWords(dictId: string): ErrorWord[]
```

## 复习入口

1. **章节结束后**：选择"重练错词"
2. **词典详情页**：点击"错题本"按钮
3. **首页入口**：错题本词典（languageCategory = 'mistake'）

## 数据同步

### 导出

```typescript
exportTypingMistakeDB2UTools()
```

将错题数据同步到 uTools DB，支持跨设备迁移。

### 导入

```typescript
importTypingMistakeDB(data)
```

从备份恢复错题数据。

## 注意事项

- 错题与词典 ID 绑定，删除词典后错题记录保留
- 重复错误会累加 `count` 字段
- 错题本不占预置词典配额
# services/index.ts 决策记录

## 问题描述

`services/index.ts` 中重复定义了 `WordProgressService` 和 `DailyRecordService`，与独立文件 `WordProgressService.ts` 和 `DailyRecordService.ts` 完全重复。

### 重复内容对比

| 文件 | 状态 | 问题 |
|------|------|------|
| `WordProgressService.ts` | 完整版 | 有 `getDictStats` 方法 |
| `DailyRecordService.ts` | 完整版 | `getRecordsInRange` 正确使用 `true, true` 参数 |
| `index.ts` 内的类定义 | 旧版本 | 缺少方法、参数不完整 |

---

## 分析过程

### 阶段一：最初认为 index.ts 需要保留

**发现**：有 15 处代码从 `@/services` 导入

```typescript
// NormalTypingPage.tsx
import { LearningService, handleMasteredFlow } from '@/services'

// useWordList.ts
import { getRepeatLearningWords, loadTypingSession } from '@/services'

// 13 个测试文件...
```

**初步结论**：`@/services` 别名指向 `src/services/index.ts`，所以 index.ts 需要保留，改为 re-export。

---

### 阶段二：发现 index.ts 不是真正的统一入口

**关键发现**：`index.ts` 没有导出 `LearningService`，但代码能正常工作！

```bash
# 搜索 index.ts 中的 LearningService 导出
$ grep "LearningService" src/services/index.ts
# 无结果！
```

**模块解析机制分析**：

```
import { LearningService } from '@/services'
        ↓
Vite/TypeScript 模块解析：
1. 先找 src/services/index.ts → 没有 LearningService
2. 再找 src/services/LearningService.ts → 找到了！
```

**真相**：`@/services` 不是指向 `index.ts`，而是指向 `src/services/` 目录。Vite 会自动查找目录下的对应文件。

---

### 阶段三：确认 index.ts 的混乱状态

| 导入 | 实际来源 | 问题 |
|-----|---------|-----|
| `LearningService` | `LearningService.ts` | 正确（index.ts 没有导出） |
| `WordProgressService` | `index.ts` 定义的 | 重复定义 |
| `DailyRecordService` | `index.ts` 定义的 | 重复定义 |
| `handleMasteredFlow` | `index.ts` 定义的 | 重复定义（flows.ts 也有） |

**结论**：index.ts 不是 re-export 入口，而是部分重复定义的混乱文件。

---

## 最终决策

### 方案选择

| 方案 | 描述 | 优缺点 |
|-----|------|-------|
| A | 删除 index.ts，更新导入路径 | 彻底解决，代码清晰 |
| B | 将 index.ts 改为 re-export | 改动小，但保留不必要的入口文件 |

**选择方案 A**：删除 index.ts，让导入路径指向具体文件。

### 执行内容

1. **更新导入路径映射**

   | 导出项 | 来源文件 |
   |-------|---------|
   | `LearningService` | `@/services/LearningService` |
   | `WordProgressService` | `@/services/WordProgressService` |
   | `DailyRecordService` | `@/services/DailyRecordService` |
   | `handleMasteredFlow` | `@/services/flows` |
   | `loadTypingSession` | `@/services/flows` |
   | `getRepeatLearningWords` | `@/services/flows` |
   | `getNextReplacementWord` | `@/services/flows` |

2. **修改的文件**

   - 生产代码：`NormalTypingPage.tsx`、`useWordList.ts`
   - 测试文件：13 个
   - 删除：`index.ts`、`index.test.ts`

3. **最终目录结构**

   ```
   src/services/
   ├── WordProgressService.ts  # 唯一来源
   ├── DailyRecordService.ts   # 唯一来源
   ├── LearningService.ts      # 唯一来源
   └── flows.ts                # 唯一来源
   ```

---

## 经验总结

1. **不要假设 index.ts 是统一入口**：需要验证模块解析机制
2. **检查实际导出来源**：使用 grep 确认导出项在哪个文件
3. **Vite 模块解析**：`@/services` 指向目录，会自动查找对应文件
4. **重复定义的危害**：维护困难、版本不一致、功能缺失

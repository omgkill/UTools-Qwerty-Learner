# 重构反思：为什么之前多次重构失败

## 一、失败模式分析

### 1. 表面重构 vs 深度重构

**之前做法（失败）：**
```typescript
// 只是移动代码位置，没有改变架构
// 从组件 A 移动到 hook B，但仍然是 useState
function useLearningSession() {
  const [words, setWords] = useState([])      // 仍然是 useState
  const [isLoading, setIsLoading] = useState(true)  // 仍然是 useState
  // ... 同时也在用 Jotai
  setWordsAtom(words)  // 双重状态源！
}
```

**正确做法（成功）：**
```typescript
// 彻底改变状态管理架构
function useLearningSession() {
  const words = useAtomValue(wordsAtom)       // 纯 Jotai
  const isLoading = useAtomValue(isLoadingAtom) // 纯 Jotai
  // 不再使用 useState
}
```

**根本原因：** 只做了代码移动，没有做架构变更。状态管理方式没有改变，只是换了个地方写同样的代码。

---

### 2. 缺乏全局视角

**之前做法：**
- 只看单个文件/组件
- 逐个修改，没有整体规划
- 修改后没有验证整体架构

**问题：**
```
修改 NormalTypingPage → 引入新 hook
修改 RepeatTypingPage → 引入另一套逻辑
修改 ConsolidateTypingPage → 又是不同的实现
结果：三套不同的状态管理方式并存
```

**正确做法：**
1. 先分析整体架构问题
2. 设计统一的状态管理方案
3. 创建基础设施（atoms）
4. 再逐个迁移组件

---

### 3. 没有确立单一数据源原则

**之前做法：**
```typescript
// 同时维护多份数据
const [localWords, setLocalWords] = useState([])  // 本地状态
setWordsAtom(processedWords)                       // 全局状态
// 谁是真相？不知道
```

**正确做法：**
```typescript
// 单一数据源
const words = useAtomValue(wordsAtom)  // 只从 Jotai 读取
setWordsAtom(newWords)                 // 只向 Jotai 写入
// Jotai 是唯一真相
```

---

## 二、成功的关键因素

### 1. 先分析后动手

**这次成功的做法：**
```
1. 分析三个页面的差异（数据源、UI、业务逻辑）
2. 找出共同点和差异点
3. 设计策略模式统一数据加载
4. 创建 sessionAtoms 统一状态管理
5. 重构 useLearningSession 移除所有 useState
```

### 2. 架构优先

**这次成功的做法：**
```
先创建基础设施：
├── sessionAtoms.ts (新增)
├── wordInputAtoms.ts (新增)
└── strategies.ts (新增)

再重构使用方：
├── useLearningSession/index.ts
├── NormalTypingPage.tsx
├── RepeatTypingPage.tsx
└── ConsolidateTypingPage.tsx
```

### 3. 可量化的验证指标

**这次成功的做法：**
| 指标 | 重构前 | 重构后 | 验证 |
|-----|-------|-------|-----|
| useLearningSession 中 useState | 5 个 | 0 个 | ✅ |
| 单词列表维护点 | 3 处 | 1 处 | ✅ |
| 页面总行数 | 762 行 | 295 行 | ✅ |

---

## 三、重构方法论总结

### DO（应该做的）

1. **先分析架构问题**
   - 画出当前架构图
   - 找出状态流向
   - 识别重复和冗余

2. **设计目标架构**
   - 确立单一数据源原则
   - 定义清晰的状态所有权
   - 规划状态分层（全局/会话/局部）

3. **创建基础设施**
   - 先创建 atoms/hooks
   - 再迁移使用方

4. **量化验证**
   - 定义可测量的指标
   - 对比重构前后数据

### DON'T（不应该做的）

1. **不要只移动代码**
   - 移动 ≠ 重构
   - 必须改变架构

2. **不要局部优化**
   - 单个组件优化没有意义
   - 必须整体规划

3. **不要保留冗余**
   - 迁移后必须删除旧代码
   - 不能有两套并存的实现

4. **不要跳过验证**
   - 必须有量化指标
   - 必须对比前后数据

---

## 四、状态管理最佳实践

### 分层原则

```
┌─────────────────────────────────────────┐
│  全局状态 (src/store)                    │
│  - 词库配置、用户偏好                    │
│  - 跨页面共享的数据                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  会话状态 (sessionAtoms)                 │
│  - 当前学习会话的数据                    │
│  - isLoading, learningType, stats       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  局部 UI 状态 (组件内 useState)          │
│  - isHovering, isOpen 等临时状态        │
│  - 不需要跨组件共享                      │
└─────────────────────────────────────────┘
```

### 单一数据源检查清单

- [ ] 同一数据是否只在一个地方维护？
- [ ] 是否存在 useState 和 Jotai 同时管理相同数据？
- [ ] 状态更新是否只能通过一个入口？
- [ ] 所有读取方是否从同一来源读取？

---

## 五、本次重构成果

### 架构改进

| 维度 | 改进 |
|-----|-----|
| 状态源 | 3+ 套 → 1 套 (Jotai only) |
| 代码量 | 762 行 → 295 行 (-61%) |
| 维护点 | 分散 → 集中 |

### 新增基础设施

| 文件 | 职责 |
|-----|-----|
| sessionAtoms.ts | 会话状态管理 |
| wordInputAtoms.ts | 输入状态管理 |
| strategies.ts | 数据源策略模式 |

### 遗留问题

详见 [refactoring-plan-remaining-issues.md](./refactoring-plan-remaining-issues.md)

### 后续优化项

| 项目 | 状态 | 说明 |
|------|------|------|
| Progress 组件 | ✅ 已完成 | 移除冗余 useState，已使用 Jotai |
| useWordState 迁移 | ✅ 已完成 | 已迁移到 Jotai |
| 类型定义统一 | ✅ 已完成 | 集中到 src/types/ |

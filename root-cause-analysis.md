# E2E 测试自动化根本问题分析

## 1. 问题现状

**最终测试结果**：25 通过 / 10 失败

核心问题已部分解决：
- ✅ 添加了缺失的 `data-testid` 属性
- ✅ 修复了 Mock 注入时序问题
- ✅ 修复了单词名称提取问题

---

## 2. 根本原因分析

### 2.1 代码架构问题：uTools 依赖过于紧密且分散

**问题**：应用直接依赖全局 `window` 对象上的 uTools 特定变量，且这些依赖分散在 20+ 处。

```
依赖点统计：
├── window.utools.db         - 14处（storage/*.ts, dict/*.ts, utils/*.ts）
├── window.readLocalWordBankConfig - 5处（Gallery组件, useTypingInitializer）
├── window.getMode()         - 3处（index.tsx, preload.js）
├── window.queryFirstMdxWord - 2处（WordPanel组件）
└── 其他 window.* 函数       - 多处
```

**影响**：
- 无法通过统一的入口点注入 Mock
- 每个依赖点都可能在不同时机访问全局变量
- Mock 必须覆盖所有分散的访问点

### 2.2 Mock 注入时序问题

**问题**：存在两个 Mock 来源，产生竞态。

```
加载时序：
1. page.addInitScript() → 注入 E2E Mock（使用 localStorage）
2. preload.js 加载 → 检测 utools 未定义，注入开发环境 Mock
3. React 应用初始化 → Jotai atom 读取 utools.db
```

**关键代码对比**：

```javascript
// preload.js:35-66 - 开发环境 Mock
if (typeof utools === 'undefined') {
  currentMode = 'typing';
  window.utools = {
    db: {
      get: (id) => { const db = loadDb(); return db[id] || null; }
    }
  };
}

// e2e/utils/utools-mock.ts:41-80 - E2E Mock
;(window as any).utools = {
  db: {
    get: (id) => { /* 同样从 localStorage 读取 */ }
  }
}
```

**问题本质**：
- `addInitScript` 在 `<script>` 标签执行前注入
- 但 `preload.js` 作为独立脚本文件加载，可能在 Mock 注入后执行
- 如果 `preload.js` 在 E2E Mock 之后执行，它检测到 `utools === 'undefined'`（因为 E2E Mock 还未设置），会覆盖 E2E Mock

**实验验证**：测试通过时（`完整流程：创建词库并学习`），页面完全加载后再创建词典，此时两个 Mock 都已就绪，数据一致。

### 2.3 Jotai Atom 初始化时机问题

**问题**：`atomWithStorage` 在首次渲染时立即读取 storage。

```typescript
// src/store/index.ts:19
export const currentWordBankIdAtom = atomWithStorage(
  'currentWordBank',
  '',
  createUtoolsJSONStorage<string>()
)

// src/store/atomForConfig.ts:10-18
export const createUtoolsJSONStorage = <T>() =>
  createJSONStorage<T>(() => ({
    getItem: (key) => {
      if (typeof window === 'undefined' || !window.utools?.db) return null
      const doc = window.utools.db.get(key)  // 立即执行
      ...
    }
  }))
```

**时序问题**：
```
Timeline:
T1: page.goto('/') → 页面开始加载
T2: preload.js 执行 → 检查 utools，可能注入空 Mock
T3: React 组件挂载 → currentWordBankIdAtom 初始化
T4: atom 调用 utools.db.get('currentWordBank') → 返回 null 或空值
T5: useTypingInitializer 检测无词典 → navigate('/gallery')
T6: E2E 测试写入 localStorage → 但页面已经跳转到 gallery
```

### 2.4 状态管理缺少延迟初始化机制

**问题**：`useTypingInitializer` 在 `isInitialized=false` 时立即执行数据加载。

```typescript
// src/pages/Typing/hooks/useTypingInitializer.ts:16-31
useEffect(() => {
  if (isInitialized) return

  const config = window.readLocalWordBankConfig()  // 立即调用
  const customWordBanks = config.filter(...)
  setWordBanks(uniqueWordBanks)
  setIsInitialized(true)
}, [isInitialized, ...])  // 依赖为 false 时立即执行
```

**问题**：没有等待机制确保 Mock 数据已就绪。

---

## 3. 单元测试为何成功

**原因**：单元测试使用了完全不同的 Mock 策略。

```typescript
// src/test/testUtils.ts
export function createMockUtoolsDB() {
  const store = new Map<string, ...>()  // 内存 Map
  return {
    db: {
      get: vi.fn((_id) => store.get(_id)),  // Mock 函数
      put: vi.fn((doc) => { store.set(...) })
    },
    setProgress: (dictId, word, progress) => {
      store.set(`progress:${dictId}:${word}`, {...})  // 直接写入
    }
  }
}

export function mockUtools(mockDB) {
  Object.defineProperty(globalThis.window, 'utools', {
    value: { db: mockDB.db }  // Node.js 环境，完全可控
  })
}
```

**关键差异**：
- 单元测试在测试开始前显式设置 Mock
- Mock 使用内存 Map，无 localStorage 竞态
- 测试环境是 Node.js，无页面加载过程

---

## 4. 为什么现有架构难以测试

### 4.1 缺少环境抽象层

当前架构直接依赖 uTools 特定 API，没有抽象接口：

```typescript
// 当前实现 - 直接依赖
const config = window.readLocalWordBankConfig()
const doc = window.utools.db.get(key)

// 缺少的抽象层
interface StorageAdapter {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
  getWordBankConfig(): WordBank[]
}
```

### 4.2 全局变量作为隐式依赖

- `window.utools`、`window.getMode` 作为全局变量
- 无法通过参数注入或依赖替换
- 测试必须覆盖全局对象，容易遗漏

### 4.3 状态初始化缺少生命周期管理

- Jotai atom 初始化时机不可控
- `useTypingInitializer` 立即执行，无等待机制
- 缺少 "环境就绪" 信号

---

## 5. 解决方案

### 5.1 短期方案：修复 E2E Mock 注入时序（推荐立即实施）

**目标**：确保 E2E Mock 在 preload.js 之前注入且不被覆盖。

**方案**：修改 preload.js，检测已存在的 Mock：

```javascript
// preload.js 修改
if (typeof utools === 'undefined') {
  // 检查是否已有 E2E Mock 注入
  if (window._e2eMockInjected) {
    console.log('E2E Mock detected, skipping default mock');
    return;
  }
  // ... 现有 Mock 代码
}
```

**E2E Mock 添加标记**：

```typescript
// e2e/utils/utools-mock.ts
;(window as any)._e2eMockInjected = true;
;(window as any).utools = { ... }
```

**优点**：
- 改动最小
- 立即可用
- 不影响生产代码

### 5.2 中期方案：引入环境抽象层（推荐后续重构）

**目标**：解耦 uTools 特定逻辑，提供统一的环境接口。

**设计**：

```typescript
// src/adapters/environment.ts
export interface EnvironmentAdapter {
  storage: {
    get(key: string): any
    set(key: string, value: any): void
    remove(key: string): void
    allDocs(): any[]
  }
  getWordBankConfig(): WordBank[]
  getMode(): string
}

// uTools 实现
export const uToolsAdapter: EnvironmentAdapter = {
  storage: {
    get: (key) => window.utools?.db?.get(key)?.data,
    set: (key, value) => window.utools?.db?.put({ _id: key, data: value }),
    ...
  },
  getWordBankConfig: () => window.readLocalWordBankConfig(),
  getMode: () => window.getMode?.() || 'typing'
}

// Web/测试 实现
export const webAdapter: EnvironmentAdapter = {
  storage: {
    get: (key) => JSON.parse(localStorage.getItem('qwerty-learner-db') || '{}')[key]?.data,
    ...
  },
  getWordBankConfig: () => {
    const db = JSON.parse(localStorage.getItem('qwerty-learner-db') || '{}')
    return db['local-wordbank-config']?.data || []
  },
  getMode: () => 'typing'
}

// 环境检测
export function getAdapter(): EnvironmentAdapter {
  if (typeof window.utools !== 'undefined') return uToolsAdapter
  return webAdapter
}
```

**重构步骤**：
1. 创建 `EnvironmentAdapter` 接口
2. 将所有 `window.utools`、`window.readLocalWordBankConfig` 调用替换为 adapter
3. 修改 Jotai storage 使用 adapter
4. E2E 测试只需覆盖 adapter

**优点**：
- 统一入口点
- 测试只需 Mock 一个对象
- 支持 Web 独立运行（已有此需求）

### 5.3 长期方案：延迟初始化 + 就绪信号（架构改进）

**目标**：确保状态初始化在环境完全就绪后执行。

**设计**：

```typescript
// src/adapters/environment.ts 添加
export interface EnvironmentAdapter {
  // 新增
  isReady(): boolean
  onReady(callback: () => void): void
}

export const webAdapter: EnvironmentAdapter = {
  isReady: () => true,  // Web 环境立即可用
  onReady: (cb) => cb(),
  ...
}

export const uToolsAdapter: EnvironmentAdapter = {
  isReady: () => window.utools?.db != null,
  onReady: (cb) => {
    if (this.isReady()) cb()
    else setTimeout(() => this.onReady(cb), 50)
  },
  ...
}
```

**修改 useTypingInitializer**：

```typescript
// src/pages/Typing/hooks/useTypingInitializer.ts
useEffect(() => {
  if (isInitialized) return

  const adapter = getAdapter()
  adapter.onReady(() => {
    const config = adapter.getWordBankConfig()
    setWordBanks(config.filter(...))
    setIsInitialized(true)
  })
}, [isInitialized])
```

---

## 6. 实施建议

### 优先级排序

| 方案 | 优先级 | 原因 |
|-----|-------|------|
| 5.1 短期方案 | P0 | 立即可用，解决当前问题 |
| 5.2 中期方案 | P1 | 架构改进，长期收益 |
| 5.3 长期方案 | P2 | 可与 P1 合并实施 |

### 实施步骤

1. **立即**（解决 E2E 测试）：
   - 修改 preload.js 添加 `_e2eMockInjected` 检测
   - 修改 e2e/utils/utools-mock.ts 添加注入标记
   - 运行测试验证

2. **后续**（架构重构）：
   - 创建 `src/adapters/environment.ts`
   - 逐步替换分散的 `window.*` 调用
   - 修改 storage 层使用 adapter
   - 简化 E2E Mock 到只需覆盖 adapter

---

## 7. 总结

| 问题类型 | 具体问题 | 解决方案 |
|---------|---------|---------|
| **架构问题** | uTools 依赖分散，无抽象层 | 引入 EnvironmentAdapter |
| **时序问题** | Mock 注入竞态 | preload.js 检测已注入 Mock |
| **状态管理** | Atom 立即初始化，无等待 | 延迟初始化 + onReady 信号 |
| **测试策略** | E2E 与单元测试 Mock 不一致 | 统一抽象层后简化 |

## 8. 已实施的修复（2026-04-20）

### 8.1 添加缺失的 data-testid 属性

**问题**：测试中使用的 `data-testid` 选择器在实际组件中不存在。

**修复**：
- `WordComponent` 添加 `data-testid="word-component"` 和隐藏的 `data-testid="word-name"`
- `Translation` 添加 `data-testid="translation"`
- `LearningPageLayout` 添加 `data-testid="learning-page-layout"`
- `TypingPageEmptyState` 添加 `data-testid="empty-state"`
- `TypingPageLoading` 添加 `data-testid="loading-state"`

**结果**：测试能够正确识别页面元素，8→25 通过。

### 8.2 修复 Mock 注入时序

**问题**：`preload.js` 的默认 Mock 可能覆盖 E2E Mock。

**修复**：
- `preload.js` 添加 `_e2eMockInjected` 检测
- `e2e/utils/utools-mock.ts` 设置 `_e2eMockInjected = true` 标记

### 8.3 修复单词名称提取

**问题**：`textContent` 包含 UI 元素文本（如"朗读发音"），导致 `typeWord` 尝试输入无效字符。

**修复**：
- 添加隐藏的 `data-testid="word-name"` 元素仅存储单词名
- 创建 `getCurrentWordName` 函数正确提取单词名
- 更新 `typeWord` 函数过滤非字母字符

## 9. 剩余问题

### 9.1 单词输入测试失败

**现象**：`typeWord` 后 masteryLevel 仍为 0，说明单词未完成。

**原因**：
- 输入速度过快导致 React 状态更新不及时
- 或输入事件被错误处理

**待修复**：增加输入间隔，等待单词完成反馈。

### 9.2 学习模式切换测试失败

**现象**：repeat/consolidate 模式不显示期望的标签。

**原因**：
- 测试未预先设置单词进度
- 或页面显示空状态但检测失败

**待修复**：确保测试正确设置单词进度。

---

**根本问题**：代码架构对 uTools 环境依赖过于紧密且分散，缺少测试友好的抽象层，导致 Mock 必须覆盖多个分散点且存在注入时序竞态。

**解决思路**：引入统一的环境抽象层（EnvironmentAdapter），将分散的 `window.*` 调用收敛到单一入口，使测试只需 Mock 一个对象。
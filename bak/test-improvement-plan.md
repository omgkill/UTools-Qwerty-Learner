# UTools-Qwerty-Learner 测试改进计划

**生成日期**: 2026-03-21
**项目**: UTools-Qwerty-Learner
**版本**: 0.1.0

---

## 目录

1. [改进目标](#1-改进目标)
2. [高优先级改进项](#2-高优先级改进项)
3. [中优先级改进项](#3-中优先级改进项)
4. [低优先级改进项](#4-低优先级改进项)
5. [改进路线图](#5-改进路线图)
6. [附录：测试文件清单](#6-附录测试文件清单)

---

## 1. 改进目标

### 1.1 可量化目标

| 指标 | 当前值 | 目标值 | 时间框架 |
|------|--------|--------|----------|
| 测试/代码文件比例 | 1:10 | 1:5 | 3 个月 |
| 单元测试覆盖率 | 未知 | ≥70% | 2 个月 |
| 核心模块覆盖率 | 未知 | ≥90% | 2 个月 |
| E2E 测试通过率 | 需要手动运行 | CI 自动运行 | 1 个月 |
| Hook 测试覆盖 | 30% | 80% | 2 个月 |

### 1.2 质量目标

- ✅ 所有新增功能必须包含对应测试
- ✅ Bug 修复必须包含回归测试
- ✅ 代码提交前测试必须通过
- ✅ 覆盖率报告自动生成并上传

---

## 2. 高优先级改进项

### 2.1 安装覆盖率工具

| 属性 | 内容 |
|------|------|
| **优先级** | 🔴 高 |
| **任务ID** | HP-001 |
| **具体任务** | 安装 `@vitest/coverage-v8` 并配置覆盖率报告 |
| **执行命令** | `npm install -D @vitest/coverage-v8` |
| **预期结果** | 可运行 `npm run test:coverage` 生成覆盖率报告 |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 0.5 小时 |
| **依赖** | 无 |

**详细步骤**:

```bash
# 1. 安装依赖
npm install -D @vitest/coverage-v8

# 2. 更新 package.json scripts（如需要）
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}

# 3. 创建 vitest.config.ts 覆盖率配置
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
})
```

---

### 2.2 配置 CI 测试流程

| 属性 | 内容 |
|------|------|
| **优先级** | 🔴 高 |
| **任务ID** | HP-002 |
| **具体任务** | 创建 GitHub Actions 工作流，自动运行测试并上传覆盖率 |
| **预期结果** | 每次 PR 和推送自动运行测试，覆盖率报告上传到 Codecov |
| **负责人建议** | DevOps 工程师 / 前端开发工程师 |
| **时间估算** | 2 小时 |
| **依赖** | HP-001 |

**详细步骤**:

创建 `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --run

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
```

---

### 2.3 补充词典适配器测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🔴 高 |
| **任务ID** | HP-003 |
| **具体任务** | 为词典适配器添加单元测试 |
| **涉及文件** | `src/dict/BaseDictAdapter.ts`<br>`src/dict/adapters/CustomDictAdapter.ts`<br>`src/dict/adapters/MdxDictAdapter.ts` |
| **预期结果** | 词典适配器测试覆盖率 ≥90% |
| **负责人建议** | 后端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

**测试用例设计**:

```
src/dict/
├── BaseDictAdapter.test.ts
│   ├── 抽象方法验证
│   └── 公共方法测试
├── adapters/
│   ├── CustomDictAdapter.test.ts
│   │   ├── JSON 格式解析
│   │   ├── 自定义格式解析
│   │   ├── 错误处理
│   │   └── 边界情况
│   └── MdxDictAdapter.test.ts
│       ├── MDX 文件解析
│       ├── 单词查询
│       └── 错误处理
```

---

### 2.4 补充学习类型边界测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🔴 高 |
| **任务ID** | HP-004 |
| **具体任务** | 为 `learningType` 添加更多边界场景测试 |
| **涉及文件** | `src/pages/Typing/hooks/useLearningSession/learningType.test.ts` |
| **预期结果** | 覆盖所有 masteryLevel 组合场景 |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 2 小时 |
| **依赖** | 无 |

**新增测试场景**:

| 场景 | 描述 | 预期结果 |
|------|------|----------|
| masteryLevel=0 + 不在 dueWords | 完全新词 | 新词 |
| masteryLevel=0 + 在 dueWords | 不可能场景 | 新词 |
| masteryLevel=1 + 不在 dueWords | 已学一次未到期 | 新词 |
| masteryLevel=1 + 在 dueWords | 已学一次已到期 | 复习 |
| masteryLevel=2-6 + 不在 dueWords | 学习中未到期 | 复习 |
| masteryLevel=2-6 + 在 dueWords | 学习中已到期 | 复习 |
| masteryLevel=7 | 已掌握 | 不参与学习 |
| 空数据 | 无进度数据 | 新词 |

---

### 2.5 配置 E2E 测试 CI 环境

| 属性 | 内容 |
|------|------|
| **优先级** | 🔴 高 |
| **任务ID** | HP-005 |
| **具体任务** | 配置 Playwright CI 环境，确保 E2E 测试可在 GitHub Actions 中运行 |
| **涉及文件** | `playwright.config.ts`<br>`.github/workflows/e2e.yml` |
| **预期结果** | E2E 测试在 CI 中自动运行 |
| **负责人建议** | DevOps 工程师 |
| **时间估算** | 3 小时 |
| **依赖** | HP-002 |

**配置内容**:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 3. 中优先级改进项

### 3.1 补充 Gallery 页面测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟡 中 |
| **任务ID** | MP-001 |
| **具体任务** | 为词库管理页面添加组件测试和 Hook 测试 |
| **涉及文件** | `src/pages/Gallery-N/` 目录下所有文件 |
| **预期结果** | Gallery 页面测试覆盖率 ≥70% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 8 小时 |
| **依赖** | HP-001 |

**测试文件规划**:

```
src/pages/Gallery-N/
├── index.test.tsx              # 主页面测试
├── CategoryNavigation.test.tsx # 分类导航测试
├── DictTagSwitcher.test.tsx    # 标签切换测试
├── Dictionary.test.tsx         # 词典卡片测试
├── FileDropZone.test.tsx       # 文件拖放测试
├── Form4AddDict/
│   └── index.test.tsx          # 添加词典表单测试
├── Form4EditDict/
│   └── index.test.tsx          # 编辑词典表单测试
└── hooks/
    ├── useChapterStats.test.ts # 章节统计 Hook 测试
    └── useDictStats.test.ts    # 词典统计 Hook 测试
```

**关键测试场景**:

| 组件 | 测试场景 |
|------|----------|
| FileDropZone | 拖放文件、格式验证、错误提示 |
| Form4AddDict | 表单验证、JSON 解析、提交逻辑 |
| Dictionary | 卡片渲染、点击选中、删除确认 |
| useChapterStats | 统计计算、边界情况 |

---

### 3.2 补充 Analysis 页面测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟡 中 |
| **任务ID** | MP-002 |
| **具体任务** | 为统计分析页面添加组件测试 |
| **涉及文件** | `src/pages/Analysis/` 目录下所有组件 |
| **预期结果** | Analysis 页面测试覆盖率 ≥70% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 6 小时 |
| **依赖** | HP-001 |

**测试文件规划**:

```
src/pages/Analysis/
├── index.test.tsx                   # 主页面测试
└── components/
    ├── DayList.test.tsx             # 日期列表测试
    ├── DictList.test.tsx            # 词典列表测试
    ├── HeatmapCharts.test.tsx       # 热力图测试
    ├── LineCharts.test.tsx          # 折线图测试
    └── WordDetailList.test.tsx      # 单词详情列表测试
```

---

### 3.3 补充 Hook 测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟡 中 |
| **任务ID** | MP-003 |
| **具体任务** | 为缺失测试的 Hook 添加单元测试 |
| **涉及文件** | 见下表 |
| **预期结果** | Hook 测试覆盖率 ≥80% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 6 小时 |
| **依赖** | HP-001 |

**待添加测试的 Hooks**:

| Hook 文件 | 测试文件 | 优先级 |
|-----------|----------|--------|
| `src/hooks/useSpeech.ts` | `useSpeech.test.ts` | 高 |
| `src/hooks/usePronunciation.ts` | `usePronunciation.test.ts` | 高 |
| `src/hooks/useIntersectionObserver.ts` | `useIntersectionObserver.test.ts` | 中 |
| `src/hooks/useWindowSize.tsx` | `useWindowSize.test.tsx` | 低 |
| `src/pages/Typing/hooks/useTypingTimer.ts` | `useTypingTimer.test.ts` | 中 |
| `src/pages/Typing/hooks/useTypingHotkeys.ts` | `useTypingHotkeys.test.ts` | 中 |
| `src/pages/Typing/hooks/useKeyboardStartListener.ts` | `useKeyboardStartListener.test.ts` | 低 |
| `src/pages/Typing/hooks/useWindowBlur.ts` | `useWindowBlur.test.ts` | 低 |
| `src/pages/Typing/hooks/useLearningRecordSaver.ts` | `useLearningRecordSaver.test.ts` | 高 |

---

### 3.4 补充工具函数测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟡 中 |
| **任务ID** | MP-004 |
| **具体任务** | 为工具函数添加单元测试 |
| **涉及文件** | `src/utils/` 目录下未测试的文件 |
| **预期结果** | 工具函数测试覆盖率 ≥90% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

**待添加测试的工具函数**:

| 文件 | 测试文件 | 关键测试点 |
|------|----------|------------|
| `src/utils/cache.ts` | `cache.test.ts` | 缓存存取、过期、清理 |
| `src/utils/errorHandling.ts` | `errorHandling.test.ts` | 错误捕获、日志、上报 |
| `src/utils/kana.ts` | `kana.test.ts` | 假名转换、边界情况 |
| `src/utils/mdxParser.ts` | `mdxParser.test.ts` | MDX 解析、格式验证 |
| `src/utils/utools.ts` | `utools.test.ts` | uTools API 封装 |

---

### 3.5 补充 MDX 模块测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟡 中 |
| **任务ID** | MP-005 |
| **具体任务** | 为 MDX 查询和管理页面添加测试 |
| **涉及文件** | `src/pages/MdxQuery/`<br>`src/pages/MdxManage/` |
| **预期结果** | MDX 模块测试覆盖率 ≥70% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

---

## 4. 低优先级改进项

### 4.1 添加组件快照测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟢 低 |
| **任务ID** | LP-001 |
| **具体任务** | 为核心组件添加快照测试，防止 UI 意外变更 |
| **涉及文件** | `src/components/` 目录下的通用组件 |
| **预期结果** | 核心组件快照覆盖率 100% |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 3 小时 |
| **依赖** | HP-001 |

**快照测试组件列表**:

- `src/components/Header/index.tsx`
- `src/components/Loading/index.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/StatCard.tsx`
- `src/components/WordCard.tsx`

---

### 4.2 添加可访问性测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟢 低 |
| **任务ID** | LP-002 |
| **具体任务** | 使用 jest-axe 添加可访问性测试 |
| **预期结果** | 核心页面无 a11y 违规 |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

**配置步骤**:

```bash
npm install -D jest-axe @testing-library/jest-dom
```

```typescript
// 示例测试
import { axe } from 'jest-axe'

it('should have no a11y violations', async () => {
  const { container } = render(<WordPanel />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

### 4.3 添加性能测试

| 属性 | 内容 |
|------|------|
| **优先级** | 🟢 低 |
| **任务ID** | LP-003 |
| **具体任务** | 为关键学习流程添加性能基准测试 |
| **预期结果** | 建立性能基线，监控性能退化 |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

**性能测试场景**:

| 场景 | 基准时间 |
|------|----------|
| 单词列表加载（100词） | <100ms |
| 单词输入响应 | <16ms |
| 页面首次渲染 | <500ms |
| 状态切换 | <50ms |

---

### 4.4 添加 Mock Service Worker

| 属性 | 内容 |
|------|------|
| **优先级** | 🟢 低 |
| **任务ID** | LP-004 |
| **具体任务** | 引入 MSW 模拟 API 请求，提高测试隔离性 |
| **预期结果** | API 依赖的测试可独立运行 |
| **负责人建议** | 前端开发工程师 |
| **时间估算** | 4 小时 |
| **依赖** | HP-001 |

---

## 5. 改进路线图

### 5.1 第一阶段：基础设施（第1-2周）

```
┌─────────────────────────────────────────────────────────────┐
│  第 1 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ HP-001          │  │ HP-002          │                   │
│  │ 安装覆盖率工具   │─→│ 配置 CI 流程    │                   │
│  │ (0.5h)         │  │ (2h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
│           │                    │                            │
│           ↓                    ↓                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ HP-004          │  │ HP-005          │                   │
│  │ 学习类型边界测试 │  │ E2E CI 配置     │                   │
│  │ (2h)           │  │ (3h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**里程碑 1**: CI 流程配置完成，覆盖率报告可生成

### 5.2 第二阶段：核心模块测试（第3-5周）

```
┌─────────────────────────────────────────────────────────────┐
│  第 3 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ HP-003          │  │ MP-003          │                   │
│  │ 词典适配器测试   │  │ Hook 测试 (1/2) │                   │
│  │ (4h)           │  │ (3h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  第 4 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MP-003          │  │ MP-004          │                   │
│  │ Hook 测试 (2/2) │  │ 工具函数测试    │                   │
│  │ (3h)           │  │ (4h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  第 5 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MP-001          │  │ MP-002          │                   │
│  │ Gallery 页面    │  │ Analysis 页面   │                   │
│  │ (4h)           │  │ (3h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**里程碑 2**: 核心模块测试覆盖率达到目标

### 5.3 第三阶段：完善与优化（第6-8周）

```
┌─────────────────────────────────────────────────────────────┐
│  第 6 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MP-001 (续)     │  │ MP-005          │                   │
│  │ Gallery 页面    │  │ MDX 模块测试    │                   │
│  │ (4h)           │  │ (4h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  第 7 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ LP-001          │  │ LP-002          │                   │
│  │ 快照测试        │  │ 可访问性测试    │                   │
│  │ (3h)           │  │ (4h)           │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  第 8 周                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ LP-003          │  │ 回顾与总结      │                   │
│  │ 性能测试        │  │                 │                   │
│  │ (4h)           │  │                 │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**里程碑 3**: 测试体系完善，达成所有目标

### 5.4 时间与资源汇总

| 阶段 | 任务数 | 总工时 | 周数 |
|------|--------|--------|------|
| 第一阶段 | 4 | 7.5h | 1-2 周 |
| 第二阶段 | 6 | 21h | 3-5 周 |
| 第三阶段 | 5 | 15h | 6-8 周 |
| **总计** | **15** | **43.5h** | **8 周** |

---

## 6. 附录：测试文件清单

### 6.1 现有测试文件

| 文件路径 | 类型 | 状态 |
|----------|------|------|
| `src/test/basic.test.ts` | 单元测试 | ✅ |
| `src/utils/storage/progress.test.ts` | 单元测试 | ✅ |
| `src/utils/storage/daily.test.ts` | 单元测试 | ✅ |
| `src/utils/timeService.test.ts` | 单元测试 | ✅ |
| `src/pages/Typing/hooks/useLearningSession/strategies.test.ts` | 单元测试 | ✅ |
| `src/pages/Typing/hooks/useLearningSession/learningType.test.ts` | 单元测试 | ✅ |
| `src/pages/Typing/hooks/useTypingPageSetup.test.tsx` | Hook测试 | ✅ |
| `src/pages/Typing/hooks/useWordPanelState.test.tsx` | Hook测试 | ✅ |
| `src/pages/Typing/hooks/useWordDetailNavigation.test.tsx` | Hook测试 | ✅ |
| `src/pages/Analysis/hooks/useStudyStats.test.tsx` | Hook测试 | ✅ |
| `src/pages/Typing/components/WordPanel/index.test.tsx` | 组件测试 | ✅ |
| `src/pages/Typing/components/LearningPageLayout.test.tsx` | 组件测试 | ✅ |
| `src/pages/Typing/ExtraTypingPage.test.tsx` | 组件测试 | ✅ |
| `src/pages/Typing/learningModes.integration.test.tsx` | 集成测试 | ✅ |
| `e2e/typing.spec.ts` | E2E测试 | ⚠️ |
| `e2e/learning-type-consistency.spec.ts` | E2E测试 | ⚠️ |
| `e2e/learning-flow.spec.ts` | E2E测试 | ⚠️ |
| `e2e/first-time-user.spec.ts` | E2E测试 | ⚠️ |

### 6.2 待添加测试文件

| 文件路径 | 类型 | 优先级 | 任务ID |
|----------|------|--------|--------|
| `src/dict/BaseDictAdapter.test.ts` | 单元测试 | 高 | HP-003 |
| `src/dict/adapters/CustomDictAdapter.test.ts` | 单元测试 | 高 | HP-003 |
| `src/dict/adapters/MdxDictAdapter.test.ts` | 单元测试 | 高 | HP-003 |
| `src/hooks/useSpeech.test.ts` | Hook测试 | 中 | MP-003 |
| `src/hooks/usePronunciation.test.ts` | Hook测试 | 中 | MP-003 |
| `src/utils/cache.test.ts` | 单元测试 | 中 | MP-004 |
| `src/utils/mdxParser.test.ts` | 单元测试 | 中 | MP-004 |
| `src/pages/Gallery-N/index.test.tsx` | 组件测试 | 中 | MP-001 |
| `src/pages/Gallery-N/FileDropZone.test.tsx` | 组件测试 | 中 | MP-001 |
| `src/pages/Gallery-N/Form4AddDict/index.test.tsx` | 组件测试 | 中 | MP-001 |
| `src/pages/Analysis/components/DayList.test.tsx` | 组件测试 | 中 | MP-002 |
| `src/pages/Analysis/components/DictList.test.tsx` | 组件测试 | 中 | MP-002 |
| `src/pages/MdxQuery/index.test.tsx` | 组件测试 | 中 | MP-005 |
| `src/pages/MdxManage/index.test.tsx` | 组件测试 | 中 | MP-005 |

---

## 7. 检查清单

### 7.1 开发前检查

- [ ] 确认 Node.js 版本 ≥ 18
- [ ] 确认 npm 依赖已安装
- [ ] 确认所有现有测试通过

### 7.2 第一阶段完成检查

- [ ] `@vitest/coverage-v8` 已安装
- [ ] `npm run test:coverage` 可正常运行
- [ ] GitHub Actions 工作流已创建
- [ ] 覆盖率报告可上传到 Codecov
- [ ] E2E 测试可在 CI 中运行

### 7.3 第二阶段完成检查

- [ ] 词典适配器测试覆盖率 ≥90%
- [ ] Hook 测试覆盖率 ≥80%
- [ ] 工具函数测试覆盖率 ≥90%
- [ ] Gallery 页面测试覆盖率 ≥70%
- [ ] Analysis 页面测试覆盖率 ≥70%

### 7.4 最终目标检查

- [ ] 测试/代码文件比例达到 1:5
- [ ] 总体测试覆盖率 ≥70%
- [ ] 核心模块测试覆盖率 ≥90%
- [ ] CI 流程稳定运行
- [ ] 所有 E2E 测试通过

---

**文档版本**: 1.0
**最后更新**: 2026-03-21
**生成工具**: Claude Code
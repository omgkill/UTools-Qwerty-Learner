# 项目重构方案

## 一、当前问题分析

### 1. 文档混乱

| 问题类型 | 具体问题 |
|---------|---------|
| 目录重复 | `docs/` 和 `doc/` 两个文档目录并存 |
| 根目录堆积 | 11 个临时文档：测试报告、bug 分析、根因分析等 |
| 内容冗余 | `docs/` 有 24 个文档，部分已过时或重复 |
| archive 未清理 | `docs/archive/` 存 6 个旧文档，无清理策略 |

### 2. 生成文件未清理

| 目录 | 内容 | 问题 |
|------|------|------|
| `coverage/` | 测试覆盖率报告 | 应在 .gitignore |
| `test-results/` | E2E 测试结果 | 应在 .gitignore |

### 3. 测试文件分布

共 17 个测试文件，分布合理，无需调整。

---

## 二、重构目标

1. **单一文档目录** - 只保留 `docs/`
2. **清晰的文档分类** - 按用途组织文档
3. **清理临时文件** - 移除或归档过时内容
4. **规范化命名** - 统一文件命名风格

---

## 三、文档分类方案

### 最终文档结构

```
docs/
├── README.md              # 文档导航（新增）
├── architecture.md        # 技术架构（保留）
├── business.md            # 业务逻辑（保留）
├── testing-guide.md       # 测试指南（保留）
│
├── development/           # 开发相关（新建目录）
│   ├── refactoring-retrospective.md  # 重构反思
│   ├── refactoring-lessons.md        # 重构经验
│   ├── ai-development-guidelines.md  # AI 开发指南
│   └── performance-optimization.md   # 性能优化
│
├── features/              # 功能文档（已有）
│   ├── typing.md
│   ├── analysis.md
│   ├── dictionary.md
│   ├── mistake.md
│   └── moyu.md
│
└── archive/               # 归档目录（清理后保留）
    └── README.md          # 说明归档策略
```

### 根目录只保留

```
/                           # 根目录
├── CLAUDE.md               # Claude Code 指导（核心）
├── README.md               # 项目说明
├── CONTRIBUTING.md         # 贡献指南
├── package.json            # ...
└── ...                     # 其他配置文件
```

---

## 四、执行步骤

### Phase 1: 合并文档目录

```bash
# 1. 将 doc/ 内容移到 docs/
mv doc/storage_structure.md docs/development/
mv doc/change_record.md docs/archive/
mv doc/claude开发前的计划.md docs/archive/

# 2. 删除空的 doc 目录
rm -rf doc/
```

### Phase 2: 整理根目录文档

| 文件 | 处理方式 |
|------|---------|
| `test_doc.md` | 移到 `docs/archive/` |
| `bug_report.md` | 移到 `docs/archive/` |
| `root-cause-analysis.md` | 移到 `docs/archive/` |
| `test-acceptance-report.md` | 移到 `docs/archive/` |
| `test-fix-log.md` | 移到 `docs/archive/` |
| `test-improvement-plan.md` | 移到 `docs/archive/` |
| `test-plan-for-release.md` | 移到 `docs/archive/` |
| `test-report.md` | 移到 `docs/archive/` |

### Phase 3: 整理 docs/ 目录

| 文件 | 处理方式 |
|------|---------|
| `PRD.md` | 移到 `docs/features/` 或归档 |
| `REFACTOR-ANALYSIS.md` | 移到 `docs/development/` |
| `REFACTOR-PLAN.md` | 移到 `docs/development/` |
| `learning-config-solution.md` | 移到 `docs/development/` |
| `learning-simulation-examples.md` | 移到 `docs/development/` |
| `bug-analysis-daily-limit.md` | 移到 `docs/archive/` |
| `documentation-improvements.md` | 归档或删除 |
| `project-proposal.md` | 移到 `docs/archive/` |
| `test-summary.md` | 移到 `docs/archive/` |
| `changelog.md` | 保留在 `docs/` 根目录 |

### Phase 4: 清理生成文件

```bash
# 1. 删除生成的测试报告
rm -rf coverage/
rm -rf test-results/

# 2. 确保 .gitignore 包含这些目录
```

### Phase 5: 创建文档导航

创建 `docs/README.md` 作为文档入口。

---

## 五、需要确认的问题

在执行前需要确认：

1. **PRD.md** - 是当前有效的产品需求还是已归档？
2. **project-proposal.md** - 56KB 大文件，内容是否还有参考价值？
3. **REFACTOR-PLAN.md** - 31KB，重构是否已完成？是否需要保留？
4. **docs/archive 内容** - 是否需要保留全部还是只保留最近？

---

## 六、预期结果

| 指标 | 当前 | 目标 |
|------|------|------|
| 文档目录数 | 2 (`docs/`, `doc/`) | 1 (`docs/`) |
| 根目录 md 文件 | 11 个 | 3 个 (CLAUDE.md, README.md, CONTRIBUTING.md) |
| docs/ 文件数 | 24 个 | ~10 个（按分类组织） |
| archive 文件 | 6 个 | ~15 个（集中归档） |

---

## 七、后续维护建议

1. **文档更新规则**
   - 新功能文档放 `docs/features/`
   - 开发经验放 `docs/development/`
   - 过时文档移 `docs/archive/`

2. **archive 清理策略**
   - 每季度清理超过 6 个月的归档文档
   - 或按项目版本清理

3. **禁止在根目录创建临时文档**
   - 临时分析文档放 `docs/archive/`
   - 测试报告放 `.gitignore` 目录
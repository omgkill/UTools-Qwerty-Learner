# 贡献指南

感谢你考虑为本项目做出贡献！🎉

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示你同意遵守其条款。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 了解详情。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请通过 [GitHub Issues](https://github.com/yourusername/UTools-Qwerty-Learner/issues) 提交报告。

提交 Bug 报告时，请包含：

1. **清晰的标题**：简要描述问题
2. **复现步骤**：详细的步骤说明如何复现问题
3. **预期行为**：你期望发生什么
4. **实际行为**：实际发生了什么
5. **截图**：如果适用，添加截图帮助解释问题
6. **环境信息**：
   - 操作系统
   - Node.js 版本
   - uTools 版本

### 建议新功能

我们欢迎新功能建议！请通过 [GitHub Issues](https://github.com/yourusername/UTools-Qwerty-Learner/issues) 提交。

提交功能建议时，请包含：

1. **清晰的标题**：简要描述功能
2. **使用场景**：描述这个功能解决什么问题
3. **期望行为**：详细描述功能如何工作
4. **替代方案**：描述你考虑过的替代方案

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 开发流程

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/UTools-Qwerty-Learner.git
cd UTools-Qwerty-Learner

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 测试监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 代码格式化
npm run prettier

# 构建生产版本
npm run build
```

### 项目结构

```
src/
├── components/          # 公共组件
├── pages/
│   ├── Typing/          # 打字练习页面
│   ├── Analysis/        # 学习统计页面
│   ├── MdxQuery/        # MDX 查词页面
│   └── MdxManage/       # MDX 词典管理页面
├── hooks/               # 自定义 Hooks
├── store/               # 状态管理 (Jotai)
├── utils/               # 工具函数
│   ├── storage/         # 数据存储层
│   └── ...              # 其他工具
├── types/               # TypeScript 类型定义
└── dict/                # 词典适配器
```

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有新代码
- 为函数和组件添加类型注解
- 避免使用 `any` 类型，除非确实必要

### React

- 使用函数组件和 Hooks
- 遵循 [React Hooks 规则](https://react.dev/warnings/invalid-hook-call-warning)
- 组件命名使用 PascalCase

### 状态管理

**核心原则：Jotai 是唯一状态源**

- ✅ 使用 Jotai atoms 管理全局状态
- ✅ 使用派生 atoms 计算派生状态
- ❌ 禁止 useState 和 Jotai 同时管理相同数据
- ❌ 禁止使用 Context + useReducer（已迁移到 Jotai）

```typescript
// ✅ 正确
const words = useAtomValue(wordsAtom)

// ❌ 错误
const [words, setWords] = useState([])
setWordsAtom(words)  // 双重状态源！
```

### 样式

- 使用 TailwindCSS
- 遵循移动优先的响应式设计
- 支持暗色模式

### 代码格式化

- 使用 Prettier 进行代码格式化
- 运行 `npm run prettier` 自动格式化代码
- 提交前会自动运行 pre-commit hook

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式修改（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修改 bug 的代码变动）
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `perf`: 性能优化

### 示例

```bash
# 新功能
git commit -m "feat: 添加单词收藏功能"

# Bug 修复
git commit -m "fix: 修复词库导入后不生效的问题"

# 文档更新
git commit -m "docs: 更新 README 中的安装说明"

# 重构
git commit -m "refactor: 重构学习逻辑，提升代码可维护性"
```

## 测试要求

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --run src/utils/storage/progress.test.ts

# 测试覆盖率
npm run test:coverage
```

### 测试规范

1. **新功能必须包含测试**
   - 为新功能编写单元测试
   - 确保测试覆盖核心逻辑

2. **测试文件命名**
   - 单元测试：`*.test.ts` 或 `*.test.tsx`
   - 组件测试：`*.component.test.tsx`

3. **测试内容**
   - 测试正常情况
   - 测试边界情况
   - 测试错误处理

4. **测试覆盖率**
   - 核心逻辑覆盖率应达到 80% 以上
   - 新代码不应降低整体覆盖率

### 测试示例

```typescript
describe('updateProgress', () => {
  it('应该提升掌握等级', () => {
    const progress = createTestProgress(dictId, 'word1', { masteryLevel: 1 })
    mockDB.setProgress(dictId, 'word1', progress)

    const result = updateProgress(dictId, 'word1')

    expect(result.masteryLevel).toBe(2)
  })
})
```

## Pull Request 流程

1. **确保测试通过**
   ```bash
   npm test
   npm run lint
   ```

2. **更新文档**
   - 更新 README.md（如需要）
   - 更新 CHANGELOG.md
   - 更新 API 文档（如需要）

3. **创建 Pull Request**
   - 填写 PR 模板
   - 关联相关 Issue
   - 等待代码审查

4. **代码审查**
   - 响应审查意见
   - 进行必要的修改
   - 确保所有检查通过

5. **合并**
   - 由维护者合并 PR
   - 删除特性分支

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/yourusername/UTools-Qwerty-Learner/discussions) - 提问和讨论
- 🐛 [GitHub Issues](https://github.com/yourusername/UTools-Qwerty-Learner/issues) - 报告 Bug
- 📧 邮件：your.email@example.com

## 许可证

提交代码即表示你同意你的代码将在项目的 MIT 许可证下发布。

---

再次感谢你的贡献！🙏
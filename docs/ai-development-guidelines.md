# AI开发质量保证方案

## 一、核心原则

> **测试通过 ≠ 功能正确**

> **单元测试验证逻辑，E2E测试验证界面**

> **测试用例必须基于需求文档，不能基于当前实现**

---

## 二、三层验证机制

```
┌─────────────────────────────────────────────────────────┐
│                    第三层：E2E测试                        │
│         验证真实浏览器环境下的界面展示                      │
│         命令：npm run test:e2e                           │
├─────────────────────────────────────────────────────────┤
│                    第二层：组件测试                        │
│         验证组件渲染和数据流                               │
│         命令：npm test                                   │
├─────────────────────────────────────────────────────────┤
│                    第一层：单元测试                        │
│         验证纯函数和数据结构                               │
│         命令：npm test                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 三、开发流程规范

### 3.1 需求阶段

1. **编写需求文档**
   - 明确功能描述
   - 定义预期行为
   - 列出边界情况

2. **编写测试用例文档**
   - 基于需求文档编写
   - 不要基于当前实现

### 3.2 开发阶段

1. **先写测试，再写代码**
   ```
   需求文档 → 测试用例 → 实现 → 测试验证
   ```

2. **测试用例编写规范**
   - ✅ 正确：基于需求文档编写断言
   - ❌ 错误：基于当前代码行为编写断言

3. **测试数据要模拟真实场景**
   - ✅ 正确：包含空数据、异常数据
   - ❌ 错误：只测试理想情况

### 3.3 验证阶段

1. **单元测试验证逻辑**
   ```bash
   npm test
   ```

2. **E2E测试验证界面**
   ```bash
   npm run test:e2e
   ```

3. **人工验证**
   - 运行开发服务器
   - 手动测试关键功能

---

## 四、测试编写规范

### 4.1 测试用例必须验证"变化"

```typescript
// ❌ 错误：只验证结果
expect(result.learningWords.length).toBe(18)

// ✅ 正确：验证变化
const before = determineLearningType({ ..., isExtraReview: false })
const after = determineLearningType({ ..., isExtraReview: true })
expect(before.learningWords.length).not.toBe(after.learningWords.length)
```

### 4.2 测试用例必须基于需求

```typescript
// ❌ 错误：基于当前实现
it('should return review mode', () => {
  // 这个断言是基于当前代码写的，如果代码错了，测试也会错
  expect(result.learningType).toBe('review')
})

// ✅ 正确：基于需求文档
it('should return complete mode when target reached (需求文档第3条)', () => {
  // 这个断言是基于需求文档写的
  expect(result.learningType).toBe('complete')
})
```

### 4.3 mock行为必须与实际一致

```typescript
// ❌ 错误：mock行为与实际不一致
vi.mock('./Translation', () => ({
  default: ({ trans }) => <div>{trans}</div>  // 总是渲染
}))

// ✅ 正确：mock行为与实际一致
vi.mock('./Translation', () => ({
  default: ({ trans }) => {
    if (!trans || trans.length === 0) return null  // 与实际行为一致
    return <div>{trans}</div>
  }
}))
```

### 4.4 必须测试边界情况

```typescript
// ✅ 正确：测试各种边界情况
describe('Edge Cases', () => {
  it('should handle empty data')
  it('should handle null data')
  it('should handle undefined data')
  it('should handle error case')
})
```

---

## 五、E2E测试规范

### 5.1 E2E测试验证真实界面

```typescript
// E2E测试不mock任何东西，验证真实行为
test('界面应该显示单词释义', async ({ page }) => {
  await page.goto('/')
  
  const translation = page.locator('[data-testid="translation"]')
  const isVisible = await translation.isVisible()
  
  // 这个测试会失败，如果真实环境有问题
  expect(isVisible).toBe(true)
})
```

### 5.2 E2E测试输出调试信息

```typescript
test('调试：检查页面状态', async ({ page }) => {
  const debugInfo = await page.evaluate(() => ({
    translationExists: document.querySelector('[data-testid="translation"]') !== null,
    mdxDictionaries: window.getMdxDictConfig?.()?.length || 0,
  }))
  
  console.log('调试信息:', debugInfo)
  // 可以看到真实环境中的状态
})
```

---

## 六、AI开发检查清单

### 6.1 开发前检查

- [ ] 是否有需求文档？
- [ ] 是否理解需求？
- [ ] 是否编写了测试用例文档？

### 6.2 开发中检查

- [ ] 测试用例是否基于需求文档？
- [ ] 测试数据是否模拟真实场景？
- [ ] mock行为是否与实际一致？
- [ ] 是否测试了边界情况？

### 6.3 开发后检查

- [ ] 单元测试是否通过？
- [ ] E2E测试是否通过？
- [ ] 是否手动验证了界面？

### 6.4 测试失败时检查

- [ ] 是代码错误还是测试错误？
- [ ] 测试断言是否基于需求？
- [ ] mock行为是否正确？

---

## 七、常见问题与解决

### 问题1：测试通过但功能错误

**原因**：测试断言基于错误实现

**解决**：
1. 测试用例必须基于需求文档
2. 添加"变化验证"测试
3. 添加对比测试

### 问题2：测试通过但界面错误

**原因**：测试mock了外部依赖

**解决**：
1. 添加E2E测试
2. E2E测试不mock任何东西
3. 验证真实浏览器环境

### 问题3：不知道测试什么

**原因**：没有需求文档

**解决**：
1. 先写需求文档
2. 基于需求文档写测试
3. 测试需求，不是测试实现

---

## 八、总结

| 层次 | 验证内容 | 发现问题 |
|------|---------|---------|
| 单元测试 | 纯函数逻辑 | 逻辑错误 |
| 组件测试 | 组件渲染 | UI渲染错误 |
| 集成测试 | 状态变化 | 状态同步错误 |
| E2E测试 | 真实界面 | 运行时环境问题 |
| 人工验证 | 用户体验 | 交互体验问题 |

**核心原则**：
1. 测试用例基于需求文档
2. 测试数据模拟真实场景
3. mock行为与实际一致
4. E2E测试验证真实界面
5. 多层验证，互相补充

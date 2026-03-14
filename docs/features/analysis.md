# 统计分析

展示学习数据，帮助用户了解进度。

## 页面入口

- 首页 → 统计按钮
- 路由：`/analysis`

## 热力图

### 数据来源

`Dexie.chapterRecords` 表，按日期聚合。

### 显示规则

| 颜色 | 说明 |
|------|------|
| 无色 | 当天无练习 |
| 浅绿 | 练习 1-2 次 |
| 中绿 | 练习 3-5 次 |
| 深绿 | 练习 6+ 次 |

### 组件

```typescript
// src/pages/Analysis/components/HeatmapCharts.tsx
<ActivityCalendar
  data={chapterRecords}
  blockSize={12}
  blockRadius={4}
/>
```

## WPM 趋势图

### 计算公式

```
WPM = 正确词数 / 用时(分钟)
```

### 数据来源

`Dexie.chapterRecords` 表的 `time` 和 `correctCount` 字段。

### 图表类型

折线图，展示近 30 天 WPM 变化。

```typescript
// src/pages/Analysis/components/LineCharts.tsx
<ECharts option={lineChartOption} />
```

## 正确率统计

### 计算公式

```
正确率 = 正确次数 / (正确次数 + 错误次数) × 100%
```

### 展示位置

- 章节结果页
- 统计页面总览

## 数据导出

```typescript
// src/utils/db/data-export.ts
exportData() // 导出所有练习记录
```

导出格式：JSON

## 数据范围

| 数据 | 保留时长 |
|------|----------|
| 章节记录 | 永久 |
| 单词记录 | 永久 |
| 错题记录 | 永久 |

数据存储在浏览器 IndexedDB，清除浏览器数据会丢失。
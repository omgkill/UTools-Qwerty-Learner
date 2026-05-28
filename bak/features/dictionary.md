# 词典系统

管理词典资源，支持预置词典和自定义导入。

## 预置词典

位于 `public/dicts/`，JSON 格式：

```json
[
  {
    "name": "abandon",
    "trans": ["放弃", "抛弃"],
    "usphone": "əˈbændən",
    "ukphone": "əˈbændən"
  }
]
```

### 词典分类

| 分类 | 词典 |
|------|------|
| 中国考试 | CET-4, CET-6, 考研, BEC |
| 出国考试 | TOEFL, GRE, IELTS |
| 日语 | N1-N5, 常用语 |
| 德语 | A1-C1 |
| 编程 | JavaScript, Python, Go |

词典定义：`src/resources/dictionary.ts`

## 章节机制

- 固定 **20 词/章**
- 章节数 = `Math.ceil(总词数 / 20)`
- 章节索引从 0 开始

```typescript
// 章节计算
const chapterCount = calcChapterCount(dictionary.length)
const chapterWords = dictionary.words.slice(chapter * 20, (chapter + 1) * 20)
```

## 自定义词典导入

### 支持格式

| 格式 | 说明 |
|------|------|
| JSON | 与预置词典格式相同 |
| Excel | .xlsx 文件 |

### JSON 模板

```json
[
  {
    "name": "单词",
    "trans": ["翻译1", "翻译2"],
    "usphone": "美式音标",
    "ukphone": "英式音标"
  }
]
```

### Excel 模板

位于 `public/template-dicts/`，列定义：

| 列名 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 单词 |
| trans | ✅ | 翻译（逗号分隔多个） |
| usphone | | 美式音标 |
| ukphone | | 英式音标 |

导入代码：`src/pages/Gallery-N/Form4AddDict/`

## 词典数据结构

```typescript
type DictionaryResource = {
  id: string           // 唯一标识
  name: string         // 显示名称
  description?: string // 描述
  category?: string    // 分类
  tags?: string[]      // 标签
  url: string          // JSON 路径
  length: number       // 词数
  language: LanguageType
  languageCategory: LanguageCategoryType
}
```

## 数据存储

| 数据 | 存储位置 |
|------|----------|
| 预置词典 | `public/dicts/*.json` |
| 自定义词典 | uTools DB |
| 当前词典选择 | localStorage (`currentDict`) |
# 公式编辑计算器

一个功能强大的公式编辑器和计算工具，支持多种函数和操作，允许用户动态构建复杂公式并实时计算结果。

![公式编辑器截图](./screenshot.png)

## 功能特点

- **丰富的函数库**：支持数学计算、文本处理、逻辑判断、日期操作等多种函数
- **可视化编辑**：通过点击选择函数和字段，轻松构建公式
- **实时计算**：输入变量值后立即计算结果
- **嵌套函数支持**：允许函数嵌套使用，构建复杂表达式
- **语法验证**：自动检测公式语法错误
- **动态表单**：根据公式中的变量自动生成输入表单
- **中英文对照**：字段显示中文名称的同时保留英文编码

## 安装

### 前置条件

- Node.js 16+
- npm 或 yarn

### 安装步骤

1. 克隆仓库：

```bash
git clone https://github.com/your-username/formula-editor.git
cd formula-editor
```

2. 安装依赖：

```bash
npm install
# 或
yarn
```

3. 安装 Ant Design 组件库：

```bash
npm install antd @ant-design/icons
# 或
yarn add antd @ant-design/icons
```

4. 启动开发服务器：

```bash
npm run dev
# 或
yarn dev
```

## 使用指南

### 配置公式

1. 在顶部"配置公式"区域的文本框中可以直接编辑公式，也可以通过以下方式构建：

   - 从左侧函数列表选择需要的函数
   - 从右侧字段列表选择相关字段
   - 选择函数后，会在函数列表右侧显示该函数的详细说明

2. 点击"应用公式"按钮，将公式应用到计算区域

### 应用公式

1. 在下方"应用公式"区域，可以看到当前公式及其有效状态
2. 根据公式中包含的变量，系统会自动生成输入表单
3. 在表单中输入相应值后，系统将自动计算并显示结果

## 支持的函数

### 基本运算

- **ADD**：加法运算，如 `ADD(1, 2)` 返回 3
- **SUBTRACT**：减法运算，如 `SUBTRACT(5, 2)` 返回 3
- **MULTIPLY**：乘法运算，如 `MULTIPLY(3, 4)` 返回 12
- **DIVIDE**：除法运算，如 `DIVIDE(10, 2)` 返回 5

### 常用函数

- **SUM**：求和，如 `SUM(1, 2, 3, 4, 5)` 返回 15
- **AVERAGE**：平均值，如 `AVERAGE(10, 20, 30)` 返回 20
- **MAX**：最大值，如 `MAX(10, 20, 30)` 返回 30
- **MIN**：最小值，如 `MIN(10, 20, 30)` 返回 10
- **COUNT**：计数，如 `COUNT(10, 20, "text", 30)` 返回 3（只计算数值）
- **IF**：条件判断，如 `IF(score>=60, "通过", "不通过")`

### 文本函数

- **CONCATENATE**：文本连接，如 `CONCATENATE("Hello, ", name)`
- **LEFT**：左侧截取，如 `LEFT("abcdef", 3)` 返回 "abc"
- **RIGHT**：右侧截取，如 `RIGHT("abcdef", 3)` 返回 "def"
- **MID**：中间截取，如 `MID("abcdef", 2, 3)` 返回 "bcd"
- **LEN**：文本长度，如 `LEN("Hello")` 返回 5
- **LOWER**：转小写，如 `LOWER("HELLO")` 返回 "hello"
- **UPPER**：转大写，如 `UPPER("hello")` 返回 "HELLO"

### 日期函数

- **TODAY**：当前日期，如 `TODAY()` 返回当前日期
- **NOW**：当前日期时间，如 `NOW()` 返回当前日期和时间
- **YEAR**、**MONTH**、**DAY**：提取日期部分
- **DATE**：创建日期，如 `DATE(2023, 5, 15)` 返回 "2023-05-15"

### 逻辑比较

- **LT**、**LE**、**GT**、**GE**、**EQ**、**NE**：比较运算符

## 项目结构

```
formula-editor/
├── src/
│   ├── App.jsx            # 主应用组件
│   ├── FormulaEditor.jsx  # 公式编辑器组件
│   ├── react-formula-editor.js # 公式计算逻辑
│   ├── index.css          # 全局样式
│   ├── FormulaEditor.css  # 编辑器组件样式
│   └── components/        # UI组件
│       └── ui.jsx         # 自定义UI组件
├── public/
│   └── index.html         # HTML模板
└── package.json           # 项目配置
```

## 技术栈

- React 18+
- Ant Design 5
- Vite (构建工具)

## 自定义与扩展

### 添加新函数

如需添加新函数，请按以下步骤操作：

1. 在 `FormulaEditor.jsx` 中的 `functionGroups` 和 `functionInfo` 中添加函数定义
2. 在 `react-formula-editor.js` 的 `calculate` 函数中添加函数的计算逻辑
3. 在 `extractVariables` 函数的 `functionNames` 数组中添加新函数名

### 自定义界面

您可以通过修改 CSS 文件来自定义界面样式：

- `index.css`：全局样式和布局
- `FormulaEditor.css`：公式编辑器组件样式

## 常见问题

### 嵌套函数计算错误

如果发现嵌套函数计算结果不正确，请检查：

1. 确保函数参数正确解析，特别是在有多层嵌套时
2. 检查参数分隔（逗号）是否正确
3. 确保括号匹配

### 公式无效提示

如果公式被标记为无效，可能的原因包括：

1. 括号不匹配
2. 函数名称拼写错误
3. 函数参数数量不正确
4. 参数类型不匹配

## 许可证

[MIT License](LICENSE)

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

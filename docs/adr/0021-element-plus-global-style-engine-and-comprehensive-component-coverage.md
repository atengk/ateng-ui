# 0021. Element Plus 全局样式引擎体系化拓展与全量组件覆盖架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在 `@atengk/element-plus` 基础设施增强组件库建设中，通过前期 `theme-pro.scss` 建立了基于 Dart Sass 模块化与 5 款极客科技预设（Indigo / Emerald / Violet / Ocean / Rose）及 Slate 深空冷灰暗黑模式的样式基线，并在按钮、输入框、表格、标签、开关、卡片、导航、分页、基础单/多选等高频核心上实现了高品质微光与等宽数字抗抖。

然而，对照 Element Plus 官方源码（`packages/theme-chalk/src`），官方设计系统包含 80 余个原生组件。在企业级复杂的全功能中后台场景下，大量尚未被 `@atengk/element-plus` 纳入覆写半径的原生组件暴露出了视觉断层：

1. **日期与时间选择器全家桶 (DatePicker / TimePicker / TimeSelect)**：原生下拉弹窗面板采用传统白色/灰白底色，在 Slate 暗黑模式（`#0c1017` / `#121824`）下无法自然融入，日期范围选取的高亮底色、当天指示点与毛玻璃悬浮缺乏工业级统一感；
2. **状态反馈与步骤导引体系 (Alert / Progress / Steps / Timeline / Badge / Result / Tour)**：原生样式缺乏高反差视觉重心，进度条缺少微光渐变槽位，步骤条节点缺少发光微阴影与高反差冷色过渡，警告提示缺少黑曜石卡片质感与 Specular 亮条；
3. **展示与高级布局容器 (Collapse / Segmented / Divider / Descriptions / Calendar / Splitter)**：分段控制器（Segmented）与折叠面板在暗黑与多主题切换下边框对比生硬，缺少与 AtengCard 呼应的亚像素半透明微描边与数控轻拟物交互；
4. **组件覆盖率与样式分发形态分歧**：业内在大型组件库样式定制上，存在“直接编译 Sass 源码混入构建”与“独立打包纯 CSS 变量覆写”的路线选择。若引入 Sass 编译时变量入侵，将严重增加下游接入者的打包构建配置复杂度。

## 架构决策

坚守“**纯 CSS 变量驱动（Zero-Build-Friction）、零 `!important` 铁律、高内聚领域拓扑、100% 极客微质感统一**”原则，确立以下系统级架构决策：

### 1. 样式产物双轨解耦与 SCSS 源码齐备分发契约

- **双轨解耦独立分发**：
  - `style.css`（`dist/index.css`）：收敛组件库内部所有 SFC Scoped 基础样式与命名空间基线，保持纯净轻量；
  - `theme-pro.css`（`dist/theme-pro.css`）：由 Dart Sass 独立编译打包的全量科技多主题引擎，下游仅需显式单行导入 `import '@atengk/element-plus/theme-pro.css'` 即可全量生效；
- **SCSS 源码与 Token 暴露**：`package.json` 的 `files` 字段与导出声明中完整保留 `src/styles` 目录，允许高级定制方直接按需引用内部 SCSS 模块或设计令牌。

### 2. 三大核心领域高内聚模块拓扑

在 `packages/element-plus/src/styles/theme-pro/` 目录下，新增 6 个高内聚领域 SCSS 模块，全面覆写并补齐 18+ 原生组件：

1. **`_pickers.scss` (拾取与级联域)**：
   - 覆盖：`el-date-picker`、`el-time-picker`、`el-time-select`、`el-picker-panel`、`el-cascader`、`el-cascader-panel`、`el-color-picker`；
   - 契约：下拉面板应用 `backdrop-filter: blur(16px)` 毛玻璃景深，日期范围在区高亮采用 `var(--el-color-primary-light-9)` 平滑半透波段，激光 Focus-Ring 聚焦联动；
2. **`_trees.scss` (树形与穿梭域)**：
   - 覆盖：`el-tree`、`el-tree-select`、`el-transfer`；
   - 契约：树节点悬浮亚像素高亮、激活节点黑曜石背景与主色高光条，穿梭框双面板圆角微光卡片化；
3. **`_sliders.scss` (滑块与评分域)**：
   - 覆盖：`el-slider`、`el-rate`；
   - 契约：滑块手柄双层环弹性阻尼提升动效，轨道主色发光渐变条，评分星星选中高亮与微放大微动；
4. **`_feedbacks.scss` (状态反馈与结果域)**：
   - 覆盖：`el-alert`、`el-progress`、`el-badge`、`el-result`；
   - 契约：Alert 采用黑曜石亚像素描边与左侧 Specular 微光色条，Progress 进度条增加内发光渐变与等宽数字平滑过渡，Badge 采用无边框胶囊药丸高亮微标；
5. **`_steps.scss` (流程与步骤引导域)**：
   - 覆盖：`el-steps`、`el-timeline`、`el-tour`；
   - 契约：步骤节点发光脉冲光晕，已完成步骤主色连接轨道，时间线节点高反差中心点，漫游 Tour 气泡毛玻璃浮层；
6. **`_displays.scss` (排版展示与分栏域)**：
   - 覆盖：`el-collapse`、`el-segmented`、`el-divider`、`el-descriptions` (原生补充)、`el-carousel`、`el-calendar`、`el-splitter`；
   - 契约：Segmented 采用数控立体微滑块背景，Collapse 采用统一无重叠微边框，Calendar 统一单元格悬浮与选中态，Splitter 分割手柄应用双向悬浮微光。

### 3. 原生二级 CSS 变量对齐与零 `!important` 铁律

- **变量优先级法则**：100% 优先覆写 Element Plus 原生预留的组件级二级 CSS 变量（如 `--el-datepicker-border-color`、`--el-alert-border-color-light`、`--el-step-title-font-size` 等）；
- **渐进增强**：仅在原生变量无法呈现 Specular Hairline 微光线、双层 Focus 环、等宽数字或毛玻璃景深时，使用精准的 BEM 结构选择器进行修饰；
- **零破坏性**：全链路恪守零 `!important`，确保调用方可以在任何业务组件中自由通过标准 CSS 属性或行内样式安全重载。

### 4. 纯 CSS 变量级联驱动与动态换肤零代码耦合

- 新增组件中的颜色变量严格锚定到 `--el-color-primary`、`--el-color-primary-light-1..9` 以及 `--el-color-primary-dark-2`；
- 运行时调用 `setThemeColor(color)` 时，无需在 JS 算法中硬编码新增组件的专用变量，依靠原生 CSS 变量树的天然继承与级联机制（Cascading Inheritance），即可在毫秒级内自动驱动所有 18+ 组件的色彩、聚焦环与渐变同步更新。

### 5. 自验展厅多 Tab 超级全景实装

在 `apps/sample-element-plus` 中，将 `/theme-pro` 展厅（`ThemeProPanoramaView.vue`）升级为 5-Tab 容器切片系统，集中呈现 18+ 组件在 5 套预设主题、Slate 深空暗黑基底以及运行时动态调色下的完整交互表现。

## 效果与权衡

- **收益**：
  - 彻底消灭原生 Element Plus 组件在暗黑模式与定制主题下的视觉断层，视觉完整度覆盖率跃升至 90% 以上；
  - 纯 CSS 变量级联方案零打包侵入、零构建负担，下游接入体验平滑；
  - 严格保持零 `!important`，不破坏前端组件树的天然特异度层级。
- **代价与权衡**：
  - CSS 产物体积从约 55KB 增加至约 75KB~85KB，但在中后台单页应用场景中，此开销经 Gzip 压缩后仅约 12KB~15KB，对加载性能影响极低，换取了高度统一的视觉品质。

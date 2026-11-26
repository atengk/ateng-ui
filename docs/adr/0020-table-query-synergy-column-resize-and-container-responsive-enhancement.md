# 0020. 核心表格与检索套件深度协同、列宽持久化与容器感知响应式增强架构

## 状态

Accepted (已采纳 / 已实装)

## 背景与决策上下文

在 `@atengk/element-plus` 的工业级落地实践中，以 `AtengTable`、`AtengQueryForm` 为核心的“CRUD 与检索中枢套件”承载了企业级中后台 80% 以上的高频数据流转。然而在深度业务交互与复杂布局编排中，依然暴露出以下四个深层次的体验与架构断层：

1. **列宽拖拽调整缺乏持久化记忆 (Column Resize Memory Void)**：
   Element Plus 原生 `ElTable` 支持表头拖拽调整列宽，但当前 `AtengTable` 的本地持久化（`storageKey`）仅收敛了列的排序（`order`）与显隐（`visible`）。用户花费心力调整的表格列宽在页面刷新、路由切换或翻页后彻底丢失，严重恶化数据密集型报表与财务系统的操作连续性；
2. **表格缺省态与检索表单存在“信息盲区” (Empty State Semantic Loss)**：
   当前表格在数据为空（`tableData.length === 0`）时，机械式呈现单一的“暂无数据”插画。当用户输入筛选条件查询返回 0 条时，无法直观区分“系统底层原本无数据”还是“当前筛选条件过严未匹配”，且缺乏一键清空筛选条件的闭环自愈链路；
3. **检索表单断点受制于 Window 视口，在分栏容器中发生挤压变形 (Container Query Mismatch)**：
   `AtengQueryForm` 的响应式列数断点计算直接绑定 `window.innerWidth`。当表单置于 `AtengSplitLayout`（左树右表）、`AtengDrawer` 抽屉或卡片内部时，即使屏幕为 1920px，局部容器宽度可能仅 600px~800px，表单仍强制按 3~4 列排版导致输入框严重挤压变形；同时折叠行数硬编码为单行，无法满足需要默认展开 2 行的高级搜索诉求；
4. **SFC 缺乏原生泛型支持导致下游类型推导断层 (Generic Slot Type Erasure)**：
   虽然外层 TS 声明了泛型接口，但 SFC 单文件组件未启用 Vue 3.3+ 的 `<script setup generic="T">` 语法，导致 `#batch-actions="{ selectedRows }"`、`@selection-change` 以及暴露的实例方法只能推导出 `Record<string, unknown>`，迫使业务调用方编写大量不安全的 `as UserItem[]` 强转。

## 架构决策

坚守“**纯原生 0 臃肿依赖（Zero-Bloat）、反上帝表单（No God-Form）、开箱即用深度协同**”底线，确立以下系统级架构决策：

### 1. 原生列宽拖拽调整与生命周期联合持久化契约 (Column Width Persistence)

- **非侵入式事件捕获**：`AtengTable` 默认开启列宽调整，内部监听底层 `ElTable` 原生 `@header-dragend(newWidth, oldWidth, column, event)` 事件；
- **存储契约升级**：扩展 `storageKey` 持久化数据结构，由 `{ order: string[], visible: Record<string, boolean> }` 无缝向前升级为：
  ```ts
  interface PersistedTableSettings {
    order?: string[];
    visible?: Record<string, boolean>;
    widths?: Record<string, number>;
  }
  ```
- **智能双向应用**：
  - 表格挂载与列元数据初始化时，优先回填并覆盖列宽配置（支持属性列与 SFC 插槽列）；
  - 列配置 Popover 中点击“重置”按钮时，同步清空自定义列宽，恢复列初始声明宽度；
  - **弹性防塌陷防御**：设置硬性下限 `minResizeWidth = 40px`，杜绝因极端误拖拽导致列完全塌陷消失。

### 2. 搜索感知多态缺省态与自愈清空联动机制 (Polymorphic Empty State & Reset Synergy)

- **多态状态机推导**：`AtengTable` 的 `#empty` 区域依据以下优先级确定性推导：
  1. `hasError === true` ➔ 呈现 `AtengEmpty status="network-error"` 与“点击重试”按钮；
  2. `tableData.length === 0` 且存在活跃筛选条件（通过 `tableContext.getQueryParams()` 探测存在有效检索键值）➔ 呈现 `AtengEmpty status="search"`，文案明确提示“未找到符合条件的检索结果”；
  3. `tableData.length === 0` 且无筛选条件 ➔ 呈现 `AtengEmpty status="empty"`（暂无数据插画）；
  4. 用户显式声明 `<template #empty>` ➔ 享有最高逃生门优先级。
- **一键清空与自愈闭环**：在 `status="search"` 插槽内，内置呈现“清空筛选条件”按钮，点击后自动触发 `tableContext.reset()`，通过上下文管道通知关联的 `AtengQueryForm` 重置表单，并自动将分页重置为第 1 页重新拉取数据。

### 3. 容器感知响应式断点、多行折叠与重置自触发 (Container-Aware Breakpoints & Query Synergy)

- **Container Queries 容器感知**：将 `AtengQueryForm` 视口监听全面重构为根 DOM 容器的原生 `ResizeObserver` 监听，严格根据**自身容器宿主宽度**动态计算 1~4 列栅格断点，组件卸载时确定性解绑，彻底消灭在 `AtengSplitLayout` 与弹窗抽屉内的排版挤压；
- **多行折叠编排 (Multi-Row Collapse)**：新增 `collapsedRows?: number`（默认值为 `1`），折叠态下可见项公式拓展为：
  $$\text{maxVisibleCount} = \text{collapsedRows} \times \text{cols} - 1$$
  末行末尾自适应吸附“展开/收起”与“查询/重置”操作按钮组；
- **重置自触发与上下文防双发机制**：新增 `autoSearchOnReset?: boolean`（默认 `true`），点击重置时除清空表单域外，自动触发 `@search` 广播与联动重置；同时 `AtengTableContext` 暴露 `hasPagination?: ComputedRef<boolean>` 与 `loading`，使嵌套于 `AtengTable` 的 `AtengQueryForm` 在未传 `searchLoading` 时依次回退 `props.pagination?.loading` → `tableContext?.loading`，在表格已接管分页时跳过重复 `props.pagination` 调用，并通过重入守卫消除单次重置触发两次 `resetFields()`/`emit('reset')`，且 `autoSearchOnReset: false` 对称跳过 `props.pagination.reset()` 与 `tableContext.reset()`。

### 4. Vue 3.5 SFC 原生泛型与 100% 强类型闭环防线 (Generic SFC & Strong Typing)

- **SFC 泛型标注**：`AtengTable.vue`、`AtengQueryForm.vue`、`AtengDescriptions.vue` 统一采用更兼容普通 TypeScript `interface`（无须索引签名 `[key: string]: unknown`）的 `object` 基约束：
  ```vue
  <!-- AtengTable.vue -->
  <script setup lang="ts" generic="T extends object = Record<string, unknown>, TParams extends PageQuery = PageQuery">

  <!-- AtengQueryForm.vue / AtengDescriptions.vue -->
  <script setup lang="ts" generic="T extends object = Record<string, unknown>">
  ```
- **全链路强类型打通**：
  - `AtengTableProps<T, TParams>`：`data?: T[]`, `pagination?: UsePaginationResult<T, TParams>`（双泛型透传检索参数契约 `TParams extends PageQuery`）；
  - `AtengQueryFormProps<T>`：`model?: T`, `pagination?: QueryFormPagination<T>`（以结构化最小契约承接 `UsePaginationResult<TRow, TQuery>`，解决 `TRow` 与 `TQuery` 模型异构时 `:pagination` 绑定冲突）；
  - `AtengTableEmits<T>`：`selection-change: [selection: T[]]`, `update:selectedRows: [selection: T[]]`；
  - `AtengTableSlots<T>`：`batch-actions: (scope: { selectedRows: T[]; clearSelection: () => void })`；
  - `AtengTableExpose<T>`：`selectedRows: ComputedRef<T[]>`, `getSelectionRows: () => T[]`, `toggleRowSelection: (row: T, selected?: boolean) => void`；
- 下游调用端在使用组件时，无需任何类型断言，由 TypeScript 原生推导完整获得智能补全与静态排错。

### 5. 双卡分体表面容器、设计令牌与全屏防双框契约 (Dual-Card Surface, 2026-11-26 增量修订)

- **透明根容器与 `.at-table__surface` 分体结构**：
  - `.at-table` 根容器保持透明背景；`#query` 插槽（`.at-table__query`）底部保留 `--at-table-query-gap`（默认 `16px`）间隔，并自动消解子级 `AtengQueryForm` 的 `--at-query-form-margin-bottom` 以防双倍间距；
  - 工具栏、表格主体与底部分页区统一收拢于 `.at-table__surface` 内部卡片容器，默认提供 `16px` 四周内边距、细线边框与圆角；`.at-table--fullscreen` 全屏模式下自动剥离 `.at-table__surface` 边框、圆角与重复内边距，保持单层画布正常滚动；
  - `autoHeight` 测量基准迁移至 `.at-table__main` 顶部（含单测零高度兜底），动态扣减分页栏高度与 `'card'` 模式表面底部内边距，确保底部分页条在视口内完整可见；
- **防嵌套双框逃生门 (`surface?: 'card' | 'plain'`)**：
  - `AtengTable` 与 `AtengQueryForm` 同步提供 `surface?: 'card' | 'plain'`（默认 `'card'`）；嵌入 `ElCard`、`AtengCard`、弹窗或非 `ghost` `AtengPageContainer` 时可设 `surface="plain"` 铺平背景、边框、圆角与外围内边距；
- **双样式包对齐令牌**：
  - `AtengTable` 暴露 `--at-table-card-radius`（回退 `var(--at-radius-card, var(--el-border-radius-base, 6px))`）、`--at-table-card-border`（回退 `1px solid var(--el-border-color-light, #e4e7ed)`）、`--at-table-surface-padding`（`16px`）、`--at-table-query-gap`（`16px`）；
  - `AtengQueryForm` 暴露 `--at-query-form-border`、`--at-query-form-radius`、`--at-query-form-padding`（`'card'` 默认 `16px 16px 0`，`'plain'` 为 `0`）、`--at-query-form-margin-bottom`（独立默认 `16px`）；
  - 可选 `theme-pro/_tables.scss` 额外为 `'card'` 模式提供 `var(--el-box-shadow-light)` 微影与暗黑边框质感（恪守零 `!important`）。

### 6. 分页栏主轴分布、容器响应式降级与空/单页收敛 (Adaptive Pagination Convergence, 2026-11-26 增量修订)

- **主轴分布与等宽安全换行**：
  - 新增 `paginationAlign?: 'between' | 'end'`（默认 `'between'`）；当为 `'between'` 且有效 `layout` 含 `total`、不含 `->` 且 `total` 不在末尾时，在 `total` 后自动注入 `->` 以复用 Element Plus `.el-pagination__rightwrapper` 右侧分组（换行后右侧控件组仍整体右对齐），无 `total` 或置尾时平稳退化右对齐；
  - `AtengTable` 与 `AtengExcelFeedback` 分页容器在 SFC `scoped` 样式内置 `font-variant-numeric: tabular-nums`、`flex-wrap: wrap`、`gap: 8px` 与 `--el-pagination-border-radius` 现代圆角，不依赖 `theme-pro.css` 独立生效；
- **容器宽度自适应降级**：
  - 新增 `responsivePagination?: boolean`（默认 `true`）与 `paginationPagerCount?: number`（默认 `7`，校验合法奇数 $5 \sim 21$）；基于根容器 `ResizeObserver` 监听宽度：`< 640px` 降级 `pagerCount <= 5` 并隐藏 `jumper`；`< 480px` 进一步隐藏 `sizes` 并切换 `size="small"`；
- **空数据与单页自动收敛**：
  - 新增 `hidePaginationOnEmpty?: boolean`（默认 `true`）与 `hideJumperOnSinglePage?: boolean`（默认 `true`）；
  - 显式 `showPagination` 拥有最高优先级；未显式覆盖时 `total <= 0` 自动隐藏分页区（含 `#pagination` 插槽）；`total > 0` 且总页数 $\le 1$ 时自动从有效 `layout` 剔除 `jumper`（保底防止自定义极简 layout 被置空），总页数 $\ge 2$ 自动恢复。

## 效果与影响

- **收益 (Benefits)**：
  - 彻底解决了企业级中后台表格中“列宽调整无法记忆”与“搜索 0 条时用户体验困惑”的两大核心痛点；
  - 检索表单在分栏布局与容器拖拽下具备了纯原生的弹性流式响应能力；
  - 下游业务工程调用组件时获得 100% 强类型保护，根除裸 `any` 与类型强转；
  - 保持 0 外部重型依赖，整体产物体积与运行性能不受任何影响。
- **代价与权衡 (Trade-offs)**：
  - `storageKey` 持久化存储对象字段由 2 个扩充为 3 个，通过可选字段兼容老版本存储结构；
  - `ResizeObserver` 在老旧浏览器需依赖 Polyfill，但在现代企业级中后台基线（Chrome/Edge 90+）下 100% 原生支持。

# 0020. 核心表格与检索套件深度协同、列宽持久化与容器感知响应式增强架构

## 状态

Proposed (待确认 / 评审就绪)

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
- **重置自触发机制**：新增 `autoSearchOnReset?: boolean`（默认 `true`），点击重置时除清空表单域外，自动触发 `@search` 广播与 `tableContext.search()`，消灭业务重复编写重置后查询的样板代码。

### 4. Vue 3.5 SFC 原生泛型与 100% 强类型闭环防线 (Generic SFC & Strong Typing)

- **SFC 泛型标注**：`AtengTable.vue`、`AtengQueryForm.vue`、`AtengDescriptions.vue` 统一升级为：
  ```vue
  <script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">
  ```
- **全链路强类型打通**：
  - `AtengTableProps<T>`：`data?: T[]`, `pagination?: UsePaginationResult<T>`；
  - `AtengTableEmits<T>`：`selection-change: [selection: T[]]`, `update:selectedRows: [selection: T[]]`；
  - `AtengTableSlots<T>`：`batch-actions: (scope: { selectedRows: T[]; clearSelection: () => void })`；
  - `AtengTableExpose<T>`：`selectedRows: ComputedRef<T[]>`, `getSelectionRows: () => T[]`, `toggleRowSelection: (row: T, selected?: boolean) => void`；
- 下游调用端在使用组件时，无需任何类型断言，由 TypeScript 原生推导完整获得智能补全与静态排错。

## 效果与影响

- **收益 (Benefits)**：
  - 彻底解决了企业级中后台表格中“列宽调整无法记忆”与“搜索 0 条时用户体验困惑”的两大核心痛点；
  - 检索表单在分栏布局与容器拖拽下具备了纯原生的弹性流式响应能力；
  - 下游业务工程调用组件时获得 100% 强类型保护，根除裸 `any` 与类型强转；
  - 保持 0 外部重型依赖，整体产物体积与运行性能不受任何影响。
- **代价与权衡 (Trade-offs)**：
  - `storageKey` 持久化存储对象字段由 2 个扩充为 3 个，通过可选字段兼容老版本存储结构；
  - `ResizeObserver` 在老旧浏览器需依赖 Polyfill，但在现代企业级中后台基线（Chrome/Edge 90+）下 100% 原生支持。

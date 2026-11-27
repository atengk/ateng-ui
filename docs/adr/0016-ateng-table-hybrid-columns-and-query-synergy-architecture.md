# 0016. AtengTable 渐进混合列架构、双轨分页状态绑定与查询表单联动策略

## 状态

Accepted (已接受)

## 背景与决策上下文

在面向企业级系统的 UI 表现层建设中，数据表格与高级检索表单是承载业务价值最密集、开发占比最高的两大核心容器。长期以来，业内在表格设计上面临四项尖锐的技术权衡：

1. **列定义模式的两极分化**：纯 Schema / JSON 驱动虽然有利于动态解析列配置与远程渲染，但割裂了 Vue SFC 原生模板体验，导致自定义列模板必须退化为 JSX/渲染函数或受限插槽，显著损害了代码可读性与 IDE 自动补全；而纯原生 `<el-table-column>` 又使列状态沦为静态标签，难以被外部工具栏动态感知以实现列显隐、拖拽排序与本地持久化。
2. **状态机与表现层模板的胶水代码冗余**：业务组件在接入分页列表时，通常必须将 `records`、`loading`、`total`、`current`、`size` 离散传给 `<el-table>` 与 `<el-pagination>`，并在 `sort-change`、`current-change`、`size-change` 处编写大量样板重复逻辑。
3. **查询表单与表格状态脱节**：搜索表单与表格多作为彼此割裂的组件，开发者必须在父组件中手动监听 `@search` / `@reset` 并显式调度状态机，增加了模板胶水代码。
4. **跨页多选与批量操作体验割裂**：翻页时默认丢失前页选中项，缺乏清晰的跨页选择累积指示与沉浸式批量操作交互。

## 架构决策

基于“**原生优先、渐进增强、深模块解耦、强类型闭环**”原则，确立以下架构决策：

1. **渐进混合列架构 (Slot-First Metadata Hybrid Contract)**：
   - 原生 `<el-table-column>` 作为第一公民，保留最直观的 Vue 模板语法与复杂作用域插槽支持；
   - `AtengTable` 挂载与更新时，动态递归遍历默认插槽 VNode，提取 `prop`、`label`、`fixed` 等列元数据注入工具栏“列配置”面板；
   - 同时支持可选的 `columns: TableColumnConfig[]` 属性，满足服务端下发动态列的特殊场景；
   - 工具栏“列配置”浮层（`el-popover`）支持列显隐切换、左右固定与顺序重排，并支持通过 `:storage-key` 属性实现 `localStorage` 用户偏好持久化。
2. **双轨分页状态绑定机制 (Dual-Track Pagination Binding Contract)**：
   - 提供 `:pagination="paginationState"` 高阶属性，直接接收 `@atengk/vue` 导出的 `UsePaginationResult` 实例，自动双向接管数据渲染、Loading 遮罩、分页条属性与服务端排序联动；
   - 保持向下逃生门，同时支持原生 `:data`、`:loading`、`:total`、`v-model:current`、`v-model:size` 等离散属性与原生事件，确保在不引入 `usePagination` 的场景下依然可作为纯 UI 容器工作。
3. **查询表单解耦与感知双模联动 (Dual-Mode Query Synergy Contract)**：
   - `AtengQueryForm` 基于 24 栅格响应式布局，支持自适应断点（1~4 列）与平滑折叠展开，内置查询/重置操作防抖；
   - **独立受控模式**：通过 `:model` 绑定与 `@search` / `@reset` 事件向外解耦输出；
   - **Table 嵌套感知模式**：当置于 `AtengTable` 的 `#query` 插槽时，`AtengTable` 通过 `provide` 注入表格上下文，`AtengQueryForm` 自动触发 `pagination.search(formData)` 与 `pagination.reset()`，彻底消灭业务胶水代码。
4. **原生 reserve-selection 增强与底部粘滞悬浮条 (Sticky Batch Bar)**：
   - 依赖 `row-key` 开启 Element Plus 原生 `reserve-selection` 机制，保证跨页选择状态确定性记忆；
   - 当选中项 `selectedCount > 0` 时，在表格容器内部平滑向上滑出粘滞操作条（`position: sticky; bottom: 0; z-index: 10;`），展示已选数量、清空选择按钮与 `#batch-actions` 批量业务操作插槽，严禁遮挡宿主外部布局。
5. **显式收敛门面与 100% 原生穿透 (Encapsulated Facade with Passthrough)**：
   - 组件通过 `defineExpose` 显式收敛导出高频方法：`clearSelection`、`toggleRowSelection`、`getSelectionRows`、`refresh`；
   - 同时透传底层 `tableRef: ShallowRef<ElTableInstance | null>`，保留开发者调用原生 Element Plus 底层全部方法的能力；
   - 入口 `index.ts` 具名导出专属类型 `AtengTableInstance` 与 `AtengQueryFormInstance`。
6. **插槽模式强类型默认隐藏列契约 (`defaultHiddenColumns`, 2026-11-28 增量修订)**：
   - **背景与被否决方案**：Element Plus 原生 `TableColumnProps` 不包含 `visible` 属性，开启 `vue-tsc` 严格校验后无法在 `<el-table-column>` 上直接声明 `:visible="false"`。架构上否决了两项备选路径：① 封装 `<AtengTableColumn>` 包装组件（违背“原生 `<el-table-column>` 作为第一公民”原则，抬高模板迁移成本）；② 对 `element-plus` 进行全局模块类型增强（污染宿主工程全局类型并引入跨表格隐式副作用）；
   - **集中式强类型属性**：在 `AtengTableProps<T, TParams>` 新增可选属性 `defaultHiddenColumns?: readonly ((keyof T & string) | (string & {}))[]`（向下 100% 兼容 `string[]` 与 `as const` 只读元组，在 `<AtengTable<T>>` 泛型下提供行字段补全，同时兼容 `'操作'`、`'selection'` 等非 `prop` 键），按既有列唯一键推导规则（`prop || label || String(type)`）匹配；
   - **双轨并集与四级优先级**：收口统一默认显隐辅助函数，以 `col.visible === false || defaultHiddenSet.has(key)` 判定默认隐藏，确保 `:columns` 与 `<el-table-column>` 插槽模式语义一致且不破坏 `parseColumnVNodes` 返回值契约；列最终显隐优先级锁定为 `localStorage[storageKey].visible[key] > 会话内用户手动显隐覆盖 > 默认隐藏 > true`（保持 `savePersistedColumns()` 既有 `{ order, visible, widths }` 全量快照契约不变）；
   - **重置与响应式同步边界**：点击列设置「重置」或调用 `resetColumns()` 时同步清空本地持久化与会话内覆盖，并按 `defaultHiddenColumns` 及 `col.visible` 还原默认显隐态；`defaultHiddenColumns` 响应式变化按规范化键集合内容签名比对（避免模板内联字面量重渲染误触发），仅重算未持久化且未被当前会话手动改过的列并保留当前列序与列宽，且保持静默不主动派发 `@columns-change`。

## 效果与权衡

- **收益**：
  - 开发者可以继续使用熟悉的 `<el-table-column>` 书写模板插槽，同时零成本获得列显隐管理与本地持久化记忆；
  - 单行 `:pagination="pagination"` 消除 80% 以上的分页联动样板代码；
  - 底部粘滞批量条提供了工业级后台系统的高质感沉浸交互，且物理隔离在表格容器内，杜绝多 Tab 或弹窗场景下的布局错位。
- **代价与权衡**：
  - 插槽 VNode 动态解析需要针对动态循环渲染（如 `v-for` 渲染列）与 Fragments 进行平铺解构处理，组件内部增加了微量 VNode 解析逻辑，以换取极高的上层开发体验。

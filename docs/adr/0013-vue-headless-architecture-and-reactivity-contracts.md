# 0013. Vue 3.5 无头响应式基础设施架构与状态单向契约

## 状态

Accepted (已接受)

## 背景与决策上下文

随着 `@atengk/core` (L0) 纯原生核心底座的建立与封顶，系统进入 L1 无头响应式层（`@atengk/vue`）的建设阶段。作为连接底层无框架纯 TS 核心与上层 UI 组件库（`@atengk/element-plus`）的关键纽带，`@atengk/vue` 需要在 Vue 3.5 响应式世界中优雅调度异步状态。然而，传统中后台 Composables 常陷入以下架构陷阱：

1. **状态任意突变引发脏流向**：调用方在组件模板或方法中随意修改 `loading.value = false` 或突变返回实体，破坏状态机确定性与数据流单向透明性；
2. **高频操作时序倒挂**：Tab 快速切换、翻页或搜索输入联动时，后发请求先回导致界面数据被前序慢请求覆盖（异步竞态）；
3. **分页与网络样板代码泛滥**：每个列表页面反复手写 `pageNum`、`pageSize`、`total` 计算与 `onMounted` 触发逻辑，且空数据时偶现 `undefined` 导致白屏崩毁；
4. **无头层跨界侵入 UI**：无头 Hook 内部直接调用具体的全局弹窗（如 `ElMessage`），破坏无头设计，导致下游无法替换 UI 库或在非 DOM 环境复用；
5. **重型依赖与版本绑架**：盲目引入全量 VueUse、Lodash 或 TanStack Query，造成依赖树膨胀与版本冲突风险。

## 架构决策

基于“**纯响应式状态机、无头解耦、单向数据流、零臃肿依赖与确定性生命周期**”原则，确立以下架构决策：

1. **10 核心 Composables 领域版图收敛**：
   - **异步请求与竞态**：`useRequest`（防抖/节流/轮询/只读状态机）、`usePagination`（零样板契约分页）、`useLatest`（抗时序倒挂状态机）；
   - **权限与租户治理**：`useAuth`（双轨 Token 与细粒度权限/角色校验门面）、`useTenant`（多租户上下文响应式切片）；
   - **防刷与幂等控制**：`useIdempotent`（提交互斥锁与防刷防重触发器）；
   - **数据交换与文件**：`useExcel`（Fesod 协议流式导出与错误批注驱动）、`useUpload`（大文件切片与并发进度协调）；
   - **流式与全双工长连接**：`useStream`（SSE 打字机增量响应）、`useWebSocket`（全双工双向心跳与离线缓冲状态机）。
2. **严格单向数据流与只读状态防线**：
   - 核心状态（如 `loading`、`data`、`error`、`total`、`list`）统一通过 `readonly()` 导出为只读 Ref（`Readonly<Ref<T>>`），禁止调用方就地写操作；
   - 状态更新仅能通过动作门面（`run`、`refresh`、`reset`）或显式的乐观更新方法（`mutate((prev) => next)`）触发。
3. **`usePagination` 基于 `useRequest` 深度组合**：
   - `usePagination` 不重复造轮子，其底层基于 `useRequest` 进行契约特化与参数联动；
   - 自动绑定 `PageQuery`，自动解包 `PageResult<T>`，空查询结果集 100% 保底返回空数组 `[]`，继承防抖与抗竞态能力。
4. **异步竞态双重协同防御机制**：
   - 在 `useLatest` 及 `useRequest({ cancelPrevious: true })` 中，采用“物理中断 + 逻辑过期”双重防线；
   - 优先通过 `AbortController` 物理切断底层在途 HTTP 请求节省带宽；同时通过递增递次 Token / Sequence ID 标记前序 Promise 过期，彻底丢弃过期结果回调，根治时序倒挂。
5. **按需直调与全局上下文双轨并存**：
   - 默认纯函数开箱即用，无需执行 `app.use()` 即可直接调用（默认绑定 `@atengk/core` 全局默认单例）；
   - 额外提供轻量插件 `createAtengVue(options)` 与组合式函数 `provideAtengConfig(options)`，支持在上层统一注入全局默认分页大小、自定义 `HttpClient` 与全局错误处理器。
6. **零额外重型第三方依赖与纯 Vue 3.5 原生驱动**：
   - 严格锁定 `peerDependencies: { "vue": ">=3.5.0" }` 与 `dependencies: { "@atengk/core": "workspace:*" }`；
   - 坚决不引入 VueUse、Lodash 或 TanStack Query；防抖节流、DOM 事件受管清理等辅助函数采用纯原生在包内局部闭环实现（≤20行且确定性挂载 `onScopeDispose`）。

## 效果与权衡

- **收益**：
  - 架构高度纯净统一，全面继承 L0 底座的工业级韧性，上层表现层组件只需专注视图渲染；
  - 彻底规避了第三方库升级带来的破坏性变更与体积膨胀，构建产物保持极致轻量；
  - 只读状态与双重竞态防线将中后台最常见的时序脏数据与空指针崩溃彻底消除在框架底层。
- **代价**：
  - 调用方若需本地直接修改数据，必须适应显式调用 `mutate()` 范式，略增加数行学习成本，但换取了确定性的可维护性。

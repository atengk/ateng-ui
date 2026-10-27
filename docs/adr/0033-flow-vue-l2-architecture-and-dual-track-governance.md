# 0033. FlowVue L2 扩展层架构与双轨运行态治理规范

- **状态**: accepted
- **日期**: 2026-10-27
- **作者**: Ateng

## 背景与上下文

在企业级中后台系统中，工作流（Workflow）、审批流（OA Approval）与状态机流转（State Machine / DAG）是胶水代码最重、定制成本最高的核心场景。业务既需要在管理端对流程进行可视化编排与属性配置（设计态），又需要在业务详情页对工单流转进度、历史审批记录进行只读展示与动态高亮（运行态）。

依循 `ateng-ui` 四层洋葱拓扑（ADR-0009）与 L2 扩展层约束，`@atengk/flow-vue` 作为专业流程引擎扩展包，必须保持平台与具体 UI 库解耦（零 Element Plus 物理依赖），同时覆盖企业绝大多数高频工作流场景。

## 架构决策矩阵 (Architecture Decisions)

### 1. 核心定位与双轨组件体系 (Core Positioning & Dual-Track Components)

- **`<AtengFlowDesigner />`（设计态）**：面向管理端的可视化编排设计器，内置工具栏、物料面板（Stencil）、属性抽屉（Property Drawer）与 MiniMap；
- **`<AtengFlowViewer />`（运行态）**：面向详情与审批页的只读流转追踪器，内置节点五态高亮（`completed` / `processing` / `rejected` / `pending` / `terminated`）、流动虚线动效与悬停审批意见浮层；
- **`useFlow()`（无头状态机）**：暴露画布生命周期、缩放/居中、撤销/重做、选区操作与拓扑导出 API。

### 2. L2 零 UI 依赖与 100% 插槽控制反转 (Zero-UI & Slot Inversion)

- 内部采用原生 HTML/CSS（以 `at-flow-*` 命名空间隔离）实现轻量高颜值面板，绝不引入外部第三方 UI 库；
- 对外 100% 暴露具名插槽（`#toolbar`、`#stencil`、`#panel`、`#minimap`），调用方在业务层使用 Element Plus 时可无缝使用 `<el-form>` 和 `<el-drawer>` 完整替换。

### 3. 数据契约与标准协议双向适配 (Data Schema & BPMN Adapter)

- 响应式核心统一使用强类型 `FlowGraph` JSON（`{ nodes: FlowNode[], edges: FlowEdge[] }`）；
- 内置 `BpmnAdapter`，原生支持从 Flowable / Camunda 的 BPMN 2.0 XML 双向无损导入与导出，保留业务扩展元数据。

### 4. Vue 3 SFC 单文件组件自定义节点机制 (Vue Node Registry)

- 封装 Vue 节点注册系统，允许开发者直接用标准 Vue 3 SFC 编写富 UI 流程卡片（头像、标签、进度条），由容器自动提供强类型 Props（`node`, `graph`）注入。

### 5. 物料面板与连线防呆治理 (Stencil & Connection Governance)

- **物料面板**：三段式分类（事件图元、任务图元、网关控制），默认开启点阵/网格背景、智能对齐线（Snapline）与网格吸附；
- **连线治理**：默认采用正交平滑折线（OrthogonalEdge）并支持四向吸附；内置防呆规则（禁止自环、开始不可连入、结束不可连出、禁止重线）及 `beforeConnect` 拦截钩子。

### 6. 静态校验引擎与自动排版 (FlowValidator & AutoLayoutEngine)

- **静态校验器（`validate()`）**：检测起止节点唯一性、连通孤岛、排他网关分支数及条件配置、死循环，并在画布上闪烁红框高亮错误节点；
- **自动排版引擎**：基于 DAG 分层算法，一键实现水平（LR）或垂直（TB）流动规整排版并平滑动画过渡。

### 7. 高清快照与运行态视口人体工学 (Snapshot & Viewer Ergonomics)

- **高清导出**：计算全图最小外接矩形（Bounding Box），支持 2x/3x DPR 防发虚导出 PNG/JPG、矢量 SVG 文本与安全水印；
- **运行态人体工学**：启用滚轮防冲突守卫（`WheelZoomGuard`），防止滚动页面时误缩放；支持 `SmartFocus`，加载时自动聚焦流转中待办节点。

### 8. 确定性生命周期治理 (Deterministic Lifecycle Cleanup)

- 基于 `ResizeObserver` 实施容器尺寸感应自愈，彻底消除弹窗与 Tabs 中 `0x0` 几何崩溃；
- 在 `onUnmounted` 中严格执行“四步清理”：解绑 Resize 监听、销毁 Vue SFC 节点实例池、清理 MiniMap 与画布事件、显式调用 `lf.destroy()` 并置空引用。

## 决策后果

- **收益**：打造了不依赖任何特定 UI 库的高性能工作流底座，同时兼顾了国内 OA 审批与标准 BPMN 2.0 规范，开箱即用度极高。
- **约束**：所有对外公开功能必须在 `apps/sample-flow-vue` 提供 4 大高保真场景对标自验（审批流设计器、工单运行态追踪、Vue SFC 自定义节点、规则链拓扑）。

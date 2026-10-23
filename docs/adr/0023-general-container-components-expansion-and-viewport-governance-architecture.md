# 0023. 通用容器组件矩阵扩充、视口脱壳全屏与防篡改治理架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在 [ADR-0019](./0019-page-scaffold-and-container-architecture.md) 中，组件库确立了 `AtengPageContainer`、`AtengSplitLayout`、`AtengFooterBar`、`AtengCard`、`AtengPageSkeleton` 5 大核心页面骨架容器，统一了双模视口滚动与页头规范。然而随着企业级系统向深水区演进，通用容器生态在实际业务落地中仍存在以下关键缺失与体验痛点：

1. **企业数据合规与防泄密水印缺位**：敏感业务场景（用户信息、财务资产、审批归档）对防截屏泄密有强合规要求，缺乏开箱即用的安全水印包裹容器；同时前端 DevTools 篡改抹除防护脆弱，容易被恶意删除节点或修改 `display: none`；
2. **长表单与大详情页电梯楼层导航缺乏工业级支撑**：复杂配置页与审批流存在垂直长内容，原生锚点（`el-anchor`）在 `AtengPageContainer` 的 `fitViewport` 局部滚动容器（`.at-page-container__content`）中计算偏移严重错位、滚动监听失灵，且缺乏与 `AtengCard` 的声明式联动；
3. **分栏与弹层场景下的栅格排版失真**：`el-row` / `el-col` 依赖浏览器 window 视口的媒体查询（`@media`），在 `AtengSplitLayout` 拖拽调宽、弹窗或抽屉中，容器自身变窄但视口宽度未变，导致断点错乱挤压；
4. **多卡片折叠缺乏集中协调总线**：页面纵向堆叠多个 `AtengCard` 时，缺乏统一的手风琴互斥单开模式（Accordion）及一键全部展开/全部收起的管理容器；
5. **卡片面板功能缝隙**：企业级仪表盘卡片高频需要右上角局部刷新操作（带旋转动画）以及在标题行快速切换分段页签（Tabs），存量组件强迫业务在 `#extra` 中自行手工拼装；
6. **页面脱壳全屏诉求**：宽表审计与大图流程排查时，用户需要将当前页面内容一键铺满整个真实屏幕。若仅使用简单的 `position: fixed`，容易受宿主母版侧边栏/顶栏已有的 `transform` 包含块降级影响导致无法真正铺满。

## 架构决策

基于深模块高内聚、零臃肿依赖与主动防御原则，确立以下架构决策：

### 1. 通用容器矩阵扩充 4 大新成员

1. **`AtengWatermark`（企业级安全防篡改水印容器）**：
   - **离屏矢量渲染**：采用纯原生 Canvas 离屏离线生成高清 Base64 Data URL 注入背景层，高 DPI 视网膜抗锯齿，支持多行文本、图片、自定义旋转角度与间距；
   - **主动防御不变量 (Anti-Tamper Invariant)**：标配 `MutationObserver` 严密监听水印层 DOM 属性（`display`、`opacity`、`visibility`、`transform` 等）篡改及父节点子树删除事件；一旦侦测到恶意修改或删除，在微任务队列立即原地强制重新绘制与插入；
2. **`AtengAnchor`（电梯楼层导航锚点容器）**：
   - **双模滚动自适应感知**：默认向上智能探测最近的祖先滚动容器，无缝识别 `AtengPageContainer` 内部局部滚动与外部 `window` 滚动，并提供 `container` 显式逃生舱；
   - **声明式数据驱动**：支持 `items: AtengAnchorItem[]` 配置，内置 `targetOffset` 吸顶避让偏移量与原生 `smooth` 平滑滚动，完美联动带有对应 `id` 的 DOM 节点与 `AtengCard`；
3. **`AtengGrid`（现代容器查询自适应网格容器）**：
   - **纯 CSS 原生流式优先**：采用 `grid-template-columns: repeat(auto-fill, minmax(minItemWidth, 1fr))` 实现无断点完美流式自适应，默认 `minItemWidth="260px"`、`gap="16px"`；
   - **零 JS 性能损耗**：消除 ResizeObserver JS 监听的重排与抖动开销，同时兼容现代 CSS `@container` 查询与可选 `cols` 固定列数覆盖；
4. **`AtengCardGroup`（多卡片手风琴编排容器）**：
   - **上下文总线模型**：基于 Vue `Provide/Inject` 协调子 `AtengCard`，支持 `v-model:activeKeys` 双向绑定、`accordion: boolean` 手风琴单开互斥，并通过组件实例暴露 `expandAll()` 与 `collapseAll()` 控制方法。

### 2. 存量页面与面板容器深度增强

1. **`AtengCard` 增强**：
   - 规范增加 `showRefresh`（默认 false）与 `@refresh` 事件，点击触发平滑旋转动效，与卡片局部 `loading` 无缝协同；
   - 规范增加具名插槽 `#tabs` 与 `tabsPosition: 'top' | 'bottom'`，实现卡片头部页签的紧凑内嵌与沉降排版；
2. **`AtengPageContainer` 增强**：
   - **Teleport to Body 顶层脱壳全屏**：全屏状态下通过 `<Teleport to="body">` 瞬移至页面最顶层，赋予 `position: fixed; inset: 0; z-index: 2000`，彻底绕过宿主侧边栏已有的 CSS `transform` 样式隔离陷阱；
   - 接入模块级全局引用计数 `lockScroll` 滚动锁定与 ESC 快捷键退出，支持 `collapseHeaderOnScroll` 滚动折叠页头；
3. **`AtengSplitLayout` 保持双栏极简**：
   - 坚守双栏单向状态机，三栏场景通过在 `second` 插槽内嵌套子 `AtengSplitLayout` 实现，保持各自独立 `storageKey` 记忆与零膨胀复杂度。

## 效果与权衡

- **收益**：
  - **企业级通用容器版图完整闭环**：形成覆盖页面骨架、分栏布局、流式自适应网格、安全水印、楼层导航、手风琴编排与操作吸底的全场景容器矩阵；
  - **安全与鲁棒性全面提升**：水印具备真正的 F12 防篡改防御能力，页面全屏具备彻底绕过包含块的宿主兼容能力，锚点具备局部滚动容器穿透能力；
  - **保持零重型第三方依赖**：水印、网格、锚点均坚持纯原生 TS/CSS 与 Vue 响应式标准实现。
- **代价**：
  - `AtengWatermark` 的 `MutationObserver` 需防范自身重绘引发的回调死循环，需严格在微任务中通过标志位实施防抖互斥；
  - `AtengPageContainer` 的 `Teleport` 提升破坏了原本的 DOM 树层级，需确保事件冒泡与上下文依赖正常流动。

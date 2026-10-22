# 0019. 系统页面骨架与容器套件架构设计与双模滚动治理

## 状态

Accepted (已接受)

## 背景与决策上下文

在 `@atengk/element-plus` 企业级组件套件的演进过程中，已具备了 `AtengTable`、`AtengQueryForm`、`AtengDescriptions`、`AtengDialog`、`AtengDrawer` 等高阶数据呈现与弹层交互组件。然而在实际构建复杂中后台业务页面时，视图层依然存在大量重复的骨架样板代码与体验痛点：

1. **页面头部与排版样式重复碎片化**：每个业务页面均需手工拼装面包屑（Breadcrumb）、返回箭头、页面标题、副标题、操作区按钮与内嵌页签（Tabs），缺乏统一标准与暗黑模式适配；
2. **滚动条失控与视口双滚动条灾难**：表格页面既需要利用视口剩余空间撑满屏幕（让表格内部滚动、固定表头与底部翻页栏），而长表单或图文详情页又需要整页天然流动滚动。业务开发者普遍采用脆弱的 `calc(100vh - 220px)` 魔法值，极易造成页面同时出现内外双重滚动条或底部被截断；
3. **高频“左树右表”分栏交互缺乏工业级基座**：组织机构管理、类目商品管理等高频场景需要左侧分栏与右侧内容，手写分栏通常缺失平滑拖拽调宽、`min/max` 防越界阈值、一键收起折叠触发把手以及刷新后的宽度偏好记忆；
4. **吸底操作栏遮挡内容与避让侧边栏困难**：长表单提交栏浮在视口底部时，极易遮挡最下方的数据字段；若采用绝对/固定定位，若未动态避让左侧菜单导航栏，会发生层级重叠覆盖；
5. **卡片面板功能单一与全屏能力缺失**：原生 `el-card` 仅提供静态样式包裹，缺乏企业级常用的标题区标准化、一键平滑折叠、视口最大化全屏展开及局部 Loading 遮罩；
6. **页面异步加载阶段体验突变**：数据请求过程中缺乏契合业务形态（表格、表单、详情、卡片）的标准化骨架屏平滑过渡，导致视图白屏或闪烁突变。

## 架构决策

基于深模块高内聚与最小心智负担原则，确立以下架构决策与设计规范：

### 1. 轻量聚焦页面级容器，解耦整站全局母版 (Page-Level Decoupling Invariant)

- **职责边界**：`@atengk/element-plus` 作为 L3 基础设施组件库，核心聚焦于**页面内部的通用框架、容器与骨架组件**；
- **解耦整站 Shell**：不将包含顶栏 Header、左侧多级折叠菜单、Vue Router 路由监听与 Pinia 状态绑定的整站母版（Admin Shell）强行内置入基础组件库，避免将组件库与特定的全局状态管理/权限体系深度耦合，确保容器能在任何管理后台、单体页面、微前端或独立弹框沙箱中无缝复用。

### 2. 页面骨架与容器五大核心组件矩阵 (The 5 Core Containers)

规范并落地 5 个高频核心基础设施容器：

1. **`AtengPageContainer`（企业级标准页面容器）**：
   - 标配统一页头结构：`title`、`subTitle`、`breadcrumb`、`showBack` 返回箭头、`tags` 标牌插槽、`extra` 操作按钮区与 `tabs` 内嵌页签联动；
   - 标配双模滚动受控模型：通过 `fitViewport` 属性无缝切换 Flex 撑满模式与流动页面模式；
   - 标配 `ghost` 模式：支持内容区透明沉浸（由子视图自由放置卡片）与默认白底卡片包裹。
2. **`AtengSplitLayout`（弹性拖拽分栏容器）**：
   - 纯原生鼠标事件驱动的拖拽调宽（零第三方臃肿依赖），支持水平（`horizontal`，左树右表）与垂直（`vertical`，上下分栏）双向；
   - 内置 `min` / `max` 弹性防越界保护，分割线居中提供 `collapsible` 一键折叠收起触发把手；
   - 标配 `storageKey` 本地存储偏好记忆，用户调整后的分栏比例刷新自动还原。
3. **`AtengFooterBar`（吸底操作栏容器）**：
   - 默认采用 CSS `position: sticky; bottom: 0` 随文档流吸底，支持可选 `position="fixed"` 全局悬浮；
   - 标配 `placeholder: true` 防遮挡占位机制，在文档流末尾自动注入等高透明垫块，杜绝表单末尾被悬浮条遮挡；
   - 规范左侧信息插槽（`#extra`）与右侧操作按钮插槽（`#default`）。
4. **`AtengCard`（结构化面板卡片容器）**：
   - 细化头部规范：标题、副标题、图标、Tooltip 气泡提示与 Extra 操作区；
   - 增强工业级交互：一键平滑折叠（受控 `v-model:collapsed`）、整卡视口全屏最大化（支持 ESC 快捷键退出并销毁全局监听器）、局部 `loading` 遮罩与分割线控制。
5. **`AtengPageSkeleton`（页面骨架屏占位容器）**：
   - 内置 4 大后台模态预设：`table`（搜索表单+表格骨架）、`form`（多列控件骨架）、`detail`（详情键值骨架）、`card`（卡片网格骨架）；
   - 采用插槽包装形态，在 `loading` 切换时通过平滑 Fade Transition 淡入淡出过渡，彻底消除突兀白屏闪变。

### 3. 双模视口滚动治理模型 (Dual-Mode Scroll & Viewport Fill Invariant)

- 当 `fitViewport: true` 时，`AtengPageContainer` 应用标准 Flex 约束（`height: 100%; display: flex; flex-direction: column; overflow: hidden`），页头计算自身高度后保持固定，内容区域 `flex: 1; min-height: 0; overflow: auto`；
- 内部配合 `AtengTable` 或 `AtengSplitLayout` 时，子容器高度继承 `100%`，分页与搜索条保持锁定，彻底根除双滚动条。

### 4. 严苛代码防线与生命周期确定性 (Engineering Robustness)

- **样式隔离与设计令牌**：所有组件根样式统一使用 `.at-` 命名空间，开启 `<style scoped>`，所有尺寸、边框、背景及阴影统一复用 Element Plus 设计令牌（`--el-*` / `--at-*`）；
- **资源清理与零内存泄漏**：`AtengSplitLayout` 的拖拽监听器与 `AtengCard` 的 ESC 全屏监听器，必须在 `mouseup` 或 `onBeforeUnmount` 中 100% 确定性移除，坚决杜绝离线事件挂载与内存泄漏。

### 5. 高阶能力增强与工业级体验深化 (Advanced Capabilities & Resilience Enhancement)

立足于更广泛的企业级中后台复杂场景，确立五大进阶增强标准：

1. **`AtengPageContainer` 弱感应路由推导与吸顶毛玻璃**：
   - 增加 `autoBreadcrumb`，通过实例安全弱探测 `route.matched` 自动提炼有效面包屑，过滤无标题层级，最后一项免跳转；提供 `breadcrumbTitleKey` 与 `breadcrumbResolver` 逃生舱；
   - 增加 `headerBlur` 与滚动动态 `.is-elevated` 渐变投影，实现现代沉浸式页头质感。
2. **`AtengSplitLayout` 指针事件统一与双向收起把手**：
   - 全面升级至现代 W3C 标准 `PointerEvent`，配合 `setPointerCapture` 原生支持鼠标、触控笔与 iPad 触控拖拽，消除越界丢帧；
   - 增加 `collapseTarget: 'first' | 'second' | 'both'` 与 `v-model:secondCollapsed`，支持首栏/次栏双向对折收起，并纳入 `storageKey` 本地记忆。
3. **`AtengFooterBar` 智能容器避让与对齐**：
   - 增加 `autoOffset` 与 `target` 配置，利用 `ResizeObserver` 智能探测父容器或指定容器尺寸；
   - 借助 `requestAnimationFrame` 动态平滑计算 `left` 与 `width`，在系统侧边栏展开/折叠过渡动画期间保持严丝合缝跟手，免除手工硬编码 `leftOffset` 像素。
4. **`AtengCard` 全屏防穿透栈式锁定与 ESC 冲突防护**：
   - 增加 `lockScroll`，进入全屏时为 `document.body` 注入防穿透滚动锁定，通过模块级全局引用计数器保证多组件或弹层嵌套时 100% 确定性安全复原；
   - 优化 ESC 快捷键响应，防止误关上层弹层或内嵌下拉控件。
5. **`AtengPageSkeleton` 仪表盘模态与响应式自适应网格**：
   - 扩充 `'dashboard'` 高频数据看板模态（4 张自适应指标卡 + 左右双图表区块骨架）；
   - 栅格全面引入 `auto-fit` 与 `minmax` 现代流式自适应网格，小屏幕自然换行，杜绝挤压变形。

## 效果与权衡

- **收益**：
  - **极致开发提效**：业务开发者无需再手工手写复杂的 `flex` 视口计算、左树右表拖拽及遮挡占位，模板代码量减少 60% 以上；
  - **界面视觉与交互高度一致**：全系统所有页面的面包屑、页头操作栏、卡片全屏折叠具有统一的交互手感与暗黑模式适配；
  - **保持核心纯净度**：通过不绑定整站 Admin Shell，保持了组件库轻量与极高的通用性。
- **代价**：
  - `AtengSplitLayout` 的拖拽与 `AtengCard` 的全屏涉及对父容器与全局视口的样式与层级影响，在微前端或跨 `iframe` 特殊嵌套容器中可能需要通过特定配置进行微调。

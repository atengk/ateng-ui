# 0028. 纯无状态基础布局套件、细粒度微骨架与容器协同总线架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在 [ADR-0019](./0019-page-scaffold-and-container-architecture.md) 与 [ADR-0023](./0023-general-container-components-expansion-and-viewport-governance-architecture.md) 中，组件库确立了 `AtengPageContainer`、`AtengSplitLayout`、`AtengFooterBar`、`AtengCard`、`AtengPageSkeleton`、`AtengGrid`、`AtengAnchor`、`AtengWatermark` 等页面级通用容器矩阵，彻底治理了双模视口滚动、脱壳全屏与防篡改水印。然而在实际业务深度开发中，骨架/框架/容器组件生态仍存在以下断层与体验痛点：

1. **基础布局骨架缺位与整站母版解耦的矛盾**：
   - ADR-0019 坚决解耦了强绑定 Vue Router 与 Pinia 的全局整站 Admin Shell，但在此之下，业务开发者在搭建局部多栏、经典 Header-Aside-Content 页面框架时，缺乏一套轻量、纯 CSS/Flex 驱动且**零业务/零路由绑定的基础无状态布局组件**，常不得不自行手写脆弱的 Flex 样式；
2. **骨架屏粗粒度与局部刷新断层**：
   - 现存 `AtengPageSkeleton` 仅支持页面级 5 种预设（`table`、`form`、`detail`、`card`、`dashboard`），无法覆盖局部异步刷新（如局部卡片刷新、局部表单提交重载）的需求；
   - 传统动态替换 DOM 的做法会破坏 Vue 虚拟 DOM 树映射并引起明显的排版抖动与跳变（Layout Shift / CLS）；
3. **分栏拖拽手感粗糙与边缘吸附缺失**：
   - `AtengSplitLayout` 拖拽把手在逼近最小阈值时缺乏磁吸附手感，无法在顺手拖到边缘时自动折叠；
   - 缺乏双击把手快速复位以及无障碍（A11y）键盘方向键微调能力；
4. **容器之间各自为战与样板代码残留**：
   - `AtengPageContainer` 与 `AtengFooterBar`、`AtengAnchor` 缺乏上下文通信；开发者在页面中使用吸底栏时需手工指定 target，使用锚点楼层导航时需手工传参 `.at-page-container__content` 局部选择器，违背“零胶水”设计原则；
5. **页头操作按钮过载导致界面排版错位**：
   - 复杂业务页面的页头操作区（`#extra`）常堆叠多个按钮，在小屏幕或视口变窄时极易折行撑爆页头，破坏整体美感。

## 架构决策

基于“**纯无状态语义化布局、双轨零跳变微骨架、物理阻尼边缘磁吸附、响应式容器协同总线、声明式操作流折叠**”原则，确立以下系统级架构决策：

### 1. 纯无状态基础布局套件 (AtengLayout 系列)

- **定位与构件矩阵**：
  提供纯 CSS/Flex 驱动、零业务状态、零路由绑定的基础无状态布局架构套件：
  - `<AtengLayout>`：外层/嵌套弹性容器；
  - `<AtengHeader>`：语义化顶栏容器（默认高度 64px，支持固定/透明/自定义背景）；
  - `<AtengAside>`：语义化侧边栏容器（默认宽度 200px，支持受控折叠 `v-model:collapsed`、折叠宽度 `collapsedWidth`、底部收起触发器与插槽）；
  - `<AtengContent>`：内容主容器（`flex: 1; min-height: 0` 弹性撑满）；
  - `<AtengFooter>`：语义化底栏容器（默认高度 48px）。
- **Aside 自动感知排版机制 (Auto Aside Detection)**：
  - `<AtengLayout>` 运行时自动扫描子节点 VNode 是否包含 `<AtengAside>` 组件；一旦识别包含侧边栏，自动注入 `.has-aside` 类名并切换至 `flex-direction: row` 横向排版；
  - 显式保留 `direction?: 'horizontal' | 'vertical'` 属性作为最高优先级逃生舱。

### 2. 双轨骨架生态与零跳变微骨架指令 (v-skeleton)

- **页面级骨架屏 (AtengPageSkeleton) 精细化参数**：
  - 表格模态（`table`）增加 `columnWidths?: (string | number)[]` 列宽比例自定义、`showPagination?: boolean` 底部假分页模拟、`showHeader?: boolean` 开关；
  - 骨架屏全量预设对齐 ThemePro 的 Pulse Wave 脉冲波纹视觉基准，暗黑模式下无高光刺眼感。
- **局部微骨架指令 (v-skeleton)**：
  - 新增轻量级指令 `v-skeleton="boolean"`，支持配置对象修饰符；
  - **原地 CSS 遮罩与 Zero-CLS 契约**：指令激活时为宿主 DOM 追加 `.at-skeleton-active`，将内部文字与图标透明度降为 0（`opacity: 0`），并在顶层覆盖脉冲渐变微光伪元素（`::after`）；
  - 目标元素 100% 保持原有物理宽高，彻底根除异步数据加载前后的布局跳变（Zero-CLS），且不对 Vue 内部虚拟 DOM 做任何解构破坏。

### 3. 分栏布局物理阻尼磁吸附与无障碍微调 (Snap Points)

- **边缘磁吸附状态机 (snapThreshold)**：
  - 在 `AtengSplitLayout` 中引入 `snapThreshold: number`（默认 30px）；当用户拖拽分栏把手接近最小临界值 `min` 或视口边缘小于该阈值时，自动平滑吸附折叠（`collapsed = true`）；反向拉出阈值时平滑恢复至吸附前宽度；
- **双击复位与微交互**：
  - 允许双击分栏把手快速在“上次记忆宽度”与“最小/折叠状态”之间切换；
- **W3C 无障碍（A11y）键盘微调**：
  - 分割把手具备标准 `role="separator"`、`tabindex="0"` 与 `aria-valuenow` 属性；
  - 聚焦时支持左右/上下方向键以 8px 步长微调，按住 `Shift` 键以 32px 快速步进。

### 4. 响应式容器上下文总线 (Container Context Bus)

- **轻量依赖注入规范 (PAGE_CONTAINER_INJECTION_KEY)**：
  - 父级 `AtengPageContainer` 统一向子孙组件注入响应式上下文对象：
    ```typescript
    export interface AtengPageContainerContext {
      fitViewport: ComputedRef<boolean>;
      contentRef: ShallowRef<HTMLElement | null>;
      registerFooter: (height: number) => () => void;
      getScrollContainer: () => HTMLElement | null;
    }
    ```
- **AtengFooterBar 零配置智能避让**：
  - `AtengPageContainer` 显式提供 `#footer` 具名插槽（位于 Flex 布局最底部，天然不随 content 滚动，性能最高）；
  - 若业务将 `<AtengFooterBar>` 嵌套在默认内容插槽末尾，`AtengFooterBar` 自动注入容器上下文，向父容器注册自身高度，父容器自动为内部滚动区域追加等高 `padding-bottom` 占位垫块，彻底杜绝内容被悬浮栏遮挡；
- **AtengAnchor 零配置自动锚定**：
  - `AtengAnchor` 置于 `AtengPageContainer` 内部时，若未显式指定 `container` 属性，自动通过容器上下文将页面内部局部滚动容器（`contentRef`）解析为监听目标，无需手工书写选择器。

### 5. 页面容器进阶体验提升

- **操作流折叠 (Action Overflow)**：
  - `AtengPageContainer` 新增 `extraActions?: AtengPageActionItem[]` 与 `maxVisibleActions?: number`（默认 3）；
  - 按钮数量超出限制时，自适应将后续操作折叠收敛至 `<el-dropdown>` 下拉菜单中，支持权限码与禁用状态透传；同时保留 `#extra` 自由插槽；
- **快捷安全水印 (watermark)**：
  - `AtengPageContainer` 新增 `watermark?: string | AtengWatermarkProps` 属性，内部自动接入 `AtengWatermark` 防篡改图层，无需外部包裹；
- **无页头沉浸模式 (headerVisible)**：
  - 增加 `headerVisible?: boolean`（默认 true），支持平滑隐藏页头，保留 Flex 撑满与双模滚动能力。

## 效果与权衡

- **收益**：
  - **组件生态正交完整**：既具备无状态的自由组装布局套件（`AtengLayout`），又具备高阶开箱即用的页面容器（`AtengPageContainer`）；
  - **极致平滑的骨架体验**：双轨骨架屏方案彻底杜绝了局部加载时的白屏突变与布局跳变（Zero-CLS）；
  - **零胶水心智负担**：吸底操作栏与楼层锚点放入页面容器即可自动工作，免除选择器与偏移量胶水配置；
  - **交互手感迈向顶配**：磁吸附折叠、双击复位、键盘无障碍微调让分栏布局具备桌面级原生质感。
- **代价**：
  - 容器上下文总线增加了组件间的浅层耦合（通过注入），但遇到非包裹场景均提供了 100% 优雅降级保底；
  - `AtengLayout` 的 Aside 自动感知依赖对插槽 VNode 的轻量遍历，需在插槽动态重绘时保持高效纯函数计算。

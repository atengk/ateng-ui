# GridLayoutVue

面向现代 Web 应用与企业级系统的大屏仪表盘、千人千面工作台与可视化拖拽网格布局基础设施，纯 Vue 3 驱动，基于 GridStack 10.x 纯 TypeScript 微内核封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengGridLayout**:
网格布局顶层统领容器组件，负责挂载 GridStack 引擎、管理网格几何尺寸、调度全局碰撞避让、处理拖拽缩放事件、监听容器尺寸自适应多列断点并维护双向 JSON 布局状态流。
_Avoid_: GridBoard, GridStackWrapper, DashboardLayout, DragLayout, GridLayoutContainer

**AtengGridItem**:
单个网格栅格项容器组件，作为 `<AtengGridLayout />` 的直接子节点，承载独立卡片物料，负责定义自身坐标（x, y）、跨度（w, h）、约束（min/max）、静态锁控与生命周期注册销毁，并向子树提供几何状态与最大化/折叠交互注入。
_Avoid_: GridCard, WidgetWrapper, LayoutBlock, GridCell, DashboardItem

**AtengGridPaletteItem**:
外部物料拖拽图元辅助包装组件，用于从侧边栏物料库或抽屉向 `<AtengGridLayout />` 拖入新卡片，携带预设的宽高跨度与业务自定义载荷。
_Avoid_: ExternalDragItem, StencilItem, PaletteWidget, DragSource

**vGridDragIn**:
外部物料拖拽指令，用于将任意原生 DOM 元素声明为可拖入网格的源物料节点，与 `<AtengGridPaletteItem />` 具备完全等价的底层驱动管道。
_Avoid_: v-drag-widget, v-palette-item, v-external-drag

### Composables & Injections

**useGridLayout**:
无头网格布局状态机 Composable，提供对布局数据流、GridStack 实例句柄、内部更新锁、垂直紧凑重排、自由浮动切换、静态锁定、不可变撤销重做快照栈（Undo/Redo）、单卡片最大化/折叠与序列化存取的全套编程控制。
_Avoid_: useGrid, useDashboardLayout, useGridStack, useLayoutState

**useGridItem**:
网格项内部子级上下文注入 Composable，供插槽内部组件（如 `@atengk/echarts-vue` 图表、`@atengk/code-editor-vue` 编辑器）消费当前栅格项的宽高响应式数据、拖拽中状态、缩放中状态、最大化状态与高度折叠状态。
_Avoid_: useItemContext, useGridItemContext, useWidgetInfo

**GridItemContext**:
`<AtengGridItem />` 向其子树提供的依赖注入契约接口，包含当前项的几何尺寸响应式引用、拖拽/缩放活跃态标记、最大化切换与高度折叠方法广播。
_Avoid_: ItemScope, WidgetContext, CellState

**LayoutHistoryStack**:
基于原生 `structuredClone` 的纯内存不可变快照历史栈，负责管理网格布局的变更记录，提供撤销（Undo）、重做（Redo）及快照上限防爆内存保护。
_Avoid_: UndoManager, LayoutHistory, SnapshotList

### Data Models & Contracts

**GridLayoutItem**:
强类型网格布局项标准化数据实体泛型契约（`GridLayoutItem<T = Record<string, unknown>>`），包含唯一标识 `id`、网格坐标 `x, y`、跨度 `w, h`、极值约束 `minW, minH, maxW, maxH`、锁控标记 `locked, noResize, noMove, static`、自动寻空标记 `autoPosition` 以及业务自定义强类型载荷 `data?: T`。
_Avoid_: GridWidget, LayoutItemData, CellDefinition, DashboardWidgetConfig

**GridResponsiveBreakpoints**:
基于容器宽度（Container Query）的响应式多列断点映射配置规约，用于根据容器自身的 `ResizeObserver` 宽度动态在不同栅格列数（如 12 列、6 列、1 列）与行高之间平滑自适应切换。
_Avoid_: ScreenBreakpoints, ColumnSettings, ResponsiveLayoutConfig

**InternalUpdateLock**:
双向响应式同步原子互斥锁机制，用于在 GridStack 原生 DOM 事件（`dragstop` / `resizestop` / `change`）与 Vue 响应式 `v-model:layout` 之间阻断无限循环更新风暴。
_Avoid_: SyncLock, ChangeGuard, EventMutex

**LayoutSanitizer**:
布局 Schema 导入防越界、重叠自动去重与坐标修复纯函数自愈器，在外部 JSON 装载至网格前自动纠偏越界坐标、兜底极值并为重叠项标记空位寻找，杜绝白屏与计算死锁。
_Avoid_: LayoutValidator, SchemaCleaner, FixLayoutData

### Physics & Visual Styling

**GravityCompacting**:
垂直重力紧凑吸附排版算法（`float: false`），在卡片被移动或删除时自动将下方卡片向上挤压补齐空位，消除视觉悬空留白。
_Avoid_: VerticalCollapse, AutoFloatUp, PackLayout

**FloatLayout**:
自由浮动排版模式（`float: true`），允许卡片放置在网格任意坐标，支持悬空与自由留白，不触发重力向上紧凑。
_Avoid_: FreePlacement, AbsoluteGrid, FreeFloat

**CollisionPush**:
拖拽碰撞避让算法，当移动卡片到已有卡片区域时，被碰撞的卡片自动向下或向旁侧顺延避让。
_Avoid_: ConflictAvoidance, BumpLogic, ItemOverlap

**AutoTidyCompacting**:
一键智能规整与无损压缩算法，在自由浮动模式下或频繁编辑后一键消除所有纵向空洞与无效空隙，保持卡片相对秩序。
_Avoid_: CleanGaps, PackGrid, ShrinkLayout

**GridHelperLines**:
编辑态网格对齐参考辅助线机制，基于纯 CSS 渐变渲染，支持通过 `showGridLines` 属性声明式开启与隐蔽，零额外 DOM 开销。
_Avoid_: BackgroundGrid, GridMesh, AlignmentLines

### Enterprise Governance & Safeguards

**CardMaximize**:
单卡片全屏最大化聚焦机制，将指定卡片临时提升为全网格覆盖视口并自动触发内部图表重新自适应渲染，支持脱壳或网格内全屏，并能无损还原原始几何位置。
_Avoid_: CardFullscreen, WidgetZoom, ExpandCard

**CardCollapse**:
单卡片手风琴式高度折叠机制，临时将卡片高度收缩为 1（仅露出卡片头），释放下方垂直空间供其他卡片上浮吸附，展开时无损恢复原有高度。
_Avoid_: CardMinimize, FoldWidget, ShrinkCard

**EditViewDualMode**:
全局编辑态（Edit Mode）与运行态（View Mode）双模安全锁控机制，运行态默认禁用所有拖拽、缩放、手柄与辅助线，保证零误触报表浏览体验。
_Avoid_: ReadonlyMode, LockMode, DesignViewSwitch

**TouchScrollDefense**:
触控设备页面滚动与卡片拖拽手势防冲突策略，通过轻扫响应页面滚动、长按 150ms 激活手柄拖拽的双重延时护栏消除移动端误挪卡片问题。
_Avoid_: MobileTouchFix, GestureLock, ScrollProtection

**TabWakeupHealing**:
多标签页（Tab）与 KeepAlive 缓存唤醒几何自愈护栏，利用容器 ResizeObserver 监听从 `0x0` 几何恢复的时机，自动触发 GridStack 重算与子图表防抖重绘，根除白屏变形。
_Avoid_: TabResizeFix, KeepAlivePatch, ZeroSizeRecovery

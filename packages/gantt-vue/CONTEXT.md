# GanttVue

面向现代 Web 应用与企业级系统的高性能项目甘特图、资源排程与基线偏差比对扩展基础设施，纯 Vue 3 驱动，基于 VisActor VTable-Gantt 1.26.x Canvas 引擎封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengGantt**:
核心甘特图表现容器组件，底层基于 VisActor VTable-Gantt 引擎封装，提供左侧可编辑多列任务树表（TreeGrid）与右侧多粒度时间轴画布的像素级双向同步滚动、工期拖拽调期、进度拉伸、依赖连线、基线对比与插槽反转定制能力。
_Avoid_: GanttContainer, VisactorGantt, GanttChart, GanttWrapper

**AtengGanttModal**:
轻量级脱壳甘特图模态弹窗组件，纯原生 Vue 3 Teleport 与 `--at-gantt-*` CSS 变量驱动，100% 物理脱耦具体 UI 库，内置真全屏切换、快捷操作栏、保存/取消事件与数据自动回传。
_Avoid_: GanttDialog, ScheduleModal, GanttPopup, TaskDialog

### Composables & State Machines

**useGantt**:
纯无状态甘特图无头状态机 Composable，管理实例生命周期，以非响应式浅引用持有 VTable-Gantt 底层实例，暴露 Facade 门面操作 API（任务读写、时间轴刻度切换、日期定位居中、依赖连线维护、只读模式切换、暗黑主题热跟随、Canvas 高清快照导出及确定性销毁）。
_Avoid_: useGanttChart, useVTableGantt, useSchedule, useTaskTable

**useGanttThemeSync**:
响应式明亮/暗黑主题热跟随 Composable，自动监听 DOM 树暗黑类名并根据 `--at-gantt-*` Design Tokens 动态同步底层 VTable-Gantt 调色板与网格背景，实现零刷新平滑换肤。
_Avoid_: useGanttTheme, useThemeFollower, useChartTheme

### Data Models & Contracts

**GanttTaskRecord**:
企业级任务实体标准化契约，规范任务唯一标识（`id`）、任务名称（`name`）、计划开始与结束日期（`startDate`, `endDate`）、完成进度百分比（`progress`）、父级引用（`parentId`）、前置依赖关系（`dependencies`）、计划基线（`baseline`）、折叠状态（`collapsed`）及自定义扩展字段。
_Avoid_: TaskItem, GanttRow, ScheduleEntity, GanttNode

**GanttColumn**:
左侧任务树表（TreeGrid）列配置契约，包含字段名（`field`）、表头文案（`title`）、列宽（`width`）、最小列宽（`minWidth`）、对齐方式（`align`）、是否可排序（`sortable`）与单元格可编辑类型（`editor`）。
_Avoid_: TableColumn, HeaderOption, TaskListColumn

**GanttTaskDependency**:
任务前后置依赖拓扑契约，定义前置任务标识（`id`）与连线类型（`type`：`'FS'` 完成-开始、`'SS'` 开始-开始、`'FF'` 完成-完成、`'SF'` 开始-完成）。
_Avoid_: TaskLink, GanttRelation, PredecessorConfig, DependencyEdge

**GanttBaseline**:
项目计划基准线契约，包含基准开始日期（`startDate`）与基准结束日期（`endDate`），用于与实际任务工期并行渲染并进行偏差审计与延误预警。
_Avoid_: BaseSchedule, TargetPlan, TargetDate, PlanBaseline

**GanttScale**:
甘特图时间轴刻度粒度联合类型（`'day' | 'week' | 'month' | 'quarter' | 'year'`）。
_Avoid_: TimeScale, TimelineGranularity, ZoomLevel, ScaleUnit

**GanttMode**:
甘特图交互模式联合类型（`'interactive' | 'readonly'`），控制左侧树表内联编辑、右侧画布任务拖拽、进度调整与依赖连线的交互开关。
_Avoid_: ViewMode, EditMode, GanttState

### Engines, Drivers & Safety Guards

**GanttDataMapper**:
业务任务数据集（扁平一维带 `parentId` 数组或深层嵌套 `children` 树）与 VTable-Gantt 内部渲染模型之间的双向数据转换适配引擎，提供双向映射、属性保全、工期自动推断与增量变更回写。
_Avoid_: TaskMapper, GanttTransformer, TreeToFlat

**GanttRollup**:
任务工期与进度自底向上加权汇总算法引擎，自动根据叶子子任务推导父任务的最小开始时间、最大结束时间与基于工期权重的总体完成百分比。
_Avoid_: ParentCalculator, ProgressAggregator, ScheduleRollup

**GanttValidator**:
任务依赖有向无环图（DAG）与拓扑判环校验引擎，在建立依赖连线与加载数据前置执行回路检测，提供回路拦截（`validateDAG`）与快速失败预警。
_Avoid_: DagChecker, CircleDetector, DependencyAuditor

**GanttResizeGuard**:
基于 `ResizeObserver` 的视口几何自愈守卫，初次渲染为 `0x0` 挂起并在所在 Tab、折叠面板或模态弹窗恢复有效尺寸后自动触发 VTable-Gantt 引擎尺寸自愈重绘，防止 Canvas 白屏或模糊变形。
_Avoid_: ResizeWatcher, CanvasGeometryFixer, GanttRefresher

**GanttExporter**:
基于底层 Canvas 渲染管线的高清全景图片导出引擎，支持全量虚拟排程图或当前可视视口按指定 DPI 导出为防虚 PNG/JPEG 图像或二进制 Blob 数据。
_Avoid_: CanvasSnapshot, ImageSaver, GanttDownloader

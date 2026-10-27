# FlowVue Context

面向现代 Web 应用与企业级审批流、状态机的工业级流程设计与流转可视化扩展基础设施。

## Language

### Core Components & Models

**FlowDesigner**:
流程编排设计器容器组件，提供可视化拖拽编排、工具栏、物料面板与属性配置能力。
_Avoid_: FlowEditor, WorkflowBuilder, ProcessCanvas

**FlowViewer**:
运行态只读流程与进度追踪容器组件，提供审批历史轨迹高亮、动效流动与悬停审计卡片能力。
_Avoid_: FlowPreview, FlowTracker, HistoryViewer

**FlowStencil**:
流程图设计器的物料拖拽面板，按事件、任务、网关三段式归类展示预设图元。
_Avoid_: MaterialPanel, NodePalette, DndPanel

**FlowPropertyPanel**:
流程图元素属性配置抽屉面板，提供通用元数据表单与插槽解构回写机制。
_Avoid_: SettingDrawer, ConfigPanel, AttributeForm

**FlowToolbar**:
流程设计器顶部操作控制栏，集成视口控制、撤销重做、校验、排版与数据导入导出。
_Avoid_: ActionHeader, ControlBar, ToolStrip

**FlowGraph**:
流程图完整内存拓扑数据模型，包含节点集合与边集合。
_Avoid_: DiagramData, ProcessSchema, TopologyJson

**FlowNode**:
流程拓扑中的独立活动或事件节点单元，具备唯一标识、坐标几何与业务属性配置。
_Avoid_: Step, Activity, FlowElement, Vertex

**FlowEdge**:
连接两个流程节点的有向转移连线，具备条件表达式、连线标签与流转元数据。
_Avoid_: Line, Transition, Connection, Link

### Execution & Audit State

**ExecutionStatus**:
节点或连线在运行态的审批与执行状态枚举（`completed` | `processing` | `rejected` | `pending` | `terminated`）。
_Avoid_: NodeState, StepStatus, RunState

**AuditRecord**:
节点关联的历史审批或操作审计记录实体，包含操作人、审批结果、时间戳与处理意见。
_Avoid_: ApprovalHistory, ActionLog, FlowComment

**SmartFocus**:
运行态查看器自动平移视口、将流转中或活动节点平滑聚焦至可视区域中心的定位交互。
_Avoid_: AutoCenter, NodeTracking

**WheelZoomGuard**:
运行态查看器防止与外层父页面滚动冲突的滚轮保护机制（需按 Ctrl 激活缩放）。
_Avoid_: ScrollLock, ZoomInterceptor

### Validation & Topology Governance

**FlowValidator**:
流程图拓扑静态校验引擎，校验起止唯一性、连通孤岛、网关分支有效性与闭环死锁。
_Avoid_: SchemaChecker, DiagramValidator, RuleVerifier

**AutoLayoutEngine**:
基于有向无环图（DAG）分层算法的自动整理排版引擎，支持水平（LR）与垂直（TB）流动重构。
_Avoid_: DiagramFormatter, LayoutScheduler

**OrthogonalEdge**:
默认采用的正交平滑折线路由连线，支持四向磁吸锚点与拓扑防呆约束。
_Avoid_: PolylineEdge, StepEdge, ManhattenLine

**Snapline**:
节点拖拽与几何变换时的磁吸对齐辅助参考线系统。
_Avoid_: AlignGuide, MagneticGuide, SmartGuide

**FlowSnapshot**:
流程图高清快照导出工具，计算全图外接边界，支持 2x/3x DPR 防发虚、矢量 SVG 文本与合规安全水印。
_Avoid_: CanvasScreenshot, ImageExporter

### Extension & Tooling

**VueNodeRegistry**:
将标准 Vue 3 SFC 单文件组件桥接注册为 LogicFlow 自定义节点视图的适配系统。
_Avoid_: CustomNodePlugin, VueComponentNode

**BpmnAdapter**:
负责 FlowGraph 数据模型与标准 BPMN 2.0 XML 规范之间双向序列化与反序列化的转译器。
_Avoid_: XmlConverter, BpmnParser

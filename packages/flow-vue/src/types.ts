/**
 * @atengk/flow-vue 核心数据结构与公共类型定义。
 *
 * 依据 ADR-0033 与领域模型，确立 FlowGraph 核心契约与操作接口。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type LogicFlow from '@logicflow/core';
import type { Options } from '@logicflow/core';
import type { Ref, ShallowRef } from 'vue';

/**
 * 文本标签配置。
 */
export interface FlowTextConfig {
  value: string;
  x?: number;
  y?: number;
  editable?: boolean;
  draggable?: boolean;
}

/**
 * 流程拓扑节点几何坐标与业务属性契约。
 */
export interface FlowNode {
  /** 节点唯一主键 ID */
  id: string;
  /** 节点图元类型（如 rect, circle, bpmn:userTask 等） */
  type: string;
  /** 节点水平中心坐标 X */
  x: number;
  /** 节点垂直中心坐标 Y */
  y: number;
  /** 节点显示文本或富文本对象 */
  text?: string | FlowTextConfig;
  /** 节点扩展业务属性集合 */
  properties?: Record<string, unknown>;
  /** 节点宽度（部分几何节点可用） */
  width?: number;
  /** 节点高度（部分几何节点可用） */
  height?: number;
}

/**
 * 流程拓扑有向边（连线）契约。
 */
export interface FlowEdge {
  /** 连线唯一主键 ID */
  id: string;
  /** 连线类型（如 polyline, line, bezier, orthogonal 等） */
  type: string;
  /** 起始源节点 ID */
  sourceNodeId: string;
  /** 目标目的节点 ID */
  targetNodeId: string;
  /** 起始连线锚点绝对坐标 */
  startPoint?: {
    x: number;
    y: number;
  };
  /** 结束连线锚点绝对坐标 */
  endPoint?: {
    x: number;
    y: number;
  };
  /** 连线折点列表（针对折线） */
  pointsList?: Array<{
    x: number;
    y: number;
  }>;
  /** 连线标签文本 */
  text?: string | FlowTextConfig;
  /** 连线扩展业务属性集合（如条件表达式、流转规则） */
  properties?: Record<string, unknown>;
}

/**
 * 流程图内存全景数据模型。
 */
export interface FlowGraph {
  /** 节点集合 */
  nodes: FlowNode[];
  /** 边（连线）集合 */
  edges: FlowEdge[];
}

/**
 * 流程画布初始化配置选项（继承并扩展 LogicFlow Definition）。
 */
export type FlowOptions = Partial<Omit<Options.Definition, 'container'>>;

/**
 * useFlow 无头状态机入参配置。
 */
export interface UseFlowOptions {
  /** 画布底层配置项 */
  options?: FlowOptions;
  /** 初始流程图数据 */
  initialGraph?: FlowGraph;
  /** 是否监听容器尺寸变化并自动防抖自适应（默认 true） */
  autoResize?: boolean;
  /** 尺寸防抖等待毫秒数（默认 100ms） */
  resizeDebounceMs?: number;
}

/**
 * useFlow 无头状态机向外暴露的方法与响应式状态。
 */
export interface UseFlowReturn {
  /** LogicFlow 底层实例浅层响应式引用 */
  lf: ShallowRef<LogicFlow | null>;
  /** 画布 DOM 容器引用 */
  containerRef: Ref<HTMLElement | null>;
  /** 当前是否可撤销 */
  canUndo: Ref<boolean>;
  /** 当前是否可重做 */
  canRedo: Ref<boolean>;
  /** 手动初始化画布 */
  init: (container?: HTMLElement, customOptions?: FlowOptions) => LogicFlow;
  /** 渲染流程图数据 */
  render: (graphData?: FlowGraph) => void;
  /** 获取当前画布全量数据 */
  getGraphData: () => FlowGraph;
  /** 清空画布所有图元 */
  clear: () => void;
  /** 画布放大 */
  zoomIn: () => void;
  /** 画布缩小 */
  zoomOut: () => void;
  /** 还原 1:1 缩放比例 */
  resetZoom: () => void;
  /** 自适应居中视口 */
  fitView: (verticalOffset?: number, horizontalOffset?: number) => void;
  /** 撤销操作 */
  undo: () => void;
  /** 重做操作 */
  redo: () => void;
  /** 手动触发布局尺寸重算 */
  resize: () => void;
  /** 销毁画布与释放资源 */
  destroy: () => void;
}

/**
 * 声明式自定义 Vue 3 SFC 单文件组件节点配置项。
 */
export interface CustomVueNodeConfig {
  /** 自定义图元类型标识 */
  type: string;
  /** Vue 3 SFC 组件定义 */
  component: import('vue').Component;
  /** 节点配置选项 */
  options?: import('./registry').VueNodeOptions;
}

/**
 * AtengFlowCanvas Props 属性契约。
 */
export interface AtengFlowCanvasProps {
  /** 流程图双向绑定数据 */
  modelValue?: FlowGraph;
  /** LogicFlow 原始配置项 */
  options?: FlowOptions;
  /** 容器宽度（默认 '100%'） */
  width?: string | number;
  /** 容器高度（默认 '100%'） */
  height?: string | number;
  /** 是否监听容器尺寸并自动自愈（默认 true） */
  autoResize?: boolean;
  /** 是否处于禁用/只读状态 */
  disabled?: boolean;
  /** 声明式自定义 Vue 3 SFC 单文件组件节点定义列表 */
  customVueNodes?: CustomVueNodeConfig[];
}

/**
 * AtengFlowCanvas Emits 事件契约。
 */
export interface AtengFlowCanvasEmits {
  (e: 'update:modelValue', value: FlowGraph): void;
  (e: 'change', value: FlowGraph): void;
  (e: 'ready', lf: LogicFlow): void;
  (e: 'node:click', node: FlowNode, event: MouseEvent): void;
  (e: 'edge:click', edge: FlowEdge, event: MouseEvent): void;
  (e: 'blank:click', event: MouseEvent): void;
}

/**
 * AtengFlowCanvas Slots 插槽契约。
 */
export interface AtengFlowCanvasSlots {
  default?: (props: {
    lf: LogicFlow | null;
    canUndo: boolean;
    canRedo: boolean;
    getGraphData: () => FlowGraph;
  }) => unknown;
}

/**
 * AtengFlowCanvas 组件对外暴露的实例方法。
 */
export interface AtengFlowCanvasExpose {
  /** 获取 LogicFlow 实例 */
  getLf: () => LogicFlow | null;
  /** 获取画布 DOM 容器 */
  getContainer: () => HTMLElement | null;
  /** 获取全量图数据 */
  getGraphData: () => FlowGraph;
  /** 渲染图数据 */
  render: (graphData?: FlowGraph) => void;
  /** 清空画布 */
  clear: () => void;
  /** 视口放大 */
  zoomIn: () => void;
  /** 视口缩小 */
  zoomOut: () => void;
  /** 视口缩放重置至 1:1 */
  resetZoom: () => void;
  /** 视口居中自适应 */
  fitView: (verticalPadding?: number, horizontalPadding?: number) => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 触发布局尺寸重算 */
  resize: () => void;
  /** 当前是否可撤销 */
  canUndo: () => boolean;
  /** 当前是否可重做 */
  canRedo: () => boolean;
  /** 切换网格显示 */
  toggleGrid: (visible?: boolean) => void;
  /** 切换小地图显示 */
  toggleMiniMap: (visible?: boolean) => void;
  /** 平移视口居中并高亮聚焦指定图元 */
  focusElement: (id: string) => void;
  /** 手动为指定节点与连线添加错误高亮呼吸效果 */
  highlightElements: (nodeIds?: string[], edgeIds?: string[]) => void;
  /** 清除画布中所有图元的错误高亮状态 */
  clearHighlight: () => void;
  /** 将当前画布数据序列化导出为标准 BPMN 2.0 XML 字符串 */
  exportBpmnXml: (options?: import('./bpmn').BpmnExportOptions) => string;
  /** 将标准 BPMN 2.0 XML 字符串反序列化并渲染加载至当前画布 */
  importBpmnXml: (xml: string) => FlowGraph;
  /** 导出全景快照（支持 PNG / JPEG / WEBP / SVG 格式与 DPR 高清倍率） */
  exportSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<string>;
  /** 浏览器触发图片快照或 SVG 下载 */
  downloadSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<void>;
  /** 浏览器触发 BPMN 2.0 XML 文件下载 */
  downloadBpmnXml: (filename?: string, options?: import('./bpmn').BpmnExportOptions) => void;
  /** 向当前画布动态注册自定义 Vue 3 SFC 单文件组件节点 */
  registerVueNode: (
    type: string,
    component: import('vue').Component,
    options?: import('./registry').VueNodeOptions,
  ) => void;
}

/**
 * 物料面板组件 Props。
 */
export interface AtengFlowStencilProps {
  /** 物料分组配置列表 */
  groups?: import('./presets').StencilGroup[];
  /** LogicFlow 画布实例，用于触发 dnd.startDrag */
  lf?: LogicFlow | null;
  /** 面板主标题 */
  title?: string;
}

/**
 * 物料面板组件 Emits。
 */
export interface AtengFlowStencilEmits {
  (e: 'dragstart', item: import('./presets').StencilItem, event: MouseEvent): void;
  (e: 'item:click', item: import('./presets').StencilItem): void;
}

/**
 * 流程图元分类（节点或连线）。
 */
export type FlowElementType = 'node' | 'edge';

/**
 * 流程设计器当前选中图元的聚合数据实体。
 */
export interface FlowElementData {
  /** 图元全局唯一 ID */
  id: string;
  /** 图元分类：'node' 为节点，'edge' 为连线 */
  elementType: FlowElementType;
  /** 图元类型名称（如 start, end, user-task, polyline 等） */
  type: string;
  /** 显示文本或名称 */
  name?: string;
  /** 原始文本标签配置 */
  text?: string | FlowTextConfig;
  /** 图元业务扩展属性字典 */
  properties: Record<string, unknown>;
  /** 原始节点或边数据引用 */
  raw?: FlowNode | FlowEdge;
}

/**
 * 属性配置面板插槽入参契约。
 */
export interface FlowPanelSlotProps {
  /** 当前选中的元素聚合数据 */
  element: FlowElementData;
  /** LogicFlow 画布底层实例 */
  lf: LogicFlow | null;
  /** 安全回写单个属性（自动同步 LogicFlow 模型与历史撤销重做栈） */
  updateProperty: (key: string, value: unknown) => void;
  /** 批量安全回写属性（自动同步 LogicFlow 模型与历史撤销重做栈） */
  updateProperties: (patch: Record<string, unknown>) => void;
  /** 关闭当前抽屉面板 */
  close: () => void;
  /** 获取当前画布全量数据 */
  getGraphData: () => FlowGraph;
}

/**
 * 属性面板组件 Props。
 */
export interface AtengFlowPropertyPanelProps {
  /** 当前选中的图元数据 */
  element: FlowElementData | null;
  /** 是否禁用编辑（只读） */
  disabled?: boolean;
  /** 面板主标题 */
  title?: string;
  /** 面板宽度（默认 '320px'） */
  width?: string | number;
}

/**
 * 属性面板组件 Emits。
 */
export interface AtengFlowPropertyPanelEmits {
  (e: 'update:property', key: string, value: unknown): void;
  (e: 'update:properties', patch: Record<string, unknown>): void;
  (e: 'close'): void;
}

/**
 * 属性面板组件 Slots。
 */
export interface AtengFlowPropertyPanelSlots {
  header?: (props: { element: FlowElementData | null; close: () => void }) => unknown;
  footer?: (props: { element: FlowElementData | null; close: () => void }) => unknown;
  extra?: (props: { element: FlowElementData }) => unknown;
}

/**
 * 属性面板组件 Expose 契约。
 */
export interface AtengFlowPropertyPanelExpose {
  getElement: () => FlowElementData | null;
}

/**
 * 自动排版方向：'LR' 为水平从左到右，'TB' 为垂直从上到下。
 */
export type LayoutDirection = 'LR' | 'TB';

/**
 * AutoLayoutEngine 自动排版配置参数。
 */
export interface AutoLayoutOptions {
  direction?: LayoutDirection;
  nodeSep?: number;
  rankSep?: number;
  startX?: number;
  startY?: number;
}

/**
 * 工具栏操作组件 Props。
 */
export interface AtengFlowToolbarProps {
  /** LogicFlow 画布实例 */
  lf?: LogicFlow | null;
  /** 当前是否可撤销 */
  canUndo?: boolean;
  /** 当前是否可重做 */
  canRedo?: boolean;
  /** 是否处于禁用状态 */
  disabled?: boolean;
  /** 是否展示视口缩放控制区（默认 true） */
  showZoom?: boolean;
  /** 是否展示历史撤销重做控制区（默认 true） */
  showHistory?: boolean;
  /** 是否展示自动排版控制区（默认 true） */
  showLayout?: boolean;
  /** 是否展示网格切换按钮（默认 true） */
  showGridToggle?: boolean;
  /** 是否展示小地图开关（默认 true） */
  showMiniMap?: boolean;
  /** 是否展示清空画布按钮（默认 true） */
  showClear?: boolean;
  /** 是否展示拓扑静态校验按钮（默认 true） */
  showValidate?: boolean;
}

/**
 * 工具栏操作组件 Emits。
 */
export interface AtengFlowToolbarEmits {
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'reset-zoom'): void;
  (e: 'fit-view'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'clear'): void;
  (e: 'layout', direction: LayoutDirection): void;
  (e: 'toggle-grid', visible: boolean): void;
  (e: 'toggle-minimap', visible: boolean): void;
  (e: 'validate'): void;
}

/**
 * 工具栏操作组件 Slots。
 */
export interface AtengFlowToolbarSlots {
  left?: (props: { lf: LogicFlow | null }) => unknown;
  default?: (props: { lf: LogicFlow | null }) => unknown;
  extra?: (props: { lf: LogicFlow | null }) => unknown;
}

/**
 * 工具栏操作组件 Expose 契约。
 */
export interface AtengFlowToolbarExpose {
  getIsGridVisible: () => boolean;
  getIsMiniMapVisible: () => boolean;
}

/**
 * 流程设计器组件 Props。
 */
export interface AtengFlowDesignerProps {
  /** 流程图双向绑定数据 */
  modelValue?: FlowGraph;
  /** LogicFlow 原始配置项 */
  options?: FlowOptions;
  /** 物料分组配置列表 */
  stencilGroups?: import('./presets').StencilGroup[];
  /** 自定义连线前置守卫钩子 */
  beforeConnect?: import('./presets').BeforeConnectHook;
  /** 容器宽度（默认 '100%'） */
  width?: string | number;
  /** 容器高度（默认 '100%'） */
  height?: string | number;
  /** 是否禁用设计编辑（只读） */
  disabled?: boolean;
  /** 声明式自定义 Vue 3 SFC 单文件组件节点定义列表 */
  customVueNodes?: CustomVueNodeConfig[];
  /** 是否启用顶部工具栏（默认 true） */
  showToolbar?: boolean;
  /** 是否启用快捷键体系（默认 true） */
  enableKeyboard?: boolean;
  /** 是否启用右侧属性抽屉面板（默认 true） */
  showPanel?: boolean;
  /** 右侧属性抽屉面板宽度（默认 '320px'） */
  panelWidth?: string | number;
}

/**
 * 流程设计器组件 Emits。
 */
export interface AtengFlowDesignerEmits {
  (e: 'update:modelValue', value: FlowGraph): void;
  (e: 'change', value: FlowGraph): void;
  (e: 'ready', lf: LogicFlow): void;
  (e: 'node:click', node: FlowNode, event: MouseEvent): void;
  (e: 'edge:click', edge: FlowEdge, event: MouseEvent): void;
  (e: 'blank:click', event: MouseEvent): void;
  (e: 'connection:not-allowed', data: unknown): void;
  /** 当前选中的图元（节点或连线）发生变化时派发，取消选择时为 null */
  (e: 'selection:change', element: FlowElementData | null): void;
  /** 图元属性被更新后派发 */
  (e: 'element:update', element: FlowElementData): void;
  /** 自动排版完成后派发 */
  (e: 'layout:complete', data: { direction: LayoutDirection; graph: FlowGraph }): void;
  /** 执行流程拓扑静态校验完成后派发 */
  (e: 'validate', result: import('./validator').FlowValidationResult): void;
}

/**
 * 流程设计器组件 Slots。
 */
export interface AtengFlowDesignerSlots {
  toolbar?: (props: {
    lf: LogicFlow | null;
    canUndo: boolean;
    canRedo: boolean;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    fitView: () => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
    autoLayout: (direction?: LayoutDirection) => void;
    toggleGrid: (visible?: boolean) => void;
    toggleMiniMap: (visible?: boolean) => void;
    toggleMinimap?: (visible?: boolean) => void;
    getGraphData: () => FlowGraph;
    validate: () => import('./validator').FlowValidationResult;
    clearValidationHighlight: () => void;
    focusElement: (id: string) => void;
    exportBpmnXml: (options?: import('./bpmn').BpmnExportOptions) => string;
    importBpmnXml: (xml: string) => FlowGraph;
    exportSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<string>;
    downloadSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<void>;
    downloadBpmnXml: (filename?: string, options?: import('./bpmn').BpmnExportOptions) => void;
  }) => unknown;
  stencil?: (props: {
    lf: LogicFlow | null;
    groups?: import('./presets').StencilGroup[];
    startDrag: (item: import('./presets').StencilItem) => void;
  }) => unknown;
  panel?: (props: FlowPanelSlotProps) => unknown;
}

/**
 * 流程设计器组件对外暴露的实例方法。
 */
export interface AtengFlowDesignerExpose {
  getLf: () => LogicFlow | null;
  getGraphData: () => FlowGraph;
  render: (graph?: FlowGraph) => void;
  clear: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitView: () => void;
  undo: () => void;
  redo: () => void;
  startDrag: (item: import('./presets').StencilItem) => void;
  /** 获取当前选中的图元数据 */
  getSelectedElement: () => FlowElementData | null;
  /** 关闭右侧属性抽屉 */
  closePanel: () => void;
  /** 安全回写当前选中图元的单个属性 */
  updateProperty: (key: string, value: unknown) => void;
  /** 批量安全回写当前选中图元的属性集合 */
  updateProperties: (patch: Record<string, unknown>) => void;
  /** 执行 DAG 分层自动规整排版 */
  autoLayout: (direction?: LayoutDirection) => void;
  /** 切换背景网格显示状态 */
  toggleGrid: (visible?: boolean) => void;
  /** 切换鹰眼小地图显示状态 */
  toggleMiniMap: (visible?: boolean) => void;
  /** 执行全图静态拓扑校验，并自动高亮违规图元 */
  validate: () => import('./validator').FlowValidationResult;
  /** 清除画布中所有图元的校验错误高亮状态 */
  clearValidationHighlight: () => void;
  /** 手动为指定的校验错误集合高亮图元 */
  highlightErrors: (errors: import('./validator').FlowValidationError[]) => void;
  /** 平移视口居中并高亮聚焦选中指定图元 */
  focusElement: (id: string) => void;
  /** 将当前画布数据序列化导出为标准 BPMN 2.0 XML 字符串 */
  exportBpmnXml: (options?: import('./bpmn').BpmnExportOptions) => string;
  /** 将标准 BPMN 2.0 XML 字符串反序列化并渲染加载至当前画布 */
  importBpmnXml: (xml: string) => FlowGraph;
  /** 导出全景快照（支持 PNG / JPEG / WEBP / SVG 格式与 DPR 高清倍率） */
  exportSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<string>;
  /** 浏览器触发图片快照或 SVG 下载 */
  downloadSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<void>;
  /** 浏览器触发 BPMN 2.0 XML 文件下载 */
  downloadBpmnXml: (filename?: string, options?: import('./bpmn').BpmnExportOptions) => void;
  /** 向当前画布动态注册自定义 Vue 3 SFC 单文件组件节点 */
  registerVueNode: (
    type: string,
    component: import('vue').Component,
    options?: import('./registry').VueNodeOptions,
  ) => void;
}

export type {
  FlowValidationError,
  FlowValidationResult,
  FlowValidationRuleCodeValue,
} from './validator';
export { FlowValidationRuleCode } from './validator';

export type { BpmnExportOptions } from './bpmn';
export type { FlowWatermarkOptions, FlowSnapshotOptions, FlowBoundingBox } from './snapshot';

export type { FlowVueNodeProps, VueNodeOptions, FlowAnchorConfig } from './registry';
export { VueNodeRegistry, registerVueNode } from './registry';

/**
 * 预设审批卡片节点组件 Props 接口契约。
 */
export interface ApprovalCardNodeProps {
  /** 节点元数据 */
  node: FlowNode;
  /** LogicFlow 画布实例 */
  lf?: LogicFlow;
  /** 底层数据模型 */
  model?: unknown;
  /** 全量图数据 */
  graph?: FlowGraph;
  /** 安全回写单个属性 */
  updateProperty?: (key: string, value: unknown) => void;
  /** 批量安全回写属性 */
  updateProperties?: (patch: Record<string, unknown>) => void;
  /** 是否处于禁用/只读状态 */
  disabled?: boolean;
}

/**
 * 运行态审批流转与执行状态枚举。
 */
export const FlowExecutionStatus = {
  /** 已完成/已审批通过 */
  COMPLETED: 'completed',
  /** 流转中/审批中/进行中 */
  PROCESSING: 'processing',
  /** 已驳回/审核不通过 */
  REJECTED: 'rejected',
  /** 待处理/未流转到 */
  PENDING: 'pending',
  /** 已终止/已取消/异常中断 */
  TERMINATED: 'terminated',
} as const;

export type ExecutionStatus = (typeof FlowExecutionStatus)[keyof typeof FlowExecutionStatus];

/**
 * 节点关联的历史审批或操作审计记录实体契约。
 */
export interface AuditRecord {
  /** 审计记录唯一 ID */
  id?: string;
  /** 审批人或操作人姓名 */
  operator: string;
  /** 操作人头像或缩写 */
  avatar?: string;
  /** 执行审批状态 */
  status: ExecutionStatus;
  /** 状态文案描述（如 "审核通过"、"审批中"、"驳回修改"） */
  statusText?: string;
  /** 操作发生时间戳或格式化字符串（如 "2026-10-27 15:30:00"） */
  time?: string;
  /** 停留耗时（如 "15分钟"、"2天"） */
  duration?: string;
  /** 审批处理意见或附言 */
  comment?: string;
  /** 扩展业务元数据 */
  extra?: Record<string, unknown>;
}

/**
 * 单个节点或连线的运行态流转条目。
 */
export interface FlowExecutionItem {
  /** 执行状态 */
  status: ExecutionStatus;
  /** 关联的历史审批或操作审计记录列表 */
  audit?: AuditRecord[];
  /** 扩展属性 */
  extra?: Record<string, unknown>;
}

/**
 * 全图元素（节点/连线）的五态流转映射表。
 * 支持传入纯状态字符串或包含审计记录的完整对象。
 */
export type FlowStatusMap = Record<string, ExecutionStatus | FlowExecutionItem>;

/**
 * 执行状态展示文案字典。
 */
export const STATUS_TEXT_MAP: Record<ExecutionStatus, string> = {
  completed: '已办结',
  processing: '流转中',
  rejected: '已驳回',
  terminated: '已终止',
  pending: '待处理',
};

/**
 * 执行状态对应样式徽标类名字典。
 */
export const STATUS_BADGE_CLASS_MAP: Record<ExecutionStatus, string> = {
  completed: 'at-flow-audit-badge--success',
  processing: 'at-flow-audit-badge--primary',
  rejected: 'at-flow-audit-badge--danger',
  terminated: 'at-flow-audit-badge--muted',
  pending: 'at-flow-audit-badge--warning',
};

/**
 * AtengFlowViewer 运行态流转追踪器组件 Props。
 */
export interface AtengFlowViewerProps {
  /** 流程图数据模型 */
  modelValue?: FlowGraph;
  /** 五态执行状态字典 (节点 ID 或 边 ID 对应状态/审计) */
  statusMap?: FlowStatusMap;
  /** 是否在初始化/加载完成后自动将首个流转中 (processing) 节点居中聚焦 (SmartFocus) */
  focusActiveNode?: boolean;
  /** 显式指定的聚焦节点 ID（优先级高于 focusActiveNode） */
  focusNodeId?: string;
  /** 是否启用滚轮防冲突守卫 (WheelZoomGuard)，直接滚动穿透页面，需按 Ctrl 缩放画布 */
  wheelZoomGuard?: boolean;
  /** 是否显示微型视口控制浮动工具条（放大/缩小/自适应/还原） */
  showMiniToolbar?: boolean;
  /** 容器宽度（默认 '100%'） */
  width?: string | number;
  /** 容器高度（默认 '100%'） */
  height?: string | number;
  /** 声明式自定义 Vue 3 SFC 节点配置 */
  customVueNodes?: CustomVueNodeConfig[];
  /** 底层 LogicFlow 原始配置项 */
  options?: FlowOptions;
}

/**
 * AtengFlowViewer Emits 事件定义。
 */
export interface AtengFlowViewerEmits {
  /** LogicFlow 实例初始化完成事件 */
  (e: 'ready', lf: LogicFlow): void;
  /** 节点点击事件 */
  (e: 'node:click', node: FlowNode, event: MouseEvent): void;
  /** 连线点击事件 */
  (e: 'edge:click', edge: FlowEdge, event: MouseEvent): void;
  /** 画布空白区域点击事件 */
  (e: 'blank:click', event: MouseEvent): void;
  /** 节点鼠标悬停或离开事件 */
  (e: 'node:hover', node: FlowNode | null, audit?: AuditRecord[], event?: MouseEvent): void;
  /** 状态字典更新变更事件 */
  (e: 'status:change', statusMap: FlowStatusMap): void;
}

/**
 * AtengFlowViewer Slots 插槽定义。
 */
export interface AtengFlowViewerSlots {
  /** 自定义悬停审计卡片浮层插槽 */
  'audit-popover'?: (props: {
    node: FlowNode;
    status?: ExecutionStatus;
    auditList: AuditRecord[];
    close: () => void;
  }) => unknown;
  /** 自定义微型控制条插槽 */
  'mini-toolbar'?: (props: {
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
    resetZoom: () => void;
    focusActive: () => void;
  }) => unknown;
}

/**
 * AtengFlowViewer Expose 对外暴露实例门面接口。
 */
export interface AtengFlowViewerExpose {
  /** 获取底层 LogicFlow 画布实例 */
  getLf: () => LogicFlow | null;
  /** 获取外层 DOM 容器 */
  getContainer: () => HTMLDivElement | null;
  /** 视口缩放适配并居中 */
  fitView: (verticalPadding?: number, horizontalPadding?: number) => void;
  /** 平滑聚焦指定节点并居中 */
  focusNode: (nodeId: string) => void;
  /** 智能聚焦首个流转中 (processing) 节点并居中 */
  focusActiveNode: () => void;
  /** 放大画布 */
  zoomIn: () => void;
  /** 缩小画布 */
  zoomOut: () => void;
  /** 重置视口缩放为 1:1 */
  resetZoom: () => void;
  /** 动态更新五态执行状态映射 */
  setStatusMap: (statusMap: FlowStatusMap) => void;
  /** 导出全景高清快照 Data URL */
  exportSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<string>;
  /** 浏览器触发快照下载 */
  downloadSnapshot: (options?: import('./snapshot').FlowSnapshotOptions) => Promise<void>;
}

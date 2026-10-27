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
  /** 视口居中 */
  fitView: () => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 触发布局尺寸重算 */
  resize: () => void;
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
}

/**
 * 流程设计器组件 Slots。
 */
export interface AtengFlowDesignerSlots {
  toolbar?: (props: {
    lf: LogicFlow | null;
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
    getGraphData: () => FlowGraph;
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
}

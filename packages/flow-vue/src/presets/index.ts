/**
 * 预设图元、默认物料分组与拓扑防呆连线规则体系。
 *
 * 依据 ADR-0033，定义企业审批流核心图元、四向磁吸与连线防呆校验。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import {
  type LogicFlow,
  CircleNode,
  CircleNodeModel,
  RectNode,
  RectNodeModel,
  DiamondNode,
  DiamondNodeModel,
  PolylineEdge,
  PolylineEdgeModel,
  type Model,
} from '@logicflow/core';
import type { FlowNode, FlowEdge, ExecutionStatus } from '../types';

/**
 * 核心预设图元类型常量枚举。
 */
export const FlowNodeType = {
  /** 开始事件节点 */
  START: 'flow:start',
  /** 结束事件节点 */
  END: 'flow:end',
  /** 人工审批任务节点 */
  USER_TASK: 'flow:user-task',
  /** 系统自动化服务任务节点 */
  SERVICE_TASK: 'flow:service-task',
  /** 抄送通知任务节点 */
  CC_TASK: 'flow:cc-task',
  /** 排他条件网关 */
  EXCLUSIVE_GATEWAY: 'flow:exclusive-gateway',
  /** 并行分支/汇聚网关 */
  PARALLEL_GATEWAY: 'flow:parallel-gateway',
} as const;

export type FlowNodeTypeValue = (typeof FlowNodeType)[keyof typeof FlowNodeType];

/**
 * 自定义连线前置守卫钩子类型。
 * 若返回 false 或错误说明字符串，将直接阻断连线。
 */
export type BeforeConnectHook = (sourceNode: FlowNode, targetNode: FlowNode) => boolean | string;

/**
 * 物料面板图元条目契约。
 */
export interface StencilItem {
  /** 图元类型 */
  type: string;
  /** 显示标题 */
  label: string;
  /** 图元描述说明 */
  description?: string;
  /** 图标 SVG 或标识符 */
  icon?: string;
  /** 拖拽至画布时初始化的节点配置 */
  nodeConfig?: Partial<FlowNode>;
}

/**
 * 物料分类分组契约。
 */
export interface StencilGroup {
  /** 分组唯一标识 */
  id: string;
  /** 分组标题 */
  title: string;
  /** 组内图元清单 */
  items: StencilItem[];
}

/**
 * 默认三段式企业级物料分组清单。
 */
export const DEFAULT_STENCIL_GROUPS: StencilGroup[] = [
  {
    id: 'events',
    title: '事件图元 (Events)',
    items: [
      {
        type: FlowNodeType.START,
        label: '开始节点',
        description: '流程发起起始事件',
        nodeConfig: {
          text: '开始',
        },
      },
      {
        type: FlowNodeType.END,
        label: '结束节点',
        description: '流程终止结束事件',
        nodeConfig: {
          text: '结束',
        },
      },
    ],
  },
  {
    id: 'tasks',
    title: '任务图元 (Tasks)',
    items: [
      {
        type: FlowNodeType.USER_TASK,
        label: '人工审批',
        description: '需人工审核的审批任务',
        nodeConfig: {
          text: '人工审批',
        },
      },
      {
        type: FlowNodeType.SERVICE_TASK,
        label: '系统任务',
        description: '由系统自动调用的任务',
        nodeConfig: {
          text: '系统任务',
        },
      },
      {
        type: FlowNodeType.CC_TASK,
        label: '抄送节点',
        description: '流程信息抄送知会',
        nodeConfig: {
          text: '抄送节点',
        },
      },
    ],
  },
  {
    id: 'gateways',
    title: '网关控制 (Gateways)',
    items: [
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        label: '排他网关',
        description: '条件排他分支路由',
        nodeConfig: {
          text: '×',
        },
      },
      {
        type: FlowNodeType.PARALLEL_GATEWAY,
        label: '并行网关',
        description: '多路并行并发与汇聚',
        nodeConfig: {
          text: '+',
        },
      },
    ],
  },
];

/**
 * 创建通用拓扑防呆规则。
 */
function createCommonTargetRules(beforeConnect?: BeforeConnectHook): Model.ConnectRule[] {
  const rules: Model.ConnectRule[] = [
    {
      message: '禁止节点自环连线',
      validate: (source, target) => {
        return source?.id !== target?.id;
      },
    },
    {
      message: '两节点间已存在连线，禁止重复连线',
      validate: (source, target) => {
        if (!source || !target) {
          return true;
        }
        const graphModel = (target as unknown as { graphModel?: { edges?: FlowEdge[] } })
          .graphModel;
        const edges = graphModel?.edges ?? [];
        const exists = edges.some(
          e => e.sourceNodeId === source.id && e.targetNodeId === target.id,
        );
        return !exists;
      },
    },
  ];

  if (beforeConnect) {
    rules.push({
      message: '业务连线规则校验未通过',
      validate: (source, target) => {
        if (!source || !target) {
          return true;
        }
        const sData =
          (source as unknown as { getData?: () => FlowNode }).getData?.() ??
          (source as unknown as FlowNode);
        const tData =
          (target as unknown as { getData?: () => FlowNode }).getData?.() ??
          (target as unknown as FlowNode);
        const result = beforeConnect(sData, tData);
        if (typeof result === 'string') {
          // 动态携带具体错误消息
          rules[rules.length - 1]!.message = result;
          return false;
        }
        return Boolean(result);
      },
    });
  }

  return rules;
}

/**
 * 五态执行状态主题配置字典。
 */
const STATUS_THEME_MAP: Record<
  ExecutionStatus,
  { fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string }
> = {
  completed: { fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 2 },
  processing: { fill: '#eff6ff', stroke: '#3b82f6', strokeWidth: 2.5 },
  rejected: { fill: '#fef2f2', stroke: '#ef4444', strokeWidth: 2 },
  pending: { fill: '#f8fafc', stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' },
  terminated: { fill: '#f1f5f9', stroke: '#64748b', strokeWidth: 1.5 },
};

/**
 * 应用五态执行状态主题与校验错误样式。
 */
function applyEnhancedNodeStyle(
  properties: Record<string, unknown> | undefined,
  style: LogicFlow.CommonTheme,
): LogicFlow.CommonTheme {
  const status = (properties?.status || properties?.executionStatus) as ExecutionStatus | undefined;
  const config = status ? STATUS_THEME_MAP[status] : undefined;
  if (config) {
    style.fill = config.fill;
    style.stroke = config.stroke;
    style.strokeWidth = config.strokeWidth;
    if (config.strokeDasharray) {
      style.strokeDasharray = config.strokeDasharray;
    }
  }

  if (properties?.__hasError) {
    style.stroke = '#ef4444';
    style.strokeWidth = Math.max((style.strokeWidth as number) || 2, 3);
  }
  return style;
}

/**
 * 组装包含五态状态类名与错误高亮样式的外部 SVG 容器属性。
 */
function getEnhancedOuterGAttrs(
  properties: Record<string, unknown> | undefined,
  baseAttrs?: LogicFlow.DomAttributes,
): LogicFlow.DomAttributes {
  const attrs: LogicFlow.DomAttributes = baseAttrs ? { ...baseAttrs } : {};
  const classNames: string[] = [];
  if (attrs.className) {
    classNames.push(attrs.className);
  }
  const status = (properties?.status || properties?.executionStatus) as ExecutionStatus | undefined;
  if (status) {
    classNames.push(`at-flow-status--${status}`);
  }
  if (properties?.__hasError) {
    classNames.push('at-flow-node--error');
  }
  if (classNames.length > 0) {
    attrs.className = classNames.join(' ');
  }
  return attrs;
}

/**
 * 向 LogicFlow 实例注册所有开箱即用的预设图元与防呆规则。
 */
export function registerPresetNodes(lf: LogicFlow, beforeConnect?: BeforeConnectHook): void {
  // 1. 开始节点：圆环，绿色主题，禁止作为 target
  class StartNodeModel extends CircleNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.r = 24;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#ecfdf5';
      style.stroke = '#10b981';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      rules.push({
        message: '开始节点不能作为连线终点',
        validate: () => false,
      });
      return rules;
    }
  }

  // 2. 结束节点：圆环，红色主题，厚边框，禁止作为 source
  class EndNodeModel extends CircleNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.r = 24;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#fef2f2';
      style.stroke = '#ef4444';
      style.strokeWidth = 3;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedSourceRules(): Model.ConnectRule[] {
      const rules = super.getConnectedSourceRules();
      rules.push({
        message: '结束节点不能作为连线起点',
        validate: () => false,
      });
      return rules;
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 3. 人工审批节点：圆角矩形，蓝色主题
  class UserTaskNodeModel extends RectNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.width = 120;
      this.height = 60;
      this.radius = 6;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#eff6ff';
      style.stroke = '#3b82f6';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 4. 系统任务节点：圆角矩形，紫色主题
  class ServiceTaskNodeModel extends RectNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.width = 120;
      this.height = 60;
      this.radius = 6;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#f5f3ff';
      style.stroke = '#8b5cf6';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 5. 抄送节点：圆角矩形，琥珀黄主题
  class CcTaskNodeModel extends RectNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.width = 120;
      this.height = 60;
      this.radius = 6;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#fffbeb';
      style.stroke = '#f59e0b';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 6. 排他网关：菱形，琥珀黄边框
  class ExclusiveGatewayModel extends DiamondNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.rx = 25;
      this.ry = 25;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#fffbeb';
      style.stroke = '#f59e0b';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 7. 并行网关：菱形，青蓝边框
  class ParallelGatewayModel extends DiamondNodeModel {
    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.rx = 25;
      this.ry = 25;
    }
    override getOuterGAttributes(): LogicFlow.DomAttributes {
      return getEnhancedOuterGAttrs(this.properties, super.getOuterGAttributes());
    }
    override getNodeStyle(): LogicFlow.CommonTheme {
      const style = super.getNodeStyle();
      style.fill = '#ecfeff';
      style.stroke = '#06b6d4';
      style.strokeWidth = 2;
      return applyEnhancedNodeStyle(this.properties, style);
    }
    override getConnectedTargetRules(): Model.ConnectRule[] {
      const rules = super.getConnectedTargetRules();
      return [...rules, ...createCommonTargetRules(beforeConnect)];
    }
  }

  // 8. 默认折线连线模型：支持状态样式、呼吸流动与错误高亮样式
  class FlowPolylineEdgeModel extends PolylineEdgeModel {
    override setAttributes(): void {
      super.setAttributes();
      const propsObj = this.properties as Record<string, unknown> | undefined;
      const status = (propsObj?.status || propsObj?.executionStatus) as ExecutionStatus | undefined;
      if (status === 'processing') {
        this.isAnimation = true;
      }
    }

    override getEdgeStyle(): LogicFlow.CommonTheme {
      const style = super.getEdgeStyle();
      const propsObj = this.properties as Record<string, unknown> | undefined;
      const status = (propsObj?.status || propsObj?.executionStatus) as ExecutionStatus | undefined;
      const config = status ? STATUS_THEME_MAP[status] : undefined;
      if (config) {
        style.stroke = config.stroke;
        style.strokeWidth = config.strokeWidth;
        if (config.strokeDasharray) {
          style.strokeDasharray = config.strokeDasharray;
        } else if (status === 'processing') {
          style.strokeDasharray = '6 4';
        }
      }
      if (propsObj?.__hasError) {
        style.stroke = '#ef4444';
        style.strokeWidth = 2.5;
      }
      return style;
    }

    override getEdgeAnimationStyle(): LogicFlow.EdgeAnimation {
      const style = super.getEdgeAnimationStyle();
      const propsObj = this.properties as Record<string, unknown> | undefined;
      const status = (propsObj?.status || propsObj?.executionStatus) as ExecutionStatus | undefined;
      if (status === 'processing') {
        style.stroke = '#3b82f6';
        style.strokeDasharray = '6 4';
      }
      return style;
    }
  }

  // 执行核心预设图元注册（同时支持 flow: 命名空间与短名别名）
  const presetRegistrations = [
    { type: FlowNodeType.START, view: CircleNode, model: StartNodeModel, alias: 'start' },
    { type: FlowNodeType.END, view: CircleNode, model: EndNodeModel, alias: 'end' },
    { type: FlowNodeType.USER_TASK, view: RectNode, model: UserTaskNodeModel, alias: 'user-task' },
    {
      type: FlowNodeType.SERVICE_TASK,
      view: RectNode,
      model: ServiceTaskNodeModel,
      alias: 'service-task',
    },
    { type: FlowNodeType.CC_TASK, view: RectNode, model: CcTaskNodeModel, alias: 'cc-task' },
    {
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      view: DiamondNode,
      model: ExclusiveGatewayModel,
      alias: 'exclusive-gateway',
    },
    {
      type: FlowNodeType.PARALLEL_GATEWAY,
      view: DiamondNode,
      model: ParallelGatewayModel,
      alias: 'parallel-gateway',
    },
  ];

  for (const reg of presetRegistrations) {
    lf.register({
      type: reg.type,
      view: reg.view,
      model: reg.model,
    });
    if (reg.alias) {
      lf.register({
        type: reg.alias,
        view: reg.view,
        model: reg.model,
      });
    }
  }

  // 注册连线增强模型
  lf.register({
    type: 'polyline',
    view: PolylineEdge,
    model: FlowPolylineEdgeModel,
  });
}

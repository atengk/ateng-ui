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
  BezierEdge,
  type Model,
} from '@logicflow/core';
import type { ExecutionStatus } from '../types';
import {
  type BeforeConnectHook,
  STATUS_THEME_MAP,
  FlowPolylineEdgeModel,
  FlowBezierEdgeModel,
  createCommonTargetRules,
} from './edges';

export type { BeforeConnectHook };
export { STATUS_THEME_MAP, FlowPolylineEdgeModel, FlowBezierEdgeModel, createCommonTargetRules };
import {
  FlowNodeType,
  type FlowNodeTypeValue,
  NODE_TYPE_LABEL_MAP,
  NODE_TYPE_ICON_MAP,
  getNodeBadgeIcon,
  type StencilItem,
  type StencilGroup,
  DEFAULT_STENCIL_GROUPS,
} from './constants';

export {
  FlowNodeType,
  type FlowNodeTypeValue,
  NODE_TYPE_LABEL_MAP,
  NODE_TYPE_ICON_MAP,
  getNodeBadgeIcon,
  type StencilItem,
  type StencilGroup,
  DEFAULT_STENCIL_GROUPS,
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
 * 针对紧凑图元（圆环、菱形）执行智能文本排版位置计算。
 *
 * 核心设计契约：
 * - 当文本长度 <= 2（如“开始”、“结束”、“+”、“×”）时，文字保持在图元正中央；
 * - 当文本长度 > 2（如“Kafka 行为流”、“白名单过滤”）时，文字自动下沉至图元底部正下方，彻底避免穿透图元边缘。
 *
 * @param model 当前图元模型对象
 * @param baseY 图元基础中心 Y 坐标
 * @param offsetY 长文本下沉时的 Y 轴垂直偏移量
 */
function applySmartNodeText(
  model: { y: number; text?: LogicFlow.TextConfig },
  baseY: number,
  offsetY: number,
): void {
  if (model.text) {
    const rawText = model.text.value ?? '';
    const isLong = rawText.trim().length > 2;
    model.text.y = isLong ? baseY + offsetY : baseY;
  }
}

/**
 * 向 LogicFlow 实例注册所有开箱即用的预设图元与防呆规则。
 */
export function registerPresetNodes(lf: LogicFlow, beforeConnect?: BeforeConnectHook): void {
  // 1. 开始节点：圆环，绿色主题，禁止作为 target
  class StartNodeModel extends CircleNodeModel {
    private get textOffsetY(): number {
      return 38;
    }

    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.r = 24;
      applySmartNodeText(this, data.y, this.textOffsetY);
    }

    override updateText(val: string): void {
      super.updateText(val);
      applySmartNodeText(this, this.y, this.textOffsetY);
    }

    override getTextStyle(): LogicFlow.TextTheme {
      const style = super.getTextStyle();
      const val = this.text?.value || '';
      if (val.trim().length > 2) {
        style.color = '#334155';
        style.fontSize = 12;
      } else {
        style.color = '#065f46';
        style.fontSize = 12;
        style.fontWeight = 'bold';
      }
      return style;
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
    private get textOffsetY(): number {
      return 38;
    }

    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.r = 24;
      applySmartNodeText(this, data.y, this.textOffsetY);
    }

    override updateText(val: string): void {
      super.updateText(val);
      applySmartNodeText(this, this.y, this.textOffsetY);
    }

    override getTextStyle(): LogicFlow.TextTheme {
      const style = super.getTextStyle();
      const val = this.text?.value || '';
      if (val.trim().length > 2) {
        style.color = '#334155';
        style.fontSize = 12;
      } else {
        style.color = '#991b1b';
        style.fontSize = 12;
        style.fontWeight = 'bold';
      }
      return style;
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
    private get textOffsetY(): number {
      return 39;
    }

    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.rx = 25;
      this.ry = 25;
      applySmartNodeText(this, data.y, this.textOffsetY);
    }

    override updateText(val: string): void {
      super.updateText(val);
      applySmartNodeText(this, this.y, this.textOffsetY);
    }

    override getTextStyle(): LogicFlow.TextTheme {
      const style = super.getTextStyle();
      const val = this.text?.value || '';
      if (val.trim().length > 2) {
        style.color = '#334155';
        style.fontSize = 12;
      } else {
        style.color = '#b45309';
        style.fontSize = 16;
        style.fontWeight = 'bold';
      }
      return style;
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
    private get textOffsetY(): number {
      return 39;
    }

    override initNodeData(data: LogicFlow.NodeConfig): void {
      super.initNodeData(data);
      this.rx = 25;
      this.ry = 25;
      applySmartNodeText(this, data.y, this.textOffsetY);
    }

    override updateText(val: string): void {
      super.updateText(val);
      applySmartNodeText(this, this.y, this.textOffsetY);
    }

    override getTextStyle(): LogicFlow.TextTheme {
      const style = super.getTextStyle();
      const val = this.text?.value || '';
      if (val.trim().length > 2) {
        style.color = '#334155';
        style.fontSize = 12;
      } else {
        style.color = '#0e7490';
        style.fontSize = 16;
        style.fontWeight = 'bold';
      }
      return style;
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

  // 注册折线与贝塞尔曲线连线增强模型
  lf.register({
    type: 'polyline',
    view: PolylineEdge,
    model: FlowPolylineEdgeModel,
  });
  lf.register({
    type: 'bezier',
    view: BezierEdge,
    model: FlowBezierEdgeModel,
  });
}

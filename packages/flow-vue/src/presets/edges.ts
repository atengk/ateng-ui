/**
 * 连线模型增强、五态执行样式与拓扑防呆规则模块。
 *
 * 依据 ADR-0033，封装折线与贝塞尔曲线的五态高亮、流动虚线动画与通用防呆校验规则。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { type LogicFlow, PolylineEdgeModel, BezierEdgeModel, type Model } from '@logicflow/core';
import type { FlowNode, FlowEdge, ExecutionStatus } from '../types';

/**
 * 自定义连线前置守卫钩子类型。
 * 若返回 false 或错误说明字符串，将直接阻断连线。
 */
export type BeforeConnectHook = (sourceNode: FlowNode, targetNode: FlowNode) => boolean | string;

/**
 * 五态执行状态主题配置字典。
 */
export const STATUS_THEME_MAP: Record<
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
 * 应用五态执行状态主题与校验错误样式至连线模型。
 *
 * @param properties 连线绑定的业务属性
 * @param baseStyle 基础连线样式
 * @returns 强化后的连线样式
 */
export function applyEnhancedEdgeStyle(
  properties: Record<string, unknown> | undefined,
  baseStyle: LogicFlow.CommonTheme,
): LogicFlow.CommonTheme {
  const style = { ...baseStyle };
  const status = (properties?.status || properties?.executionStatus) as ExecutionStatus | undefined;
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
  if (properties?.__hasError) {
    style.stroke = '#ef4444';
    style.strokeWidth = 2.5;
  }
  return style;
}

/**
 * 获取连线动画样式。
 *
 * @param properties 连线绑定的业务属性
 * @param baseStyle 基础动画样式
 * @returns 强化后的连线动画样式
 */
export function getEnhancedEdgeAnimationStyle(
  properties: Record<string, unknown> | undefined,
  baseStyle: LogicFlow.EdgeAnimation,
): LogicFlow.EdgeAnimation {
  const style = { ...baseStyle };
  const status = (properties?.status || properties?.executionStatus) as ExecutionStatus | undefined;
  if (status === 'processing') {
    style.stroke = '#3b82f6';
    style.strokeDasharray = '6 4';
  }
  return style;
}

/**
 * 统一设置连线模型的属性与动画状态。
 *
 * @param model 连线模型实例
 */
export function setupEdgeStatusAttributes(model: PolylineEdgeModel | BezierEdgeModel): void {
  const propsObj = model.properties as Record<string, unknown> | undefined;
  const status = (propsObj?.status || propsObj?.executionStatus) as ExecutionStatus | undefined;
  if (status === 'processing') {
    model.isAnimation = true;
  }
}

/**
 * 默认折线连线模型：支持五态样式、呼吸流动与错误高亮样式。
 */
export class FlowPolylineEdgeModel extends PolylineEdgeModel {
  override setAttributes(): void {
    super.setAttributes();
    setupEdgeStatusAttributes(this);
  }

  override getEdgeStyle(): LogicFlow.CommonTheme {
    return applyEnhancedEdgeStyle(
      this.properties as Record<string, unknown> | undefined,
      super.getEdgeStyle(),
    );
  }

  override getEdgeAnimationStyle(): LogicFlow.EdgeAnimation {
    return getEnhancedEdgeAnimationStyle(
      this.properties as Record<string, unknown> | undefined,
      super.getEdgeAnimationStyle(),
    );
  }

  override getTextStyle(): LogicFlow.EdgeTextTheme {
    const style = super.getTextStyle();
    style.color = '#334155';
    style.fontSize = 12;
    style.background = {
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      radius: 4,
      wrapPadding: '4,8,4,8',
    };
    return style;
  }
}

/**
 * 默认贝塞尔平滑曲线连线模型：支持五态样式、呼吸流动与错误高亮样式。
 */
export class FlowBezierEdgeModel extends BezierEdgeModel {
  override setAttributes(): void {
    super.setAttributes();
    setupEdgeStatusAttributes(this);
  }

  override getEdgeStyle(): LogicFlow.CommonTheme {
    return applyEnhancedEdgeStyle(
      this.properties as Record<string, unknown> | undefined,
      super.getEdgeStyle(),
    );
  }

  override getEdgeAnimationStyle(): LogicFlow.EdgeAnimation {
    return getEnhancedEdgeAnimationStyle(
      this.properties as Record<string, unknown> | undefined,
      super.getEdgeAnimationStyle(),
    );
  }

  override getTextStyle(): LogicFlow.EdgeTextTheme {
    const style = super.getTextStyle();
    style.color = '#334155';
    style.fontSize = 12;
    style.background = {
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      radius: 4,
      wrapPadding: '4,8,4,8',
    };
    return style;
  }
}

/**
 * 创建通用拓扑防呆规则。
 *
 * @param beforeConnect 自定义连线前置守卫钩子
 * @returns LogicFlow 连接规则数组
 */
export function createCommonTargetRules(beforeConnect?: BeforeConnectHook): Model.ConnectRule[] {
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
    const customRule: Model.ConnectRule = {
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
          customRule.message = result;
          return false;
        }
        return Boolean(result);
      },
    };
    rules.push(customRule);
  }

  return rules;
}

/**
 * 预设图元与防呆连线规则单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LogicFlow from '@logicflow/core';
import {
  registerPresetNodes,
  FlowNodeType,
  DEFAULT_STENCIL_GROUPS,
  NODE_TYPE_LABEL_MAP,
  getNodeBadgeIcon,
} from '../src/presets';

describe('Presets & Connection Rules', () => {
  let container: HTMLDivElement;
  let lf: LogicFlow;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    lf = new LogicFlow({
      container,
      grid: true,
    });
  });

  afterEach(() => {
    lf.destroy();
    container.remove();
    document.body.innerHTML = '';
  });

  it('应该正确注册全套预设图元与物料分组数据', () => {
    registerPresetNodes(lf);

    expect(DEFAULT_STENCIL_GROUPS.length).toBe(3);
    const [eventsGroup, tasksGroup, gatewaysGroup] = DEFAULT_STENCIL_GROUPS;

    expect(eventsGroup?.id).toBe('events');
    expect(eventsGroup?.items.some(i => i.type === FlowNodeType.START)).toBe(true);
    expect(eventsGroup?.items.some(i => i.type === FlowNodeType.END)).toBe(true);

    expect(tasksGroup?.id).toBe('tasks');
    expect(tasksGroup?.items.some(i => i.type === FlowNodeType.USER_TASK)).toBe(true);

    expect(gatewaysGroup?.id).toBe('gateways');
    expect(gatewaysGroup?.items.some(i => i.type === FlowNodeType.EXCLUSIVE_GATEWAY)).toBe(true);
  });

  it('防呆规则：开始节点禁止作为连线终点', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '审批' },
      ],
      edges: [],
    });

    const startModel = lf.getNodeModelById('start-1');
    const taskModel = lf.getNodeModelById('task-1');

    expect(startModel).toBeDefined();
    expect(taskModel).toBeDefined();

    // 尝试将 task 连入 start (start 作为 target)
    const result = (
      startModel as unknown as {
        isAllowConnectedAsTarget: (source: unknown) => { isAllPass: boolean; msg: string };
      }
    ).isAllowConnectedAsTarget(taskModel);

    expect(result.isAllPass).toBe(false);
    expect(result.msg).toContain('开始节点不能作为连线终点');
  });

  it('防呆规则：结束节点禁止作为连线起点', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '审批' },
      ],
      edges: [],
    });

    const endModel = lf.getNodeModelById('end-1');
    const taskModel = lf.getNodeModelById('task-1');

    // 尝试从 end 连出 (end 作为 source)
    const result = (
      endModel as unknown as {
        isAllowConnectedAsSource: (target: unknown) => { isAllPass: boolean; msg: string };
      }
    ).isAllowConnectedAsSource(taskModel);

    expect(result.isAllPass).toBe(false);
    expect(result.msg).toContain('结束节点不能作为连线起点');
  });

  it('防呆规则：禁止节点自环连线', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [{ id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '审批' }],
      edges: [],
    });

    const taskModel = lf.getNodeModelById('task-1');
    const result = (
      taskModel as unknown as {
        isAllowConnectedAsTarget: (source: unknown) => { isAllPass: boolean; msg: string };
      }
    ).isAllowConnectedAsTarget(taskModel);

    expect(result.isAllPass).toBe(false);
    expect(result.msg).toContain('禁止节点自环连线');
  });

  it('防呆规则：支持自定义 beforeConnect 钩子拦截', () => {
    registerPresetNodes(lf, (source, target) => {
      if (source.id === 'task-1' && target.id === 'task-2') {
        return '业务规则：该审批节点禁止直接流转至归档节点';
      }
      return true;
    });

    lf.render({
      nodes: [
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 100, y: 100, text: '审批' },
        { id: 'task-2', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '归档' },
      ],
      edges: [],
    });

    const task1 = lf.getNodeModelById('task-1');
    const task2 = lf.getNodeModelById('task-2');

    const result = (
      task2 as unknown as {
        isAllowConnectedAsTarget: (source: unknown) => { isAllPass: boolean; msg: string };
      }
    ).isAllowConnectedAsTarget(task1);

    expect(result.isAllPass).toBe(false);
    expect(result.msg).toContain('业务规则：该审批节点禁止直接流转至归档节点');
  });

  it('应该支持 bezier 贝塞尔平滑曲线连线并支持五态与动画', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'n-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
        { id: 'n-2', type: FlowNodeType.END, x: 300, y: 100, text: '结束' },
      ],
      edges: [
        {
          id: 'edge-bezier',
          type: 'bezier',
          sourceNodeId: 'n-1',
          targetNodeId: 'n-2',
          properties: { status: 'processing' },
        },
      ],
    });

    const edgeModel = lf.getEdgeModelById('edge-bezier');
    expect(edgeModel).toBeDefined();
    expect(edgeModel?.modelType).toBe('bezier-edge');
    expect(edgeModel?.isAnimation).toBe(true);
    const style = edgeModel?.getEdgeStyle();
    expect(style?.stroke).toBe('#3b82f6');
  });

  it('预设节点应具备四向精准磁吸锚点 (getDefaultAnchor)', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'start-node', type: FlowNodeType.START, x: 100, y: 100 },
        { id: 'task-node', type: FlowNodeType.USER_TASK, x: 300, y: 100 },
        { id: 'gw-node', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 500, y: 100 },
      ],
      edges: [],
    });

    const startModel = lf.getNodeModelById('start-node');
    const taskModel = lf.getNodeModelById('task-node');
    const gwModel = lf.getNodeModelById('gw-node');

    expect(startModel?.getDefaultAnchor().length).toBe(4);
    expect(taskModel?.getDefaultAnchor().length).toBe(4);
    expect(gwModel?.getDefaultAnchor().length).toBe(4);
  });

  it('NODE_TYPE_LABEL_MAP 与 getNodeBadgeIcon 应准确解析预设图元元数据', () => {
    expect(NODE_TYPE_LABEL_MAP[FlowNodeType.START]).toBe('开始事件');
    expect(NODE_TYPE_LABEL_MAP[FlowNodeType.USER_TASK]).toBe('用户审批任务');
    expect(NODE_TYPE_LABEL_MAP[FlowNodeType.EXCLUSIVE_GATEWAY]).toBe('排他网关（条件分支）');

    expect(getNodeBadgeIcon(FlowNodeType.START)).toBe('▶');
    expect(getNodeBadgeIcon(FlowNodeType.END)).toBe('■');
    expect(getNodeBadgeIcon(FlowNodeType.USER_TASK)).toBe('👤');
    expect(getNodeBadgeIcon('unknown-type')).toBe('●');
  });

  it('紧凑图元智能双轨文本排版：短文本居中，长文本自动下沉挂载至底部', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'start-short', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
        { id: 'start-long', type: FlowNodeType.START, x: 200, y: 100, text: 'Kafka 行为流' },
        { id: 'gw-short', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 300, y: 100, text: '×' },
        { id: 'gw-long', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 400, y: 100, text: '白名单过滤' },
      ],
      edges: [],
    });

    const startShort = lf.getNodeModelById('start-short');
    const startLong = lf.getNodeModelById('start-long');
    const gwShort = lf.getNodeModelById('gw-short');
    const gwLong = lf.getNodeModelById('gw-long');

    // 短文本保留在图元正中央 (y === 100)
    expect(startShort?.text?.y).toBe(100);
    expect(gwShort?.text?.y).toBe(100);

    // 长文本自动下沉挂载至图元底部 (100 + 38 = 138; 100 + 39 = 139)
    expect(startLong?.text?.y).toBe(138);
    expect(gwLong?.text?.y).toBe(139);

    // 动态更新文本 updateText 应实时联动重新排版
    startShort?.updateText('费用大额审核流程');
    expect(startShort?.text?.y).toBe(138);

    startLong?.updateText('结束');
    expect(startLong?.text?.y).toBe(100);
  });

  it('连线模型应自带纯白圆角防压线背景胶囊配置', () => {
    registerPresetNodes(lf);

    lf.render({
      nodes: [
        { id: 'n-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
        { id: 'n-2', type: FlowNodeType.END, x: 400, y: 100, text: '结束' },
      ],
      edges: [
        { id: 'e-poly', type: 'polyline', sourceNodeId: 'n-1', targetNodeId: 'n-2', text: '折线' },
        { id: 'e-bez', type: 'bezier', sourceNodeId: 'n-1', targetNodeId: 'n-2', text: '曲线' },
      ],
    });

    const polyEdge = lf.getEdgeModelById('e-poly');
    const bezEdge = lf.getEdgeModelById('e-bez');

    const polyTextStyle = polyEdge?.getTextStyle();
    const bezTextStyle = bezEdge?.getTextStyle();

    expect(polyTextStyle?.background?.fill).toBe('#ffffff');
    expect(polyTextStyle?.background?.stroke).toBe('#cbd5e1');
    expect(polyTextStyle?.background?.radius).toBe(4);

    expect(bezTextStyle?.background?.fill).toBe('#ffffff');
    expect(bezTextStyle?.background?.stroke).toBe('#cbd5e1');
    expect(bezTextStyle?.background?.radius).toBe(4);
  });
});

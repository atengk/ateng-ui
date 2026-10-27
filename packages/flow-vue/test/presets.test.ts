/**
 * 预设图元与防呆连线规则单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LogicFlow from '@logicflow/core';
import { registerPresetNodes, FlowNodeType, DEFAULT_STENCIL_GROUPS } from '../src/presets';

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
});

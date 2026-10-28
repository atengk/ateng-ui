/**
 * AutoLayoutEngine 自动排版算法单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, vi } from 'vitest';
import { AutoLayoutEngine, animateLayout } from '../src/layout';
import type LogicFlow from '@logicflow/core';
import type { FlowGraph } from '../src/types';

describe('AutoLayoutEngine', () => {
  const linearGraph: FlowGraph = {
    nodes: [
      { id: 'start', type: 'flow:start', x: 0, y: 0, text: '开始' },
      { id: 'task', type: 'flow:user-task', x: 0, y: 0, text: '审批' },
      { id: 'end', type: 'flow:end', x: 0, y: 0, text: '结束' },
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'start', targetNodeId: 'task' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'task', targetNodeId: 'end' },
    ],
  };

  const branchGraph: FlowGraph = {
    nodes: [
      { id: 'start', type: 'flow:start', x: 0, y: 0, text: '开始' },
      { id: 'gw', type: 'flow:exclusive-gateway', x: 0, y: 0, text: '网关' },
      { id: 'taskA', type: 'flow:user-task', x: 0, y: 0, text: '分支A' },
      { id: 'taskB', type: 'flow:user-task', x: 0, y: 0, text: '分支B' },
      { id: 'end', type: 'flow:end', x: 0, y: 0, text: '结束' },
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'start', targetNodeId: 'gw' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'gw', targetNodeId: 'taskA' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'gw', targetNodeId: 'taskB' },
      { id: 'e4', type: 'polyline', sourceNodeId: 'taskA', targetNodeId: 'end' },
      { id: 'e5', type: 'polyline', sourceNodeId: 'taskB', targetNodeId: 'end' },
    ],
  };

  it('应该支持水平方向 (LR) 线性流程排版并递增 X 坐标', () => {
    const result = AutoLayoutEngine.layout(linearGraph, {
      direction: 'LR',
      startX: 100,
      startY: 200,
      rankSep: 200,
      nodeSep: 100,
    });

    expect(result.nodes.length).toBe(3);
    const startNode = result.nodes.find(n => n.id === 'start')!;
    const taskNode = result.nodes.find(n => n.id === 'task')!;
    const endNode = result.nodes.find(n => n.id === 'end')!;

    expect(startNode.x).toBe(100);
    expect(taskNode.x).toBe(300);
    expect(endNode.x).toBe(500);

    // 同一中心线上
    expect(startNode.y).toBe(200);
    expect(taskNode.y).toBe(200);
    expect(endNode.y).toBe(200);

    // 确认旧锚点已清空以便重新正交寻径
    expect(result.edges[0]?.pointsList).toBeUndefined();
  });

  it('应该支持垂直方向 (TB) 分支流程排版并递增 Y 坐标与对称水平分布', () => {
    const result = AutoLayoutEngine.layout(branchGraph, {
      direction: 'TB',
      startX: 300,
      startY: 100,
      rankSep: 150,
      nodeSep: 120,
    });

    const startNode = result.nodes.find(n => n.id === 'start')!;
    const gwNode = result.nodes.find(n => n.id === 'gw')!;
    const taskANode = result.nodes.find(n => n.id === 'taskA')!;
    const taskBNode = result.nodes.find(n => n.id === 'taskB')!;
    const endNode = result.nodes.find(n => n.id === 'end')!;

    expect(startNode.y).toBe(100);
    expect(gwNode.y).toBe(250);
    expect(taskANode.y).toBe(400);
    expect(taskBNode.y).toBe(400);
    expect(endNode.y).toBe(550);

    // taskA 与 taskB 对称分布在 startX(300) 两侧
    expect(taskANode.x).toBe(240);
    expect(taskBNode.x).toBe(360);
    expect(gwNode.x).toBe(300);
    expect(endNode.x).toBe(300);
  });

  it('针对存在回环逆流的图应具备防御性破环能力且不发生死循环', () => {
    const cyclicGraph: FlowGraph = {
      nodes: [
        { id: 'node1', type: 'rect', x: 0, y: 0, text: '节点1' },
        { id: 'node2', type: 'rect', x: 0, y: 0, text: '节点2' },
      ],
      edges: [
        { id: 'e1', type: 'polyline', sourceNodeId: 'node1', targetNodeId: 'node2' },
        { id: 'e2', type: 'polyline', sourceNodeId: 'node2', targetNodeId: 'node1' }, // 循环回边
      ],
    };

    expect(() => {
      const res = AutoLayoutEngine.layout(cyclicGraph);
      expect(res.nodes.length).toBe(2);
    }).not.toThrow();
  });

  it('在处理空图或孤岛节点时应安全保底返回', () => {
    const emptyResult = AutoLayoutEngine.layout({ nodes: [], edges: [] });
    expect(emptyResult.nodes).toEqual([]);
    expect(emptyResult.edges).toEqual([]);

    const islandGraph: FlowGraph = {
      nodes: [{ id: 'isolated', type: 'rect', x: 10, y: 20, text: '孤岛' }],
      edges: [],
    };
    const islandResult = AutoLayoutEngine.layout(islandGraph, { startX: 100, startY: 100 });
    expect(islandResult.nodes[0]?.x).toBe(100);
    expect(islandResult.nodes[0]?.y).toBe(100);
  });

  it('animateLayout 应该支持驱动节点动画过渡并触发完成回调', () => {
    const mockLf = {
      render: vi.fn(),
      graphModel: {
        getNodeModelById: vi.fn(() => ({ x: 0, y: 0 })),
        moveNode2Coordinate: vi.fn(),
      },
    } as unknown as LogicFlow;

    const targetGraph: FlowGraph = {
      nodes: [{ id: 'n1', type: 'rect', x: 200, y: 200 }],
      edges: [],
    };

    const onComplete = vi.fn();
    animateLayout(mockLf, targetGraph, { duration: 0, onComplete });

    expect(mockLf.render).toHaveBeenCalledWith(targetGraph);
    expect(onComplete).toHaveBeenCalled();
  });
});

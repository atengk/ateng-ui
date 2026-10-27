/**
 * useFlow 无头状态机单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFlow } from '../src/composables/useFlow';
import type { FlowGraph } from '../src/types';

describe('useFlow', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  it('应该正常初始化并提供响应式状态与操作门面', () => {
    const { lf, containerRef, init, getGraphData, destroy } = useFlow();

    expect(lf.value).toBeNull();
    expect(containerRef.value).toBeNull();

    const instance = init(container);
    expect(instance).toBeDefined();
    expect(lf.value).toBe(instance);

    const initialData = getGraphData();
    expect(initialData.nodes).toEqual([]);
    expect(initialData.edges).toEqual([]);

    destroy();
    expect(lf.value).toBeNull();
  });

  it('应该支持渲染图数据并完整获取', () => {
    const { init, render, getGraphData, destroy } = useFlow();
    init(container);

    const mockGraph: FlowGraph = {
      nodes: [
        { id: 'node-1', type: 'rect', x: 100, y: 100, text: '开始' },
        { id: 'node-2', type: 'rect', x: 300, y: 100, text: '审批' },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'polyline',
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
        },
      ],
    };

    render(mockGraph);
    const result = getGraphData();

    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
    expect(result.nodes[0]?.id).toBe('node-1');
    expect(result.edges[0]?.id).toBe('edge-1');

    destroy();
  });

  it('应该支持视口缩放与清空画布操作', () => {
    const { init, render, getGraphData, zoomIn, zoomOut, resetZoom, fitView, clear, destroy } =
      useFlow();
    init(container);

    render({
      nodes: [{ id: 'n1', type: 'rect', x: 50, y: 50, text: 'N1' }],
      edges: [],
    });

    expect(() => {
      zoomIn();
      zoomOut();
      resetZoom();
      fitView();
    }).not.toThrow();

    clear();
    const result = getGraphData();
    expect(result.nodes.length).toBe(0);

    destroy();
  });

  it('在未提供有效容器时应抛出类型安全的异常', () => {
    const { init } = useFlow();
    expect(() => init(undefined)).toThrowError('初始化画布失败');
  });
});

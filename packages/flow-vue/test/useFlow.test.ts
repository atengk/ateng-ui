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

  it('应该默认注册 MiniMap 插件并挂载至 extension.miniMap', () => {
    const { init, destroy } = useFlow();
    const instance = init(container);
    const ext = instance.extension as Record<string, unknown>;
    expect(ext.miniMap).toBeDefined();
    destroy();
  });

  it('应该支持桌面级键盘快捷键触发与事件响应', () => {
    const { init, render, destroy } = useFlow();
    const instance = init(container);

    render({
      nodes: [
        { id: 'node-a', type: 'rect', x: 100, y: 100, text: 'A' },
        { id: 'node-b', type: 'rect', x: 200, y: 100, text: 'B' },
      ],
      edges: [{ id: 'edge-ab', type: 'polyline', sourceNodeId: 'node-a', targetNodeId: 'node-b' }],
    });

    // 选中 node-a 并触发删除
    instance.selectElementById('node-a', false);
    expect(instance.getSelectElements(false).nodes.length).toBe(1);

    // 触发 delete / backspace 快捷键
    const keyboard = instance.keyboard;
    expect(keyboard).toBeDefined();

    // 触发复制 Ctrl+C 与粘贴 Ctrl+V
    instance.selectElementById('node-b', false);
    expect(() => {
      // 模拟快捷键分发
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
      window.dispatchEvent(event);
    }).not.toThrow();

    // 触发 Space 键与画布拖拽平移
    const spaceDown = new KeyboardEvent('keydown', { code: 'Space' });
    window.dispatchEvent(spaceDown);
    expect(container.style.cursor).toBe('grab');

    const spaceUp = new KeyboardEvent('keyup', { code: 'Space' });
    window.dispatchEvent(spaceUp);
    expect(container.style.cursor).toBe('');

    destroy();
  });
});

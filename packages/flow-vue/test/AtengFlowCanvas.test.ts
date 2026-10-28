/**
 * AtengFlowCanvas 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengFlowCanvas from '../src/components/AtengFlowCanvas.vue';
import type { FlowGraph } from '../src/types';

describe('AtengFlowCanvas', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应该正常挂载并派发 ready 事件', async () => {
    const mockGraph: FlowGraph = {
      nodes: [
        { id: '1', type: 'rect', x: 100, y: 100, text: '开始' },
        { id: '2', type: 'rect', x: 300, y: 100, text: '结束' },
      ],
      edges: [{ id: 'e1', type: 'polyline', sourceNodeId: '1', targetNodeId: '2' }],
    };

    wrapper = mount(AtengFlowCanvas, {
      props: {
        modelValue: mockGraph,
        width: 800,
        height: 600,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-flow-canvas');
    expect(wrapper.emitted('ready')).toBeTruthy();

    const exposed = wrapper.vm as unknown as {
      getLf: () => unknown;
      getGraphData: () => FlowGraph;
      clear: () => void;
    };

    expect(exposed.getLf()).toBeDefined();
    const currentData = exposed.getGraphData();
    expect(currentData.nodes.length).toBe(2);
    expect(currentData.edges.length).toBe(1);

    exposed.clear();
    const cleared = exposed.getGraphData();
    expect(cleared.nodes.length).toBe(0);
  });

  it('当外部 modelValue 属性变更（数量未变）时应响应式更新画布', async () => {
    const initialGraph: FlowGraph = {
      nodes: [{ id: '1', type: 'rect', x: 100, y: 100, text: '旧名称' }],
      edges: [],
    };

    wrapper = mount(AtengFlowCanvas, {
      props: {
        modelValue: initialGraph,
        width: 800,
        height: 600,
      },
      attachTo: document.body,
    });

    const exposed = wrapper.vm as unknown as {
      getGraphData: () => FlowGraph;
    };

    const getTextStr = (val: unknown) =>
      typeof val === 'object' && val !== null && 'value' in val
        ? (val as { value: string }).value
        : val;

    expect(getTextStr(exposed.getGraphData().nodes[0]?.text)).toBe('旧名称');

    // 外部修改名称（节点总数仍为 1）
    await wrapper.setProps({
      modelValue: {
        nodes: [{ id: '1', type: 'rect', x: 100, y: 100, text: '新名称' }],
        edges: [],
      },
    });

    expect(getTextStr(exposed.getGraphData().nodes[0]?.text)).toBe('新名称');
  });
});

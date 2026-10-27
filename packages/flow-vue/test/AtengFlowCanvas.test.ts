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
});

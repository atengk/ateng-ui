/**
 * AtengFlowDesigner 设计器容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengFlowDesigner from '../src/components/AtengFlowDesigner.vue';

describe('AtengFlowDesigner', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应该正常挂载设计器并渲染物料侧边栏与画布', async () => {
    wrapper = mount(AtengFlowDesigner, {
      props: {
        width: 1000,
        height: 700,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-flow-designer');
    expect(wrapper.find('.at-flow-stencil').exists()).toBe(true);
    expect(wrapper.find('.at-flow-canvas').exists()).toBe(true);

    const exposed = wrapper.vm as unknown as {
      getLf: () => unknown;
      getGraphData: () => unknown;
    };

    expect(exposed.getLf()).toBeDefined();
    expect(exposed.getGraphData()).toBeDefined();
  });

  it('支持通过 #stencil 插槽自定义替换物料面板', () => {
    wrapper = mount(AtengFlowDesigner, {
      slots: {
        stencil: '<div class="custom-stencil">自定义物料库</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.custom-stencil').exists()).toBe(true);
    expect(wrapper.find('.at-flow-stencil').exists()).toBe(false);
  });
});

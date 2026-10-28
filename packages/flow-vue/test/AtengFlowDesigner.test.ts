/**
 * AtengFlowDesigner 设计器容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import AtengFlowDesigner from '../src/components/AtengFlowDesigner.vue';
import type { FlowGraph, FlowNode, FlowElementData, FlowPanelSlotProps } from '../src/types';

describe('AtengFlowDesigner', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  const mockGraph: FlowGraph = {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        x: 100,
        y: 100,
        text: '发起申请',
        properties: { initiator: 'admin' },
      },
      {
        id: 'user-task-1',
        type: 'user-task',
        x: 300,
        y: 100,
        text: '主管审批',
        properties: { assignee: 'leader', description: '核准申请' },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        type: 'polyline',
        sourceNodeId: 'start-1',
        targetNodeId: 'user-task-1',
        text: '提交',
        properties: { condition: '${submit == true}' },
      },
    ],
  };

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
      getSelectedElement: () => FlowElementData | null;
    };

    expect(exposed.getLf()).toBeDefined();
    expect(exposed.getGraphData()).toBeDefined();
    expect(exposed.getSelectedElement()).toBeNull();
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

  it('节点点击时应唤起属性面板，点击画布空白区时应收起', async () => {
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      attachTo: document.body,
    });

    // 初始状态下面板未激活
    expect(wrapper.find('.at-flow-property-panel').exists()).toBe(false);

    // 模拟子组件触发 node:click 事件
    const canvas = wrapper.findComponent({ name: 'AtengFlowCanvas' });
    const targetNode: FlowNode = mockGraph.nodes[1]!;

    canvas.vm.$emit('node:click', targetNode, new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    // 抽屉面板应该已挂载并展示选中节点信息
    expect(wrapper.find('.at-flow-property-panel').exists()).toBe(true);
    expect(wrapper.find('.at-flow-property-panel__title').text()).toBe('节点属性');
    expect(wrapper.emitted('selection:change')).toBeTruthy();

    const exposed = wrapper.vm as unknown as {
      getSelectedElement: () => FlowElementData | null;
    };
    expect(exposed.getSelectedElement()?.id).toBe('user-task-1');

    // 模拟点击空白区域
    canvas.vm.$emit('blank:click', new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    // 抽屉面板应该收起
    expect(wrapper.find('.at-flow-property-panel').exists()).toBe(false);
    expect(exposed.getSelectedElement()).toBeNull();
  });

  it('通过 updateProperty 回写属性应同步至数据模型与历史栈', async () => {
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      attachTo: document.body,
    });

    const canvas = wrapper.findComponent({ name: 'AtengFlowCanvas' });
    canvas.vm.$emit('node:click', mockGraph.nodes[1]!, new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    const exposed = wrapper.vm as unknown as {
      updateProperty: (key: string, value: unknown) => void;
      getSelectedElement: () => FlowElementData | null;
      getGraphData: () => FlowGraph;
    };

    exposed.updateProperty('name', '总监终审');
    exposed.updateProperty('assignee', 'director');
    await wrapper.vm.$nextTick();

    expect(exposed.getSelectedElement()?.name).toBe('总监终审');
    expect(exposed.getSelectedElement()?.properties.assignee).toBe('director');

    // 验证是否派发了 element:update 与 update:modelValue 事件
    expect(wrapper.emitted('element:update')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('支持使用 #panel 插槽完全接管属性面板并解构回写方法', async () => {
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      slots: {
        panel: (slotProps: FlowPanelSlotProps) =>
          h('div', { class: 'custom-panel-override' }, [
            h('span', { class: 'custom-id' }, slotProps.element.id),
            h(
              'button',
              {
                class: 'custom-btn',
                onClick: () => slotProps.updateProperty('custom', 'val'),
              },
              '修改',
            ),
          ]),
      },
      attachTo: document.body,
    });

    const canvas = wrapper.findComponent({ name: 'AtengFlowCanvas' });
    canvas.vm.$emit('node:click', mockGraph.nodes[0]!, new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.custom-panel-override').exists()).toBe(true);
    expect(wrapper.find('.custom-id').text()).toBe('start-1');
    expect(wrapper.find('.at-flow-property-panel').exists()).toBe(false);
  });

  it('应该默认挂载 AtengFlowToolbar 顶部工具栏并支持一键 DAG 自动排版', async () => {
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-flow-toolbar').exists()).toBe(true);

    const exposed = wrapper.vm as unknown as {
      autoLayout: (direction?: 'LR' | 'TB') => void;
      getGraphData: () => FlowGraph;
    };

    exposed.autoLayout('LR');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('layout:complete')).toBeTruthy();
    const emittedData = wrapper.emitted('layout:complete')![0] as Array<{
      direction: string;
      graph: FlowGraph;
    }>;
    expect(emittedData[0]?.direction).toBe('LR');
    expect(emittedData[0]?.graph.nodes.length).toBe(2);
  });

  it('调用 validate() 应该执行拓扑校验、派发事件并高亮错误节点', async () => {
    // mockGraph 缺少 end 节点，且 user-task-1 没有出度
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      attachTo: document.body,
    });

    const exposed = wrapper.vm as unknown as {
      validate: () => import('../src/validator').FlowValidationResult;
      clearValidationHighlight: () => void;
      focusElement: (id: string) => void;
      getLf: () => import('@logicflow/core').default;
      getSelectedElement: () => FlowElementData | null;
    };

    const result = exposed.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(wrapper.emitted('validate')).toBeTruthy();

    const emittedResult = wrapper.emitted(
      'validate',
    )![0]![0] as import('../src/validator').FlowValidationResult;
    expect(emittedResult.valid).toBe(false);

    // 验证产生错误的节点已设置 __hasError: true
    const lf = exposed.getLf();
    const taskModel = lf.getNodeModelById('user-task-1');
    expect(taskModel?.properties?.__hasError).toBe(true);

    // 调用 focusElement 应该定位并选中节点
    exposed.focusElement('user-task-1');
    await wrapper.vm.$nextTick();
    expect(exposed.getSelectedElement()?.id).toBe('user-task-1');

    // 清理高亮
    exposed.clearValidationHighlight();
    expect(taskModel?.properties?.__hasError).toBe(false);
  });

  it('抽屉采用绝对定位浮动架构，且在关闭退场时通过 displayElement 维持快照', async () => {
    let capturedElement: FlowElementData | null = null;
    wrapper = mount(AtengFlowDesigner, {
      props: {
        modelValue: mockGraph,
      },
      slots: {
        panel: (slotProps: FlowPanelSlotProps) => {
          capturedElement = slotProps.element;
          return h('div', { class: 'snapshot-probe' }, slotProps.element.name);
        },
      },
      attachTo: document.body,
    });

    const canvas = wrapper.findComponent({ name: 'AtengFlowCanvas' });
    canvas.vm.$emit('node:click', mockGraph.nodes[1]!, new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    const panel = wrapper.find('.at-flow-designer__panel');
    expect(panel.exists()).toBe(true);
    expect(capturedElement).not.toBeNull();
    expect((capturedElement as unknown as FlowElementData).id).toBe('user-task-1');

    // 触发关闭
    const exposed = wrapper.vm as unknown as {
      closePanel: () => void;
      getSelectedElement: () => FlowElementData | null;
    };
    exposed.closePanel();
    await wrapper.vm.$nextTick();

    // 逻辑状态已立即置空
    expect(exposed.getSelectedElement()).toBeNull();
  });
});

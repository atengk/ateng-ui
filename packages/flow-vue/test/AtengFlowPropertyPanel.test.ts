/**
 * AtengFlowPropertyPanel 属性配置抽屉单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengFlowPropertyPanel from '../src/components/AtengFlowPropertyPanel.vue';
import type { FlowElementData } from '../src/types';

describe('AtengFlowPropertyPanel', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  const mockNodeElement: FlowElementData = {
    id: 'user-task-1',
    elementType: 'node',
    type: 'user-task',
    name: '部门主管审批',
    properties: {
      description: '需由直接上级主管进行核准',
      assignee: 'manager',
      approvalMode: 'single',
    },
  };

  const mockEdgeElement: FlowElementData = {
    id: 'edge-1',
    elementType: 'edge',
    type: 'polyline',
    name: '金额 > 1000',
    properties: {
      condition: '${amount > 1000}',
      description: '大额流转分支',
    },
  };

  it('应该正常渲染节点元素的基础属性与审批表单', () => {
    wrapper = mount(AtengFlowPropertyPanel, {
      props: {
        element: mockNodeElement,
      },
    });

    expect(wrapper.classes()).toContain('at-flow-property-panel');
    expect(wrapper.find('.at-flow-property-panel__title').text()).toBe('节点属性');
    expect(wrapper.find('.at-flow-property-panel__badge').text()).toBe('用户审批任务');

    // 检查 ID 是否为只读
    const idInput = wrapper.find('input.is-readonly');
    expect(idInput.exists()).toBe(true);
    expect((idInput.element as HTMLInputElement).value).toBe('user-task-1');

    // 检查名称与描述
    const inputs = wrapper.findAll('.at-flow-property-panel__input');
    const nameInput = inputs.find(i => (i.element as HTMLInputElement).value === '部门主管审批');
    expect(nameInput?.exists()).toBe(true);

    const textarea = wrapper.find('.at-flow-property-panel__textarea');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('需由直接上级主管进行核准');
  });

  it('编辑显示名称与描述时应派发 update:property 事件', async () => {
    wrapper = mount(AtengFlowPropertyPanel, {
      props: {
        element: mockNodeElement,
      },
    });

    const inputs = wrapper.findAll('.at-flow-property-panel__input');
    const nameInput = inputs.find(i => (i.element as HTMLInputElement).value === '部门主管审批');
    expect(nameInput).toBeDefined();

    await nameInput!.setValue('总监审批');
    expect(wrapper.emitted('update:property')).toBeTruthy();
    expect(wrapper.emitted('update:property')![0]).toEqual(['name', '总监审批']);

    const textarea = wrapper.find('.at-flow-property-panel__textarea');
    await textarea.setValue('紧急审批流程');
    expect(wrapper.emitted('update:property')![1]).toEqual(['description', '紧急审批流程']);
  });

  it('针对连线元素应该渲染流转条件表达式并支持更新', async () => {
    wrapper = mount(AtengFlowPropertyPanel, {
      props: {
        element: mockEdgeElement,
      },
    });

    expect(wrapper.find('.at-flow-property-panel__title').text()).toBe('连线属性');
    expect(wrapper.find('.at-flow-property-panel__badge').text()).toBe('正交平滑折线');

    const inputs = wrapper.findAll('.at-flow-property-panel__input');
    const conditionInput = inputs.find(
      i => (i.element as HTMLInputElement).value === '${amount > 1000}',
    );
    expect(conditionInput?.exists()).toBe(true);

    await conditionInput!.setValue('${amount > 5000}');
    expect(wrapper.emitted('update:property')).toBeTruthy();
    expect(wrapper.emitted('update:property')![0]).toEqual(['condition', '${amount > 5000}']);
  });

  it('点击关闭按钮或完成按钮时派发 close 事件', async () => {
    wrapper = mount(AtengFlowPropertyPanel, {
      props: {
        element: mockNodeElement,
      },
    });

    const closeBtn = wrapper.find('.at-flow-property-panel__close');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();

    const finishBtn = wrapper.find('.at-flow-property-panel__btn');
    await finishBtn.trigger('click');
    expect(wrapper.emitted('close')!.length).toBe(2);
  });

  it('支持通过 #extra 插槽插入自定义配置项', () => {
    wrapper = mount(AtengFlowPropertyPanel, {
      props: {
        element: mockNodeElement,
      },
      slots: {
        extra: '<div class="custom-extra-field">业务扩展字段</div>',
      },
    });

    expect(wrapper.find('.custom-extra-field').exists()).toBe(true);
  });
});

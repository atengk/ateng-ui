/**
 * @atengk/ai-chat-vue AtengReasoningBlock 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengReasoningBlock from '../src/components/AtengReasoningBlock.vue';
import type { ReasoningContent } from '../src/types';

describe('AtengReasoningBlock', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('未提供 reasoning 时应当安全返回空 DOM', () => {
    wrapper = mount(AtengReasoningBlock);
    expect(wrapper.find('.at-ai-chat__reasoning').exists()).toBe(false);
  });

  it('处于思考中且无文本时应当渲染骨架屏动效', () => {
    const reasoning: ReasoningContent = {
      text: '',
      isStreaming: true,
      collapsed: false,
    };

    wrapper = mount(AtengReasoningBlock, {
      props: { reasoning },
    });

    expect(wrapper.find('.at-ai-chat__reasoning-skeleton').exists()).toBe(true);
    expect(wrapper.text()).toContain('正在思考中...');
  });

  it('已有思考文本且非流式状态时展示思考完成用时与正文', () => {
    const reasoning: ReasoningContent = {
      text: '分析洋葱架构四层分工...',
      isStreaming: false,
      collapsed: false,
      elapsedMs: 3200,
    };

    wrapper = mount(AtengReasoningBlock, {
      props: { reasoning },
    });

    expect(wrapper.text()).toContain('已深度思考 3.2 秒');
    expect(wrapper.text()).toContain('分析洋葱架构四层分工...');
  });

  it('点击标题栏应当切换折叠状态并触发 update:collapsed 与 toggle 事件', async () => {
    const reasoning: ReasoningContent = {
      text: '已完成的推理步骤',
      isStreaming: false,
      collapsed: false,
    };

    wrapper = mount(AtengReasoningBlock, {
      props: { reasoning },
    });

    const header = wrapper.find('.at-ai-chat__reasoning-header');
    expect(wrapper.find('.at-ai-chat__reasoning-body').exists()).toBe(true);

    // 点击收起
    await header.trigger('click');
    expect(wrapper.emitted('update:collapsed')?.[0]).toEqual([true]);
    expect(wrapper.emitted('toggle')?.[0]).toEqual([true]);
    expect(wrapper.find('.at-ai-chat__reasoning-body').exists()).toBe(false);

    // 再次点击展开
    await header.trigger('click');
    expect(wrapper.emitted('update:collapsed')?.[1]).toEqual([false]);
    expect(wrapper.find('.at-ai-chat__reasoning-body').exists()).toBe(true);
  });
});

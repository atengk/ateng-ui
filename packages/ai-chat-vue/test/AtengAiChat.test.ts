/**
 * @atengk/ai-chat-vue 表现组件 AtengAiChat 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengAiChat from '../src/components/AtengAiChat.vue';
import type { ChatMessage } from '../src/types';

describe('AtengAiChat', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('应当正确挂载并渲染初始消息列表', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg_1',
        role: 'user',
        status: 'completed',
        content: '你好，请帮我分析代码',
        createdAt: 1000,
      },
      {
        id: 'msg_2',
        role: 'assistant',
        status: 'completed',
        content: '没问题，请提供具体代码。',
        createdAt: 1001,
      },
    ];

    wrapper = mount(AtengAiChat, {
      props: {
        messages,
      },
    });

    expect(wrapper.classes()).toContain('at-ai-chat');
    const messageElements = wrapper.findAll('.at-ai-chat__message-wrapper');
    expect(messageElements.length).toBe(2);
    expect(messageElements[0].classes()).toContain('at-ai-chat__message-wrapper--user');
    expect(messageElements[1].classes()).toContain('at-ai-chat__message-wrapper--assistant');
    expect(messageElements[0].text()).toContain('你好，请帮我分析代码');
    expect(messageElements[1].text()).toContain('没问题，请提供具体代码。');
  });

  it('输入内容后点击发送按钮应当派发 send 事件', async () => {
    wrapper = mount(AtengAiChat);

    const textarea = wrapper.find('textarea');
    await textarea.setValue('新提问内容');

    const sendBtn = wrapper.find('.at-ai-chat__btn--send');
    expect(sendBtn.attributes('disabled')).toBeUndefined();

    await sendBtn.trigger('click');

    expect(wrapper.emitted('send')).toBeTruthy();
    expect(wrapper.emitted('send')![0]).toEqual(['新提问内容']);
  });

  it('处于流式生成状态时应当显示停止按钮并可触发 stop 事件', async () => {
    wrapper = mount(AtengAiChat, {
      props: {
        isStreaming: true,
      },
    });

    const stopBtn = wrapper.find('.at-ai-chat__btn--stop');
    expect(stopBtn.exists()).toBe(true);

    await stopBtn.trigger('click');
    expect(wrapper.emitted('stop')).toBeTruthy();
  });

  it('应当支持头部与页脚插槽反转', () => {
    wrapper = mount(AtengAiChat, {
      slots: {
        header: '<div class="custom-header">自定义对话标题</div>',
        footer: '<div class="custom-footer">免责声明：AI 回答仅供参考</div>',
      },
    });

    expect(wrapper.find('.custom-header').text()).toBe('自定义对话标题');
    expect(wrapper.find('.custom-footer').text()).toBe('免责声明：AI 回答仅供参考');
  });

  it('视口处于底部时新消息到来保持锚定且不显示未读胶囊', async () => {
    const initialMessages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'hello', createdAt: 1 },
    ];
    wrapper = mount(AtengAiChat, {
      props: {
        messages: initialMessages,
        scrollThreshold: 60,
      },
    });

    const container = wrapper.find('.at-ai-chat__messages').element as HTMLDivElement;
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: 600,
      configurable: true,
      writable: true,
    });

    await wrapper.find('.at-ai-chat__messages').trigger('scroll');

    const vm = wrapper.vm as unknown as { isAnchored: boolean; showUnreadBadge: boolean };
    expect(vm.isAnchored).toBe(true);
    expect(vm.showUnreadBadge).toBe(false);
    expect(wrapper.find('.at-ai-chat__unread-badge').exists()).toBe(false);

    // 新增一条消息
    await wrapper.setProps({
      messages: [
        ...initialMessages,
        { id: '2', role: 'assistant', content: 'hi there', createdAt: 2 },
      ],
    });

    expect(vm.isAnchored).toBe(true);
    expect(vm.showUnreadBadge).toBe(false);
    expect(wrapper.find('.at-ai-chat__unread-badge').exists()).toBe(false);
  });

  it('用户上滑解除锚定后，新消息到来浮现未读气泡，点击气泡或滑回底部重新锚定', async () => {
    const initialMessages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'hello', createdAt: 1 },
    ];
    wrapper = mount(AtengAiChat, {
      props: {
        messages: initialMessages,
        scrollThreshold: 60,
      },
    });

    const container = wrapper.find('.at-ai-chat__messages').element as HTMLDivElement;
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: 200,
      configurable: true,
      writable: true,
    }); // delta = 400 > 60

    // 触发上滑
    await wrapper.find('.at-ai-chat__messages').trigger('scroll');

    const vm = wrapper.vm as unknown as { isAnchored: boolean; showUnreadBadge: boolean };
    expect(vm.isAnchored).toBe(false);

    // 新消息到达
    await wrapper.setProps({
      messages: [
        ...initialMessages,
        { id: '2', role: 'assistant', content: 'streaming chunk', createdAt: 2 },
      ],
    });
    await nextTick();

    expect(vm.showUnreadBadge).toBe(true);
    const badge = wrapper.find('.at-ai-chat__unread-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('有新消息');

    // 点击气泡应当滚底并重新锚定
    await badge.trigger('click');
    await nextTick();
    expect(vm.isAnchored).toBe(true);
    expect(vm.showUnreadBadge).toBe(false);

    // 再次上滑触发
    container.scrollTop = 100;
    await wrapper.find('.at-ai-chat__messages').trigger('scroll');
    expect(vm.isAnchored).toBe(false);

    await wrapper.setProps({
      messages: [
        ...initialMessages,
        { id: '2', role: 'assistant', content: 'chunk 2', createdAt: 3 },
      ],
    });
    await nextTick();
    expect(vm.showUnreadBadge).toBe(true);

    // 手动滑回底部 (delta <= 60)
    container.scrollTop = 580; // delta = 1000 - 580 - 400 = 20 <= 60
    await wrapper.find('.at-ai-chat__messages').trigger('scroll');
    await nextTick();
    expect(vm.isAnchored).toBe(true);
    expect(vm.showUnreadBadge).toBe(false);
  });

  it('支持自定义未读气泡插槽', async () => {
    wrapper = mount(AtengAiChat, {
      props: {
        messages: [{ id: '1', role: 'user', content: 'test', createdAt: 1 }],
      },
      slots: {
        'unread-badge': '<button class="my-custom-badge">自定义胶囊</button>',
      },
    });

    const container = wrapper.find('.at-ai-chat__messages').element as HTMLDivElement;
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: 100,
      configurable: true,
      writable: true,
    });

    await wrapper.find('.at-ai-chat__messages').trigger('scroll');

    await wrapper.setProps({
      messages: [
        { id: '1', role: 'user', content: 'test', createdAt: 1 },
        { id: '2', role: 'assistant', content: 'chunk', createdAt: 2 },
      ],
    });
    await nextTick();

    const customBadge = wrapper.find('.my-custom-badge');
    expect(customBadge.exists()).toBe(true);
    expect(customBadge.text()).toBe('自定义胶囊');
  });
});

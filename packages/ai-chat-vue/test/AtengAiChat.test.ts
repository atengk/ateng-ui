/**
 * @atengk/ai-chat-vue 表现组件 AtengAiChat 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
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
});

/**
 * @atengk/ai-chat-vue AtengMessageToolbar 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengMessageToolbar from '../src/components/AtengMessageToolbar.vue';
import type { ChatMessage } from '../src/types';

describe('AtengMessageToolbar', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    // Mock URL.createObjectURL & revokeObjectURL
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }

    // Mock window.speechSynthesis
    Object.assign(window, {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
      SpeechSynthesisUtterance: vi.fn().mockImplementation((text: string) => ({
        text,
        onend: null,
        onerror: null,
      })),
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const createAssistantMessage = (): ChatMessage => ({
    id: 'msg-1',
    role: 'assistant',
    status: 'completed',
    content: '你好，我是 AI 助手！',
    createdAt: Date.now(),
  });

  const createUserMessage = (): ChatMessage => ({
    id: 'msg-user-1',
    role: 'user',
    status: 'completed',
    content: '请写一个排序算法',
    createdAt: Date.now(),
  });

  it('正确渲染复制与重新生成按钮，点击复制触发写入剪贴板', async () => {
    const msg = createAssistantMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    const copyBtn = wrapper.find('button[title="复制正文"]');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger('click');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(msg.content);
    expect(wrapper.emitted('copy')).toBeTruthy();
    expect(wrapper.emitted('copy')?.[0]).toEqual([msg.content]);

    // 复制后临时显示已复制状态
    expect(wrapper.find('button[title="已复制"]').exists()).toBe(true);

    // 2 秒后恢复
    vi.advanceTimersByTime(2100);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('button[title="复制正文"]').exists()).toBe(true);
  });

  it('点击重新生成触发 regenerate 事件', async () => {
    const msg = createAssistantMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    const regenBtn = wrapper.find('button[title="重新生成"]');
    expect(regenBtn.exists()).toBe(true);

    await regenBtn.trigger('click');
    expect(wrapper.emitted('regenerate')).toBeTruthy();
    expect(wrapper.emitted('regenerate')?.[0]).toEqual([msg.id]);
  });

  it('user 角色渲染编辑按钮，点击触发 edit 事件', async () => {
    const msg = createUserMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    expect(wrapper.find('button[title="重新生成"]').exists()).toBe(false);
    const editBtn = wrapper.find('button[title="编辑提问"]');
    expect(editBtn.exists()).toBe(true);

    await editBtn.trigger('click');
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([msg.id, msg.content]);
  });

  it('点赞与点踩完整交互与反馈 SPI', async () => {
    const msg = createAssistantMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    // 1. 点赞
    const thumbUpBtn = wrapper.find('button[title="赞同此回答"]');
    expect(thumbUpBtn.exists()).toBe(true);
    await thumbUpBtn.trigger('click');

    expect(wrapper.emitted('feedback')).toBeTruthy();
    expect(wrapper.emitted('feedback')?.[0]?.[0]).toMatchObject({
      messageId: msg.id,
      type: 'up',
    });

    // 2. 点踩展开面板
    const thumbDownBtn = wrapper.find('button[title="批评此回答"]');
    await thumbDownBtn.trigger('click');
    expect(wrapper.find('.at-ai-chat__feedback-panel').exists()).toBe(true);

    // 选中标签并输入原因
    const tagBtn = wrapper.findAll('.at-ai-chat__feedback-tag')[0];
    await tagBtn.trigger('click');
    const textarea = wrapper.find('.at-ai-chat__feedback-textarea');
    await textarea.setValue('回答不完整');

    // 提交点踩
    const submitBtn = wrapper.find('.at-ai-chat__feedback-btn--submit');
    await submitBtn.trigger('click');

    expect(wrapper.emitted('feedback')?.length).toBe(2);
    expect(wrapper.emitted('feedback')?.[1]?.[0]).toMatchObject({
      messageId: msg.id,
      type: 'down',
      tags: ['答非所问'],
      reason: '回答不完整',
    });
    // 面板收起
    expect(wrapper.find('.at-ai-chat__feedback-panel').exists()).toBe(false);
  });

  it('朗读触发 Web Speech API 播放与停止', async () => {
    const msg = createAssistantMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    const speakBtn = wrapper.find('button[title="语音朗读"]');
    expect(speakBtn.exists()).toBe(true);

    await speakBtn.trigger('click');
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    expect(wrapper.emitted('speak')).toBeTruthy();

    // 切换为停止状态
    const stopSpeakBtn = wrapper.find('button[title="停止朗读"]');
    expect(stopSpeakBtn.exists()).toBe(true);

    await stopSpeakBtn.trigger('click');
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('导出菜单触发 Markdown 与 JSON 导出事件', async () => {
    const msg = createAssistantMessage();
    wrapper = mount(AtengMessageToolbar, {
      props: {
        message: msg,
      },
    });

    const exportBtn = wrapper.find('button[title="导出消息"]');
    await exportBtn.trigger('click');

    const menuItems = wrapper.findAll('.at-ai-chat__toolbar-menu-item');
    expect(menuItems.length).toBe(2);

    // 导出 Markdown
    await menuItems[0].trigger('click');
    expect(wrapper.emitted('export')?.[0]).toEqual(['markdown', msg]);

    // 重新打开并导出 JSON
    await exportBtn.trigger('click');
    const jsonBtn = wrapper.findAll('.at-ai-chat__toolbar-menu-item')[1];
    await jsonBtn.trigger('click');
    expect(wrapper.emitted('export')?.[1]).toEqual(['json', msg]);
  });
});

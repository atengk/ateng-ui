/**
 * @atengk/ai-chat-vue AtengChatInput 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengChatInput from '../src/components/AtengChatInput.vue';
import type { ChatAttachment } from '../src/types';

describe('AtengChatInput', () => {
  let wrapper: VueWrapper | null = null;
  const mockCreateObjectURL = vi.fn().mockImplementation((file: File) => `blob:mock-${file.name}`);
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  it('基础文本输入与回车发送', async () => {
    wrapper = mount(AtengChatInput, {
      props: {
        modelValue: '',
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('你好');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['你好']);

    // 按 Enter 发送
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false });
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')?.[0]).toEqual(['你好', []]);
  });

  it('文件拖拽添加附件胶囊，并在发送时携带', async () => {
    wrapper = mount(AtengChatInput, {
      props: {
        modelValue: '请查看图片',
      },
    });

    const file = new File(['mock content'], 'test.png', { type: 'image/png' });
    const area = wrapper.find('.at-ai-chat__input-area');

    // 拖拽 drop
    await area.trigger('drop', {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(wrapper.find('.at-ai-chat__attachment-capsule').exists()).toBe(true);
    expect(wrapper.text()).toContain('test.png');

    // 发送
    const sendBtn = wrapper.find('.at-ai-chat__btn--send');
    await sendBtn.trigger('click');

    expect(wrapper.emitted('submit')).toBeTruthy();
    const submitPayload = wrapper.emitted('submit')?.[0] as [string, ChatAttachment[]];
    expect(submitPayload[0]).toBe('请查看图片');
    expect(submitPayload[1].length).toBe(1);
    expect(submitPayload[1][0]?.name).toBe('test.png');
    expect(submitPayload[1][0]?.type).toBe('image');
  });

  it('粘贴图片文件触发附件添加', async () => {
    wrapper = mount(AtengChatInput);

    const file = new File(['pasted image'], 'clipboard.jpg', { type: 'image/jpeg' });
    const textarea = wrapper.find('textarea');

    await textarea.trigger('paste', {
      clipboardData: {
        files: [file],
      },
    });

    expect(wrapper.find('.at-ai-chat__attachment-capsule').exists()).toBe(true);
    expect(wrapper.text()).toContain('clipboard.jpg');
  });

  it('文件超限触发 fileError 事件并拒绝添加', async () => {
    wrapper = mount(AtengChatInput, {
      props: {
        maxFileSize: 100, // 100 字节
      },
    });

    const bigFile = new File(['0123456789'.repeat(20)], 'big.txt', { type: 'text/plain' });
    const area = wrapper.find('.at-ai-chat__input-area');

    await area.trigger('drop', {
      dataTransfer: {
        files: [bigFile],
      },
    });

    expect(wrapper.emitted('fileError')).toBeTruthy();
    expect(wrapper.find('.at-ai-chat__attachment-capsule').exists()).toBe(false);
  });

  it('支持 uploadHandler SPI 异步处理', async () => {
    const mockUploadHandler = vi.fn().mockImplementation(async (file: File) => ({
      id: 'server-id',
      name: file.name,
      size: file.size,
      type: 'image',
      url: 'https://cdn.example.com/uploaded.png',
      status: 'success',
    }));

    wrapper = mount(AtengChatInput, {
      props: {
        uploadHandler: mockUploadHandler,
      },
    });

    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    const area = wrapper.find('.at-ai-chat__input-area');

    await area.trigger('drop', {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockUploadHandler).toHaveBeenCalledWith(file);
    await wrapper.vm.$nextTick();

    const capsules = wrapper.findAll('.at-ai-chat__attachment-capsule');
    expect(capsules.length).toBe(1);
  });

  it('移除附件触发 revokeObjectURL 回收资源', async () => {
    wrapper = mount(AtengChatInput);

    const file = new File(['data'], 'remove-me.pdf', { type: 'application/pdf' });
    const area = wrapper.find('.at-ai-chat__input-area');

    await area.trigger('drop', {
      dataTransfer: {
        files: [file],
      },
    });

    expect(wrapper.find('.at-ai-chat__attachment-capsule').exists()).toBe(true);

    const removeBtn = wrapper.find('.at-ai-chat__attachment-remove');
    await removeBtn.trigger('click');

    expect(mockRevokeObjectURL).toHaveBeenCalled();
    expect(wrapper.find('.at-ai-chat__attachment-capsule').exists()).toBe(false);
  });
});

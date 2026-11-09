/**
 * AtengCodeBlock 组件单元测试。
 *
 * 验证语言标牌、Prism 语法高亮、一键复制反馈与插槽反转行为。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AtengCodeBlock from '../src/components/AtengCodeBlock.vue';

describe('AtengCodeBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('正确渲染语言标签与高亮代码', () => {
    const wrapper = mount(AtengCodeBlock, {
      props: {
        language: 'typescript',
        code: 'const name: string = "Ateng";',
      },
    });

    expect(wrapper.find('.at-ai-chat__code-lang').text()).toBe('typescript');
    expect(wrapper.find('.at-ai-chat__code-pre').exists()).toBe(true);
    expect(wrapper.html()).toContain('class="token keyword"');
    wrapper.unmount();
  });

  it('点击复制代码按钮能触发剪贴板并切换已复制状态', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    const wrapper = mount(AtengCodeBlock, {
      props: {
        language: 'python',
        code: 'print("hello")',
      },
    });

    const copyBtn = wrapper.find('.at-ai-chat__code-copy');
    expect(copyBtn.text()).toContain('复制');

    await copyBtn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('print("hello")');
    expect(copyBtn.text()).toContain('已复制');

    // 2 秒后自动恢复
    vi.advanceTimersByTime(2100);
    await wrapper.vm.$nextTick();
    expect(copyBtn.text()).toContain('复制');

    wrapper.unmount();
  });

  it('支持默认插槽反转，替换为自定义 Monaco 或外部代码容器', () => {
    const wrapper = mount(AtengCodeBlock, {
      props: {
        language: 'json',
        code: '{"key": "value"}',
      },
      slots: {
        default: `<template #default="slotProps">
          <div class="custom-monaco-mock">{{ slotProps.language }}: {{ slotProps.code }}</div>
        </template>`,
      },
    });

    expect(wrapper.find('.custom-monaco-mock').exists()).toBe(true);
    expect(wrapper.find('.custom-monaco-mock').text()).toContain('json: {"key": "value"}');
    expect(wrapper.find('.at-ai-chat__code-pre').exists()).toBe(false);
    wrapper.unmount();
  });
});

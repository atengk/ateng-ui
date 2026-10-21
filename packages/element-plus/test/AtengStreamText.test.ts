/**
 * AtengStreamText 流式打字机组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { AtengStreamText } from '../src/components/stream-text';
import type { UseStreamResult } from '@atengk/vue';

describe('AtengStreamText 流式打字机组件交互与契约测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('静态模式与即时渲染：speed: 0 时直接全量输出文本并触发 finished 事件', async () => {
    const wrapper = mount(AtengStreamText, {
      props: {
        text: 'Hello Ateng UI',
        speed: 0,
      },
    });

    expect(wrapper.classes()).toContain('at-stream-text');
    expect(wrapper.find('.at-stream-text__body').text()).toBe('Hello Ateng UI');
    expect(wrapper.emitted('finished')).toBeTruthy();
    expect(wrapper.emitted('finished')![0]).toEqual(['Hello Ateng UI']);

    wrapper.unmount();
  });

  it('逐字切片动画：根据 speed 逐步吐字并更新 DOM', async () => {
    const wrapper = mount(AtengStreamText, {
      props: {
        text: 'Ateng',
        speed: 20,
      },
    });

    // 初始状态
    expect(wrapper.find('.at-stream-text__body').text()).toBe('');

    // 前进 20ms，吐出第 1 个字符
    vi.advanceTimersByTime(20);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.at-stream-text__body').text()).toBe('A');

    // 再前进 80ms，吐出剩余 4 个字符
    vi.advanceTimersByTime(80);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.at-stream-text__body').text()).toBe('Ateng');
    expect(wrapper.emitted('finished')).toBeTruthy();

    wrapper.unmount();
  });

  it('光标显隐与定制：打字中闪烁光标可见，打字完成后淡出隐藏', async () => {
    const wrapper = mount(AtengStreamText, {
      props: {
        text: 'Test',
        speed: 10,
        cursorChar: '█',
      },
    });

    const cursor = wrapper.find('.at-stream-text__cursor');
    expect(cursor.exists()).toBe(true);
    expect(cursor.text()).toBe('█');
    expect(cursor.classes()).not.toContain('at-stream-text__cursor--hidden');

    // 跑完打字
    vi.advanceTimersByTime(100);
    await wrapper.vm.$nextTick();

    expect(cursor.classes()).toContain('at-stream-text__cursor--hidden');

    wrapper.unmount();
  });

  it('实例门面：支持 flush() 立即吐出与 restart() 重新打字', async () => {
    const wrapper = mount(AtengStreamText, {
      props: {
        text: 'Long Text Typing',
        speed: 50,
      },
    });

    // 立即 flush
    wrapper.vm.flush();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.at-stream-text__body').text()).toBe('Long Text Typing');
    expect(wrapper.vm.isFinished).toBe(true);

    // 重新 restart
    wrapper.vm.restart();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isFinished).toBe(false);

    wrapper.unmount();
  });

  it('一键复制：配置 showCopy 时呈现复制按钮，点击派发 copy 事件', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const wrapper = mount(AtengStreamText, {
      props: {
        text: 'Copied Message',
        speed: 0,
        showCopy: true,
      },
    });

    const copyBtn = wrapper.find('.at-stream-text__copy-btn');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('Copied Message');
    expect(wrapper.emitted('copy')).toBeTruthy();
    expect(wrapper.emitted('copy')![0]).toEqual(['Copied Message']);

    wrapper.unmount();
  });

  it('流式响应绑定：深度对接 useStream 响应式文本与 isFinished 状态机', async () => {
    const streamText = ref('AI: ');
    const isFinished = ref(false);
    const mockStream: UseStreamResult = {
      text: streamText,
      isFinished,
      isLoading: ref(true),
      error: ref(null),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
    };

    const wrapper = mount(AtengStreamText, {
      props: {
        stream: mockStream,
        speed: 0,
      },
    });

    expect(wrapper.find('.at-stream-text__body').element.textContent).toBe('AI: ');

    // 模拟增量 chunk 流式返回
    streamText.value = 'AI: 你好，我是小艾助手！';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.at-stream-text__body').element.textContent).toBe(
      'AI: 你好，我是小艾助手！',
    );

    // 模拟流结束
    isFinished.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('finished')).toBeTruthy();

    wrapper.unmount();
  });
});

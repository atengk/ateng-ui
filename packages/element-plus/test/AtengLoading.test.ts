/**
 * AtengLoading 声明式零遮罩轻量包裹组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { AtengLoading } from '../src';

describe('AtengLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('基础渲染与插槽内容透传', () => {
    const wrapper = mount(AtengLoading, {
      props: { loading: false },
      slots: {
        default: '<div class="test-content">业务核心数据</div>',
      },
    });

    expect(wrapper.find('.test-content').exists()).toBe(true);
    expect(wrapper.text()).toContain('业务核心数据');
    expect(wrapper.find('.at-loading-shimmer-track').exists()).toBe(false);

    wrapper.unmount();
  });

  it('零遮罩顶沿流光模式 (mode="shimmer") 联动防闪烁状态机', async () => {
    const loading = ref(false);
    const wrapper = mount(AtengLoading, {
      props: {
        loading: loading.value,
        mode: 'shimmer',
      },
      slots: {
        default: '<div class="content-box">列表内容</div>',
      },
    });

    // 1. 触发 loading
    await wrapper.setProps({ loading: true });

    // 处于 150ms 静默窗口内，流光条尚未露头 (0ms 视觉打扰)
    vi.advanceTimersByTime(80);
    await nextTick();
    expect(wrapper.find('.at-loading-shimmer-track').exists()).toBe(false);

    // 突破 150ms 阈值，激活顶沿流光条
    vi.advanceTimersByTime(70);
    await nextTick();
    expect(wrapper.find('.at-loading-shimmer-track').exists()).toBe(true);
    expect(wrapper.find('.at-loading__content').classes()).toContain('is-loading-shimmer');

    // 2. 接口返回，触发 300ms 最小保护期
    await wrapper.setProps({ loading: false });
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(wrapper.find('.at-loading-shimmer-track').exists()).toBe(true);

    // 满 300ms 优雅淡出
    vi.advanceTimersByTime(200);
    await nextTick();
    expect(wrapper.find('.at-loading-shimmer-track').exists()).toBe(false);
    expect(wrapper.find('.at-loading__content').classes()).not.toContain('is-loading-shimmer');

    wrapper.unmount();
  });

  it('三点微波浪模式 (mode="dots") 呈现波浪微动与文案', async () => {
    const wrapper = mount(AtengLoading, {
      props: {
        loading: true,
        mode: 'dots',
        delay: 0, // 立即测试渲染
        text: '数据实时同步中...',
      },
      slots: {
        default: '<div>内容</div>',
      },
    });

    await nextTick();
    expect(wrapper.find('.at-loader-wave-dots').exists()).toBe(true);
    expect(wrapper.text()).toContain('数据实时同步中...');

    wrapper.unmount();
  });

  it('骨架屏模式 (mode="skeleton") 呈现骨架占位', async () => {
    const wrapper = mount(AtengLoading, {
      props: {
        loading: true,
        mode: 'skeleton',
        delay: 0,
      },
      slots: {
        default: '<div>真实内容</div>',
      },
    });

    await nextTick();
    expect(wrapper.find('.at-loading-skeleton').exists()).toBe(true);

    wrapper.unmount();
  });
});

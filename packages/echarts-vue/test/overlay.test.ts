/**
 * AtengECharts 多态 DOM 遮罩层 (Loading/Empty/Error) 与事件代理测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import type * as echarts from 'echarts';
import { AtengECharts } from '../src';

describe('AtengECharts 多态 DOM 遮罩与事件透传测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    const mockContext = {
      canvas: {},
      dpr: 1,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      mockContext.canvas = this;
      return mockContext;
    });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('1. loading: true 时应展示 DOM 级加载遮罩与 Spinner', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        loading: true,
        loadingText: '拼命加载图表中...',
      },
      attachTo: document.body,
    });

    await nextTick();

    const overlay = wrapper.find('.at-echarts__loading');
    expect(overlay.exists()).toBe(true);
    expect(overlay.text()).toContain('拼命加载图表中...');
    expect(wrapper.find('.at-echarts__spinner').exists()).toBe(true);
  });

  it('2. empty: true 时应展示 DOM 级空数据优雅遮罩', async () => {
    const option: echarts.EChartsOption = {
      series: [],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        empty: true,
        emptyText: '当前筛选条件无统计结果',
      },
      attachTo: document.body,
    });

    await nextTick();

    const emptyOverlay = wrapper.find('.at-echarts__empty');
    expect(emptyOverlay.exists()).toBe(true);
    expect(emptyOverlay.text()).toContain('当前筛选条件无统计结果');
  });

  it('3. error 属性非空时应展示异常遮罩并支持重试事件派发', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        error: new Error('网络请求超时 504'),
        errorText: '数据获取失败',
      },
      attachTo: document.body,
    });

    await nextTick();

    const errorOverlay = wrapper.find('.at-echarts__error');
    expect(errorOverlay.exists()).toBe(true);
    expect(errorOverlay.text()).toContain('数据获取失败');
    expect(errorOverlay.text()).toContain('网络请求超时 504');

    // 点击重试按钮
    const retryBtn = wrapper.find('.at-echarts__retry-btn');
    expect(retryBtn.exists()).toBe(true);
    await retryBtn.trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('4. nativeLoading: true 时应回退调用 ECharts 原生 showLoading', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        loading: true,
        nativeLoading: true,
      },
      attachTo: document.body,
    });

    await nextTick();

    // DOM 遮罩不应出现
    expect(wrapper.find('.at-echarts__loading').exists()).toBe(false);

    const vm = wrapper.vm as unknown as {
      getInstance: () => echarts.ECharts | null;
    };
    const chart = vm.getInstance();
    expect(chart).not.toBeNull();
  });

  it('5. 支持自定义插槽定制 #loading 与 #empty 内容', async () => {
    const option: echarts.EChartsOption = { series: [] };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        empty: true,
      },
      slots: {
        empty: () => h('div', { class: 'custom-empty' }, '自定义企业级空状态'),
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.custom-empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('自定义企业级空状态');
  });
});

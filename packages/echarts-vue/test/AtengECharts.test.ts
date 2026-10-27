/**
 * AtengECharts 通用表现容器组件单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type * as echarts from 'echarts';
import { AtengECharts } from '../src';

describe('AtengECharts 表现容器测试', () => {
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
      get: () => 400,
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

  it('1. 应成功挂载容器，默认应用 350px 黄金高度与 at-echarts 样式', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 100, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
      },
      attachTo: document.body,
    });

    await nextTick();

    const rootEl = wrapper.find('.at-echarts');
    expect(rootEl.exists()).toBe(true);
    expect(rootEl.attributes('style')).toContain('height: 350px');
    expect(rootEl.attributes('style')).toContain('width: 100%');
  });

  it('2. 支持自定义宽高覆盖默认值', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 100, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        width: '500px',
        height: '400px',
      },
      attachTo: document.body,
    });

    await nextTick();

    const rootEl = wrapper.find('.at-echarts');
    expect(rootEl.attributes('style')).toContain('width: 500px');
    expect(rootEl.attributes('style')).toContain('height: 400px');
  });

  it('3. 暴露的 defineExpose 实例方法可用且 getInstance() 可获取真实 ECharts 实例', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 100, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: { option },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      getInstance: () => unknown;
      resize: () => void;
      setOption: () => void;
    };
    expect(typeof vm.getInstance).toBe('function');
    expect(typeof vm.resize).toBe('function');
    expect(typeof vm.setOption).toBe('function');

    const chartInstance = vm.getInstance();
    expect(chartInstance).not.toBeNull();
  });
});

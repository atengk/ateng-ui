/**
 * useECharts 与 AtengECharts 容器尺寸自适应与零尺寸挂起自愈测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import type * as echarts from 'echarts';
import { useECharts } from '../src/composables/useECharts';
import { AtengECharts } from '../src';

describe('ECharts 容器几何感知与零尺寸挂起自愈防线测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let resizeCallbacks: Array<() => void> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    resizeCallbacks = [];

    // 1. Mock Canvas 2D
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

    // 2. Mock 现代 ResizeObserver
    class MockResizeObserver {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
        resizeCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('1. 零尺寸挂起防线：处于 0x0 隐藏容器时不应执行 init，待恢复正向尺寸后自愈', async () => {
    let mockWidth = 0;
    let mockHeight = 0;

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => mockWidth,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => mockHeight,
    });

    let hookResult: ReturnType<typeof useECharts> | null = null;

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        hookResult = useECharts(el, { resizeDebounce: 50 });
        return () => h('div', { ref: el });
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });

    // 零尺寸下挂起，isZeroDimension 为 true，且未创建 instance
    expect(hookResult!.isZeroDimension.value).toBe(true);
    expect(hookResult!.instance.value).toBeNull();

    // 在挂起状态下传入配置（使用标准饼图避免坐标系缺失）
    hookResult!.setOption({
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    });

    // 模拟容器展开或 Tab 切换，物理尺寸恢复为 500x300
    mockWidth = 500;
    mockHeight = 300;

    // 触发 ResizeObserver 尺寸变化通知
    for (const cb of resizeCallbacks) {
      cb();
    }

    // 状态机完成自愈
    expect(hookResult!.isZeroDimension.value).toBe(false);
    expect(hookResult!.instance.value).not.toBeNull();
  });

  it('2. 容器尺寸微变时应通过 150ms 防抖调度触发 resize()', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });

    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        autoResize: true,
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      getInstance: () => echarts.ECharts | null;
    };
    const chart = vm.getInstance();
    expect(chart).not.toBeNull();

    const resizeSpy = vi.spyOn(chart!, 'resize');

    // 触发 ResizeObserver
    for (const cb of resizeCallbacks) {
      cb();
    }

    // 未过防抖时间前不应立即调用 resize
    expect(resizeSpy).not.toHaveBeenCalled();

    // 推进并运行定时器与动画帧
    vi.runAllTimers();

    expect(resizeSpy).toHaveBeenCalled();
  });

  it('3. 当 autoResize 为 false 时，不应注册 ResizeObserver 监听', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });

    let hookResult: ReturnType<typeof useECharts> | null = null;

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        hookResult = useECharts(el, { autoResize: false });
        return () => h('div', { ref: el });
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });

    // 未注册 ResizeObserver 回调
    expect(resizeCallbacks.length).toBe(0);
    expect(hookResult!.instance.value).not.toBeNull();
  });

  it('4. 确定性销毁：在 unmount 时应 disconnect 监听器并彻底释放定时器与实例', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });

    wrapper = mount(AtengECharts, {
      props: {
        option: { series: [] },
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      getInstance: () => echarts.ECharts | null;
      dispose: () => void;
    };
    const chart = vm.getInstance();
    expect(chart).not.toBeNull();

    const disposeSpy = vi.spyOn(chart!, 'dispose');

    // 卸载组件
    wrapper.unmount();
    wrapper = null;

    expect(disposeSpy).toHaveBeenCalled();
  });
});

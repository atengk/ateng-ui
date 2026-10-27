/**
 * useECharts 无头组合式 Hook 单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, isProxy, isReactive, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import type * as echarts from 'echarts';
import { useECharts } from '../src/composables/useECharts';

describe('useECharts 无头状态机核心防线测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    // 模拟 Canvas 2D 渲染上下文，确保 happy-dom 离线运行自洽
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

  it('1. 实例必须使用 shallowRef 托管，严禁被 Vue Proxy 深度响应式代理', async () => {
    let hookResult: ReturnType<typeof useECharts> | null = null;

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        hookResult = useECharts(el);
        return () => h('div', { ref: el, style: { width: '400px', height: '300px' } });
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });

    expect(hookResult).not.toBeNull();
    const instance = hookResult!.instance.value;
    expect(instance).not.toBeNull();

    // 关键防线：断言实例绝不是 Vue 深度代理 Proxy，且不是 reactive
    expect(isProxy(instance)).toBe(false);
    expect(isReactive(instance)).toBe(false);
  });

  it('2. 在组件卸载时应自动调用 dispose 彻底销毁 ECharts 实例', async () => {
    let hookResult: ReturnType<typeof useECharts> | null = null;

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        hookResult = useECharts(el);
        return () => h('div', { ref: el, style: { width: '400px', height: '300px' } });
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const instance = hookResult!.instance.value;
    expect(instance).not.toBeNull();

    const disposeSpy = vi.spyOn(instance!, 'dispose');

    // 卸载组件触发 onScopeDispose
    wrapper.unmount();
    wrapper = null;

    expect(disposeSpy).toHaveBeenCalled();
  });

  it('3. setOption 与常用指令调用应平稳执行', async () => {
    let hookResult: ReturnType<typeof useECharts> | null = null;

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        hookResult = useECharts(el);
        return () => h('div', { ref: el, style: { width: '400px', height: '300px' } });
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const { setOption, resize, clear, showLoading, hideLoading } = hookResult!;

    const option: echarts.EChartsOption = {
      xAxis: { type: 'category', data: ['A', 'B'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [10, 20] }],
    };

    expect(() => {
      setOption(option);
      showLoading();
      hideLoading();
      resize();
      clear();
    }).not.toThrow();
  });
});

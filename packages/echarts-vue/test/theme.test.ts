/**
 * ECharts 主题联动与暗黑模式无损热切换单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type * as echarts from 'echarts';
import { AtengECharts, registerTheme } from '../src';

describe('ECharts 主题与暗黑模式无损热切换测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let mutationCallbacks: Array<() => void> = [];

  beforeEach(() => {
    mutationCallbacks = [];

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

    // Mock MutationObserver 用于捕获 html.dark 变更
    class MockMutationObserver {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
        mutationCallbacks.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('MutationObserver', MockMutationObserver);

    document.documentElement.className = '';
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.documentElement.className = '';
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('1. 默认 theme="auto" 在常规浅色环境下应解析为 ateng-light', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        theme: 'auto',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      currentTheme: string;
      getInstance: () => echarts.ECharts | null;
    };

    expect(vm.currentTheme).toBe('ateng-light');
    expect(vm.getInstance()).not.toBeNull();
  });

  it('2. 当 html 添加 dark 类名时，应触发主题热切换与平滑实例重建', async () => {
    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        theme: 'auto',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      currentTheme: string;
      getInstance: () => echarts.ECharts | null;
    };

    const firstInstance = vm.getInstance();
    expect(firstInstance).not.toBeNull();
    const disposeSpy = vi.spyOn(firstInstance!, 'dispose');

    // 模拟暗黑模式类名注入
    document.documentElement.classList.add('dark');

    // 触发 MutationObserver 回调
    for (const cb of mutationCallbacks) {
      cb();
    }

    await nextTick();

    // 旧实例被安全 dispose，新实例切换至 ateng-dark
    expect(disposeSpy).toHaveBeenCalled();
    expect(vm.currentTheme).toBe('ateng-dark');

    const secondInstance = vm.getInstance();
    expect(secondInstance).not.toBeNull();
    expect(secondInstance).not.toBe(firstInstance);
  });

  it('3. 支持注册并使用自定义全局主题', async () => {
    registerTheme('vintage-custom', {
      color: ['#d87c7c', '#919e8b', '#d7ab82'],
    });

    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        theme: 'vintage-custom',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      currentTheme: string;
    };

    expect(vm.currentTheme).toBe('vintage-custom');
  });

  it('4. 动态响应外部传入的 theme prop 变更', async () => {
    const themeProp = ref('ateng-light');

    const option: echarts.EChartsOption = {
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        theme: themeProp.value,
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      currentTheme: string;
    };

    expect(vm.currentTheme).toBe('ateng-light');

    // 改变外部 prop
    await wrapper.setProps({ theme: 'ateng-dark' });
    await nextTick();

    expect(vm.currentTheme).toBe('ateng-dark');
  });

  it('5. dataZoom 交互缩放选区在暗黑主题切换重建时应无损还原', async () => {
    const option: echarts.EChartsOption = {
      dataZoom: [{ start: 25, end: 75 }],
      series: [{ type: 'pie', data: [{ value: 10, name: 'A' }] }],
    };

    wrapper = mount(AtengECharts, {
      props: {
        option,
        theme: 'auto',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      currentTheme: string;
      getInstance: () => echarts.ECharts | null;
    };

    const firstInstance = vm.getInstance();
    expect(firstInstance).not.toBeNull();

    // 模拟暗黑模式类名注入
    document.documentElement.classList.add('dark');
    for (const cb of mutationCallbacks) {
      cb();
    }
    await nextTick();

    const secondInstance = vm.getInstance();
    expect(secondInstance).not.toBeNull();
    expect(secondInstance).not.toBe(firstInstance);

    // 验证新实例的 option 中保留并无损恢复了原有的 dataZoom 范围
    const newOpt = secondInstance!.getOption() as {
      dataZoom?: Array<{ start?: number; end?: number }>;
    };
    expect(newOpt.dataZoom).toBeDefined();
    expect(newOpt.dataZoom?.[0].start).toBe(25);
    expect(newOpt.dataZoom?.[0].end).toBe(75);
  });
});

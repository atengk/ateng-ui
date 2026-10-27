/**
 * AtengECharts 工具栏胶囊、全屏脱壳与高清导出单元测试。
 *
 * 严格恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import * as coreModule from '@atengk/core';
import { AtengECharts, generateChartFilename, dataUrlToBlob } from '../src';
const defaultOption = {
  xAxis: { type: 'category' as const, data: ['A', 'B'] },
  yAxis: { type: 'value' as const },
  series: [{ type: 'bar' as const, data: [10, 20] }],
};

describe('AtengECharts 工具栏、全屏脱壳与高清导出防线测试', () => {
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
      get: () => 600,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 400,
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

  it('1. 辅助工具函数规范性：生成安全带时间戳文件名与 DataURL 转 Blob', () => {
    // 1.1 文件名生成规约校验
    const defaultFilename = generateChartFilename();
    expect(defaultFilename).toMatch(/^chart_\d{8}_\d{6}\.png$/);

    const customFilename = generateChartFilename('sales-report', 'jpeg');
    expect(customFilename).toMatch(/^sales-report_\d{8}_\d{6}\.jpeg$/);

    // 1.2 DataURL 转 Blob 校验
    const dummyBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(dummyBase64);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');

    // 1.3 非法 Base64 安全降级防御
    expect(dataUrlToBlob('invalid-url')).toBeNull();
  });

  it('2. 工具栏显示与隐藏防线：默认不渲染，开启 allow-fullscreen/allow-export 或插槽时渲染', async () => {
    wrapper = mount(AtengECharts, {
      props: {
        option: defaultOption,
        allowFullscreen: false,
        allowExport: false,
      },
    });

    await nextTick();
    expect(wrapper.find('.at-echarts__toolbar').exists()).toBe(false);

    // 开启全屏与导出
    await wrapper.setProps({ allowFullscreen: true, allowExport: true });
    await nextTick();
    expect(wrapper.find('.at-echarts__toolbar').exists()).toBe(true);

    const buttons = wrapper.findAll('.at-echarts__toolbar-btn');
    expect(buttons.length).toBe(2);
  });

  it('3. 全屏脱壳状态机测试：页面级脱壳全屏进入、自适应与退出', async () => {
    wrapper = mount(AtengECharts, {
      props: {
        option: defaultOption,
        allowFullscreen: true,
        fullscreenMode: 'page',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as {
      isFullscreen: boolean;
      toggleFullscreen: (mode?: 'auto' | 'native' | 'page') => Promise<boolean>;
      resize: () => void;
    };

    expect(vm.isFullscreen).toBe(false);
    expect(wrapper.classes()).not.toContain('is-page-fullscreen');

    // 点击工具栏全屏按钮触发进入页面脱壳全屏
    const fullscreenBtn = wrapper.find('.at-echarts__toolbar-btn');
    await fullscreenBtn.trigger('click');
    await nextTick();

    expect(vm.isFullscreen).toBe(true);
    expect(wrapper.classes()).toContain('is-page-fullscreen');
    expect(wrapper.emitted('fullscreen-change')?.[0]).toEqual([true]);

    // 再次点击退出全屏
    await fullscreenBtn.trigger('click');
    await nextTick();

    expect(vm.isFullscreen).toBe(false);
    expect(wrapper.classes()).not.toContain('is-page-fullscreen');
    expect(wrapper.emitted('fullscreen-change')?.[1]).toEqual([false]);

    // 测试 Escape 键退出页面级全屏
    await vm.toggleFullscreen('page');
    await nextTick();
    expect(vm.isFullscreen).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(vm.isFullscreen).toBe(false);
  });

  it('4. 高清图片导出测试：按高分辨率 2x/3x 导出并生成带时间戳安全文件名', async () => {
    const saveBlobSpy = vi.spyOn(coreModule, 'saveBlobAsFile').mockReturnValue(true);

    wrapper = mount(AtengECharts, {
      props: {
        option: defaultOption,
        allowExport: true,
        exportOptions: {
          pixelRatio: 3,
          type: 'png',
          filename: 'kpi_dashboard',
        },
      },
    });

    await nextTick();
    const vm = wrapper.vm as unknown as {
      exportImage: (opts?: object) => boolean;
      getInstance: () => { getDataURL: (opts: unknown) => string } | null;
    };

    const instance = vm.getInstance();
    expect(instance).not.toBeNull();

    // Mock 底层 ECharts 实例的 getDataURL 返回有效 Base64
    const dummyBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    vi.spyOn(instance!, 'getDataURL').mockReturnValue(dummyBase64);

    // 触发导出
    const result = vm.exportImage();
    expect(result).toBe(true);
    expect(saveBlobSpy).toHaveBeenCalled();

    // 验证调用 saveBlobAsFile 的文件名携带后缀
    const callArgs = saveBlobSpy.mock.calls[0];
    expect(callArgs?.[1]).toBe('kpi_dashboard.png');

    // 验证 emit 'export' 事件
    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({
      filename: 'kpi_dashboard.png',
      type: 'png',
      pixelRatio: 3,
    });
  });

  it('5. 自定义 #toolbar 插槽测试：可完全覆盖或替换工具栏操作按钮', async () => {
    wrapper = mount(AtengECharts, {
      props: {
        option: defaultOption,
      },
      slots: {
        toolbar: `
          <template #toolbar="{ isFullscreen, toggleFullscreen, exportImage }">
            <button class="custom-fs-btn" @click="toggleFullscreen('page')">
              {{ isFullscreen ? '退出' : '自定义放大' }}
            </button>
          </template>
        `,
      },
    });

    await nextTick();
    expect(wrapper.find('.at-echarts__toolbar').exists()).toBe(true);
    const customBtn = wrapper.find('.custom-fs-btn');
    expect(customBtn.exists()).toBe(true);
    expect(customBtn.text()).toBe('自定义放大');

    await customBtn.trigger('click');
    await nextTick();
    expect(customBtn.text()).toBe('退出');
  });

  it('6. 确定性生命周期与监听器解绑测试：组件卸载后安全移除事件监听', () => {
    const removeDocSpy = vi.spyOn(document, 'removeEventListener');
    const removeWinSpy = vi.spyOn(window, 'removeEventListener');

    wrapper = mount(AtengECharts, {
      props: {
        option: defaultOption,
        allowFullscreen: true,
      },
    });

    wrapper.unmount();
    wrapper = null;

    expect(removeDocSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
    expect(removeWinSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

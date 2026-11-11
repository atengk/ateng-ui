/**
 * AtengMapToolbar 组件单元测试。
 *
 * 遵循三铁律与组件生命周期规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapToolbar from '../src/components/AtengMapToolbar.vue';
import type { AtengMapToolbarInstance, MapDriverAdapter } from '../src/types';

describe('AtengMapToolbar 组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const mockDriver: MapDriverAdapter = {
    engineName: 'leaflet',
    init: vi.fn(),
    destroy: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    addMarker: vi.fn(),
    removeMarker: vi.fn(),
    clearMarkers: vi.fn(),
    invalidateSize: vi.fn(),
    getRawInstance: vi.fn(() => ({
      getZoom: vi.fn(() => 12),
      setZoom: vi.fn(),
      panTo: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
    })),
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('成功挂载并渲染默认操作按钮组', () => {
    wrapper = mount(AtengMapToolbar, {
      props: {
        driver: mockDriver,
      },
    });

    expect(wrapper.find('.at-map-toolbar').exists()).toBe(true);
    expect(wrapper.findAll('.at-map-toolbar-btn').length).toBeGreaterThan(3);
  });

  it('支持自定义 actions 筛选按钮', () => {
    wrapper = mount(AtengMapToolbar, {
      props: {
        driver: mockDriver,
        actions: ['zoomIn', 'zoomOut', 'reset'],
      },
    });

    const buttons = wrapper.findAll('.at-map-toolbar-btn');
    expect(buttons.length).toBe(3);
  });

  it('支持切换测量模式并暴露实例方法', async () => {
    wrapper = mount(AtengMapToolbar, {
      props: {
        driver: mockDriver,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapToolbarInstance;
    expect(vm.measureMode).toBe('none');

    vm.setMeasureMode('distance');
    expect(vm.measureMode).toBe('distance');

    vm.setMeasureMode('area');
    expect(vm.measureMode).toBe('area');

    vm.clearMeasurement();
    expect(vm.measureMode).toBe('none');
  });

  it('触发 reset 操作时调用 driver.setCenter 与 driver.setZoom', async () => {
    wrapper = mount(AtengMapToolbar, {
      props: {
        driver: mockDriver,
        defaultCenter: { lng: 116.4, lat: 39.9 },
        defaultZoom: 14,
      },
    });

    const resetBtn = wrapper.find('[data-action="reset"]');
    if (resetBtn.exists()) {
      await resetBtn.trigger('click');
      expect(mockDriver.setCenter).toHaveBeenCalled();
      expect(mockDriver.setZoom).toHaveBeenCalledWith(14);
    }
  });
});

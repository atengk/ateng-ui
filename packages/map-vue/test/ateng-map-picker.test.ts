/**
 * AtengMapPicker 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapPicker from '../src/components/AtengMapPicker.vue';
import type { MapCoordinate, GeocodeResult } from '../src/types';

describe('AtengMapPicker 表现容器单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应当正确挂载并渲染搜索栏、地图容器与操作底栏', () => {
    const wrapper = mount(AtengMapPicker, {
      props: {
        defaultCenter: { lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' },
      },
    });

    expect(wrapper.classes()).toContain('at-map-picker');
    expect(wrapper.find('.at-map-picker__header').exists()).toBe(true);
    expect(wrapper.find('.at-map-picker__body').exists()).toBe(true);
    expect(wrapper.find('.at-map-picker__footer').exists()).toBe(true);
    expect(wrapper.find('.at-map-picker__input').exists()).toBe(true);

    wrapper.unmount();
  });

  it('应当支持切换选点模式并在 crosshair 模式下渲染中心准星靶标', async () => {
    const wrapper = mount(AtengMapPicker, {
      props: {
        mode: 'marker',
      },
    });

    // 初始 marker 模式，不显示十字准星
    expect(wrapper.find('.at-map-picker__crosshair').exists()).toBe(false);

    // 切换至 crosshair 模式
    const crosshairBtn = wrapper.findAll('.at-map-picker__mode-btn')[1];
    expect(crosshairBtn).toBeDefined();
    await crosshairBtn?.trigger('click');

    expect(wrapper.find('.at-map-picker__crosshair').exists()).toBe(true);

    wrapper.unmount();
  });

  it('应当支持关键词输入检索并下拉展示候选项', async () => {
    const mockProvider = vi.fn().mockResolvedValue([
      {
        coordinate: { lng: 116.3972, lat: 39.9181, coordType: 'GCJ02' },
        formattedAddress: '北京市东城区故宫博物院',
        poiName: '故宫博物院',
      } as GeocodeResult,
    ]);

    const wrapper = mount(AtengMapPicker, {
      props: {
        geocodeProvider: mockProvider,
        searchDebounceMs: 10,
      },
    });

    const input = wrapper.find<HTMLInputElement>('.at-map-picker__input');
    await input.setValue('故宫');

    // 模拟等待防抖执行
    await new Promise(resolve => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    const dropdown = wrapper.find('.at-map-picker__dropdown');
    expect(dropdown.exists()).toBe(true);

    const items = wrapper.findAll('.at-map-picker__dropdown-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.text()).toContain('故宫博物院');

    // 点击候选项
    await items[0]?.trigger('click');
    expect(wrapper.emitted('change')).toBeTruthy();

    wrapper.unmount();
  });

  it('应当支持点击确认按钮派发 confirm 事件与 PickerResult 载荷', async () => {
    const coord: MapCoordinate = { lng: 121.4997, lat: 31.2397, coordType: 'GCJ02' };
    const wrapper = mount(AtengMapPicker, {
      props: {
        modelValue: coord,
      },
    });

    const confirmBtn = wrapper.find('.at-map-picker__confirm-btn');
    expect(confirmBtn.exists()).toBe(true);

    await confirmBtn.trigger('click');

    const confirmEvents = wrapper.emitted('confirm');
    expect(confirmEvents).toBeTruthy();
    expect(confirmEvents?.length).toBe(1);

    const payload = confirmEvents?.[0]?.[0] as { coordinate: MapCoordinate };
    expect(payload.coordinate.lng).toBeCloseTo(121.4997, 4);
    expect(payload.coordinate.lat).toBeCloseTo(31.2397, 4);

    wrapper.unmount();
  });

  it('应当通过 defineExpose 暴露完备的实例方法与状态', () => {
    const wrapper = mount(AtengMapPicker);
    const exposed = wrapper.vm as unknown as Record<string, unknown>;

    expect(exposed.selectedCoord).toBeDefined();
    expect(typeof exposed.setMode).toBe('function');
    expect(typeof exposed.pickCoord).toBe('function');
    expect(typeof exposed.search).toBe('function');
    expect(typeof exposed.getPickerResult).toBe('function');
    expect(typeof exposed.reset).toBe('function');

    wrapper.unmount();
  });
});

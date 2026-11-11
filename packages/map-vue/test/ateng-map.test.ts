/**
 * AtengMap 核心表现容器组件集成测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { AtengMap, TilePreset, type MapMarker } from '../src';

describe('AtengMap 核心表现容器组件', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    // 严格遵循 ADR-0008，在 afterEach 中 unmount 并清理残留 DOM
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('应当正常挂载渲染容器并派发 ready 事件', async () => {
    const onReady = vi.fn();

    wrapper = mount(AtengMap, {
      props: {
        center: { lng: 116.4074, lat: 39.9042 },
        zoom: 12,
        tilePreset: TilePreset.OSM,
        onReady,
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('at-map-container');
    const viewport = wrapper.find('.at-map-viewport');
    expect(viewport.exists()).toBe(true);
    expect(onReady).toHaveBeenCalled();
  });

  it('应当正确响应与暴露实例命令式方法 (defineExpose)', async () => {
    wrapper = mount(AtengMap, {
      props: {
        center: { lng: 116.4, lat: 39.9 },
        zoom: 10,
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any;
    expect(typeof vm.panTo).toBe('function');
    expect(typeof vm.setZoom).toBe('function');
    expect(typeof vm.addMarker).toBe('function');
    expect(typeof vm.removeMarker).toBe('function');
    expect(typeof vm.invalidateSize).toBe('function');
    expect(typeof vm.getRawMapInstance).toBe('function');
    expect(vm.getRawMapInstance()).toBeDefined();

    vm.setCenter({ lng: 116.5, lat: 39.8 }, false);
    vm.setZoom(14, false);
    vm.invalidateSize();
  });

  it('应当支持通过 props.markers 初始化与动态同步标记点', async () => {
    const initialMarkers: MapMarker[] = [
      { id: '1', coordinate: { lng: 116.4, lat: 39.9 }, title: 'A' },
      { id: '2', coordinate: { lng: 116.5, lat: 39.8 }, title: 'B' },
    ];

    wrapper = mount(AtengMap, {
      props: {
        markers: initialMarkers,
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    // 动态增量更新 markers
    await wrapper.setProps({
      markers: [{ id: '3', coordinate: { lng: 116.6, lat: 39.7 }, title: 'C' }],
    });
  });

  it('应当支持插槽反转定制默认内容与微工具栏', () => {
    wrapper = mount(AtengMap, {
      slots: {
        default: '<div class="custom-layer">自定义图层</div>',
        toolbar: '<div class="custom-toolbar">自定义工具条</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.custom-layer').exists()).toBe(true);
    expect(wrapper.find('.custom-toolbar').exists()).toBe(true);
  });
});

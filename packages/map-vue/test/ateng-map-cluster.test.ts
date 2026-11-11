/**
 * AtengMapCluster 组件单元测试。
 *
 * 遵循三铁律与组件生命周期规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapCluster from '../src/components/AtengMapCluster.vue';
import type { AtengMapClusterInstance, ClusterMarker } from '../src/types';

describe('AtengMapCluster 组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const mockMarkers: ClusterMarker[] = [
    { id: 1, coordinate: { lng: 116.4074, lat: 39.9042 }, title: '天安门' },
    { id: 2, coordinate: { lng: 116.4084, lat: 39.9045 }, title: '天安门东' },
    { id: 3, coordinate: { lng: 116.4174, lat: 39.9142 }, title: '王府井' },
  ];

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('成功挂载并渲染聚合容器', () => {
    wrapper = mount(AtengMapCluster, {
      props: {
        markers: mockMarkers,
        height: '400px',
      },
    });

    expect(wrapper.find('.at-map-cluster-container').exists()).toBe(true);
  });

  it('支持切换至 canvas 模式', () => {
    wrapper = mount(AtengMapCluster, {
      props: {
        markers: mockMarkers,
        renderMode: 'canvas',
      },
    });

    expect(wrapper.find('.at-map-cluster-canvas').exists()).toBe(true);
  });

  it('暴露 clusters 列表与 refresh 实例方法', () => {
    wrapper = mount(AtengMapCluster, {
      props: {
        markers: mockMarkers,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapClusterInstance;
    expect(vm.clusters).toBeDefined();
    expect(typeof vm.refresh).toBe('function');
  });
});

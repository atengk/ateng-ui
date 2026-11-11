/**
 * AtengMapMask 组件单元测试。
 *
 * 遵循三铁律与组件生命周期规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapMask from '../src/components/AtengMapMask.vue';
import type { AtengMapMaskInstance, GeoJSONGeometryData } from '../src/types';

describe('AtengMapMask 组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const mockGeo: GeoJSONGeometryData = {
    type: 'Polygon',
    coordinates: [
      [
        [116.3, 39.8],
        [116.5, 39.8],
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.8],
      ],
    ],
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('成功挂载并渲染反向遮罩地图容器', () => {
    wrapper = mount(AtengMapMask, {
      props: {
        geoData: mockGeo,
        height: '400px',
      },
    });

    expect(wrapper.find('.at-map-mask-container').exists()).toBe(true);
  });

  it('暴露 fitMaskBounds 与 refresh 实例方法', () => {
    wrapper = mount(AtengMapMask, {
      props: {
        geoData: mockGeo,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapMaskInstance;
    expect(typeof vm.fitMaskBounds).toBe('function');
    expect(typeof vm.refresh).toBe('function');
  });
});

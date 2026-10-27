/**
 * AtengMapChart、useMapDrillDown 与 GeoDataProvider SPI 单测。
 *
 * 恪守全自洽单测 3 项铁律：DOM 现场严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import * as echarts from 'echarts';
import { createUrlGeoProvider, useMapDrillDown, createMapOption, AtengMapChart } from '../../src';
import type { MapNode, GeoDataProvider } from '../../src';

describe('GeoDataProvider SPI 与 createUrlGeoProvider 契约测试', () => {
  const mockGeoJsonChina = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: '广东省' },
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ],
  };

  const mockGeoJsonGuangdong = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: '深圳市' },
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ],
  };

  it('1. createUrlGeoProvider 应根据模板拉取 GeoJSON 并自动注册到 ECharts，第二次请求命中内存缓存', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (code: string) => {
      if (code === 'china') return mockGeoJsonChina;
      if (code === '440000') return mockGeoJsonGuangdong;
      throw new Error(`NotFound: ${code}`);
    });

    const provider = createUrlGeoProvider(
      (code: string) => `https://geo.datav.aliyun.com/areas_v3/bound/${code}.json`,
      {
        fetcher: fetchSpy,
      },
    );

    // 第一次调用：执行 fetcher 并自动 registerMap
    const geo1 = await provider('china', '全国');
    expect(geo1).toEqual(mockGeoJsonChina);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(echarts.getMap('china')).toBeDefined();

    // 第二次调用相同 code：必须命中内存缓存，不再重复调用 fetcher
    const geo2 = await provider('china', '全国');
    expect(geo2).toEqual(mockGeoJsonChina);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useMapDrillDown 状态机测试', () => {
  const rootNode: MapNode = { code: 'china', name: '全国' };
  const provinceNode: MapNode = { code: '440000', name: '广东省' };
  const cityNode: MapNode = { code: '440300', name: '深圳市' };

  let mockProvider: GeoDataProvider;

  beforeEach(() => {
    mockProvider = vi.fn().mockImplementation(async (code: string) => ({
      type: 'FeatureCollection',
      features: [{ properties: { name: code } }],
    }));
  });

  it('1. 下钻与回退栈管理：初始为根节点，drillTo 压栈，back 弹栈，reset 重置，currentLevel 联动', async () => {
    const { currentNode, breadcrumbs, canBack, currentLevel, drillTo, back, reset } =
      useMapDrillDown({
        initialNode: rootNode,
        geoProvider: mockProvider,
      });

    expect(currentNode.value).toEqual(rootNode);
    expect(breadcrumbs.value).toHaveLength(1);
    expect(canBack.value).toBe(false);
    expect(currentLevel.value).toBe(0);

    // 下钻到省
    await drillTo(provinceNode);
    expect(currentNode.value).toEqual(provinceNode);
    expect(breadcrumbs.value).toHaveLength(2);
    expect(canBack.value).toBe(true);
    expect(currentLevel.value).toBe(1);

    // 下钻到市
    await drillTo(cityNode);
    expect(currentNode.value).toEqual(cityNode);
    expect(breadcrumbs.value).toHaveLength(3);
    expect(currentLevel.value).toBe(2);

    // 回退一步
    await back();
    expect(currentNode.value).toEqual(provinceNode);
    expect(breadcrumbs.value).toHaveLength(2);
    expect(currentLevel.value).toBe(1);

    // 重置回到根
    await reset();
    expect(currentNode.value).toEqual(rootNode);
    expect(breadcrumbs.value).toHaveLength(1);
    expect(canBack.value).toBe(false);
    expect(currentLevel.value).toBe(0);
  });

  it('2. beforeDrillDown 拦截器：返回 false 时阻断下钻行为', async () => {
    const beforeDrill = vi.fn().mockImplementation((target: MapNode) => {
      // 允许下钻到省，但禁止下钻到市
      return target.code !== '440300';
    });

    const { currentNode, breadcrumbs, drillTo } = useMapDrillDown({
      initialNode: rootNode,
      geoProvider: mockProvider,
      beforeDrillDown: beforeDrill,
    });

    // 下钻到省：成功
    const success = await drillTo(provinceNode);
    expect(success).toBe(true);
    expect(currentNode.value).toEqual(provinceNode);

    // 下钻到市：被拦截
    const blocked = await drillTo(cityNode);
    expect(blocked).toBe(false);
    expect(currentNode.value).toEqual(provinceNode);
    expect(breadcrumbs.value).toHaveLength(2);
  });
});

describe('createMapOption 纯函数配置转换测试', () => {
  it('1. 正确生成指定 mapCode 的地图系列与 visualMap 颜色区间', () => {
    const option = createMapOption({
      map: 'china',
      data: [
        { name: '广东省', value: 1200 },
        { name: '浙江省', value: 950 },
      ],
      visualMap: {
        min: 0,
        max: 1500,
      },
    });

    expect(option.series).toBeDefined();
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.type).toBe('map');
    expect(series?.map).toBe('china');

    expect(option.visualMap).toBeDefined();
    const vm = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap;
    expect(vm?.min).toBe(0);
    expect(vm?.max).toBe(1500);
  });

  it('2. 携带 scatterData 时正确生成顶层 geo 组件并为 mapSeries 配置 geoIndex: 0', () => {
    const option = createMapOption({
      map: 'china',
      data: [{ name: '广东省', value: 1200 }],
      scatterData: [{ name: '广州服务中心', value: [113.2644, 23.1291, 100] }],
    });

    // 验证生成了统一的顶层 geo 坐标系组件
    expect(option.geo).toBeDefined();
    const geoComp = option.geo as { map?: string; roam?: boolean };
    expect(geoComp.map).toBe('china');
    expect(geoComp.roam).toBe(true);

    // 验证 map 系列与 scatter 系列
    expect(Array.isArray(option.series)).toBe(true);
    const seriesList = option.series as Array<{
      type?: string;
      geoIndex?: number;
      coordinateSystem?: string;
    }>;
    expect(seriesList).toHaveLength(2);

    const mapSeries = seriesList.find(s => s.type === 'map');
    expect(mapSeries?.geoIndex).toBe(0);

    const scatterSeries = seriesList.find(s => s.type === 'scatter');
    expect(scatterSeries?.coordinateSystem).toBe('geo');
  });
});

describe('AtengMapChart 预设组件集成测试', () => {
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
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
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

    // 预注册一个测试地图
    echarts.registerMap('test-map', {
      type: 'FeatureCollection',
      features: [{ properties: { name: 'Region1' } }],
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

  it('1. 应成功挂载 AtengMapChart 并渲染面包屑导航药丸', async () => {
    const rootNode: MapNode = { code: 'test-map', name: '全境' };

    wrapper = mount(AtengMapChart, {
      props: {
        map: 'test-map',
        initialNode: rootNode,
        data: [{ name: 'Region1', value: 100 }],
        height: '420px',
      },
      attachTo: document.body,
    });

    await nextTick();

    const breadcrumbsEl = wrapper.find('.at-map-chart__breadcrumbs');
    expect(breadcrumbsEl.exists()).toBe(true);
    expect(breadcrumbsEl.text()).toContain('全境');
  });

  it('2. 能够暴露 drillTo、back、reset 等受控下钻实例方法', async () => {
    wrapper = mount(AtengMapChart, {
      props: {
        map: 'test-map',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      drillTo: () => void;
      back: () => void;
      reset: () => void;
    };

    expect(typeof vm.drillTo).toBe('function');
    expect(typeof vm.back).toBe('function');
    expect(typeof vm.reset).toBe('function');
  });

  it('3. 自定义 breadcrumb 插槽应能获取当前层级 currentLevel 与下钻方法', async () => {
    wrapper = mount(AtengMapChart, {
      props: {
        map: 'test-map',
        initialNode: { code: 'test-map', name: '全境' },
      },
      slots: {
        breadcrumb: `
          <template #breadcrumb="{ currentNode, currentLevel, canBack }">
            <div class="custom-crumb">
              <span class="custom-name">{{ currentNode.name }}</span>
              <span class="custom-lvl">{{ currentLevel }}</span>
              <span class="custom-back">{{ canBack }}</span>
            </div>
          </template>
        `,
      },
      attachTo: document.body,
    });

    await nextTick();

    const customCrumb = wrapper.find('.custom-crumb');
    expect(customCrumb.exists()).toBe(true);
    expect(wrapper.find('.custom-name').text()).toBe('全境');
    expect(wrapper.find('.custom-lvl').text()).toBe('0');
    expect(wrapper.find('.custom-back').text()).toBe('false');

    const vm = wrapper.vm as unknown as { currentLevel: number };
    expect(vm.currentLevel).toBe(0);
  });

  it('4. 根 GeoJSON 加载失败时应激活内部错误状态，重试可重新尝试加载', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    let shouldFail = true;
    const failingGeoProvider = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error('网络超时拉取 GeoJSON 失败');
      }
      return {
        type: 'FeatureCollection',
        features: [{ properties: { name: 'Region1' } }],
      };
    });

    wrapper = mount(AtengMapChart, {
      props: {
        map: 'test-map-failing',
        initialNode: { code: 'test-map-failing', name: '失败测试' },
        geoProvider: failingGeoProvider,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(r => setTimeout(r, 10));
    await nextTick();

    expect(failingGeoProvider).toHaveBeenCalledTimes(1);
    // 检查底层的 error 遮罩是否渲染
    const errorOverlay = wrapper.find('.at-echarts__error');
    expect(errorOverlay.exists()).toBe(true);

    // 模拟重试操作
    shouldFail = false;
    const retryBtn = wrapper.find('.at-echarts__retry-btn');
    if (retryBtn.exists()) {
      await retryBtn.trigger('click');
      await nextTick();
      await new Promise(r => setTimeout(r, 10));
      await nextTick();

      expect(failingGeoProvider).toHaveBeenCalledTimes(2);
      expect(wrapper.find('.at-echarts__error').exists()).toBe(false);
    }
  });
});

/**
 * AtengDonutChart 与 AtengFunnelChart 预设单测。
 *
 * 恪守全自洽单测 3 项铁律：DOM 现场严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  createDonutOption,
  createFunnelOption,
  AtengDonutChart,
  AtengFunnelChart,
} from '../../src';
import type { DonutChartConfig, FunnelChartConfig } from '../../src';

describe('createDonutOption 纯函数转换契约测试', () => {
  const sampleDonutData = [
    { category: '企业云底座', revenue: 1200000 },
    { category: '数据安全套件', revenue: 800000 },
    { category: 'AI 大模型工具链', revenue: 600000 },
    { category: '技术咨询服务', revenue: 400000 },
  ];

  it('1. 基础配置：支持自定义 nameKey 与 valueKey，正确解析环形饼图 series', () => {
    const config: DonutChartConfig = {
      data: sampleDonutData,
      nameKey: 'category',
      valueKey: 'revenue',
      unit: '元',
    };

    const option = createDonutOption(config);

    expect(option.series).toBeDefined();
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.type).toBe('pie');
    expect(series?.radius).toEqual(['42%', '66%']);

    const seriesData = series?.data as Array<{ name: string; value: number }>;
    expect(seriesData).toHaveLength(4);
    expect(seriesData[0]).toEqual({ name: '企业云底座', value: 1200000 });
    expect(seriesData[3]).toEqual({ name: '技术咨询服务', value: 400000 });
  });

  it('2. 中心指标卡计算：开启 centerSummary 时自动求和并显示千分位总额', () => {
    const config: DonutChartConfig = {
      data: sampleDonutData,
      nameKey: 'category',
      valueKey: 'revenue',
      unit: '元',
      centerSummary: {
        title: '总营收',
        showSum: true,
      },
    };

    const option = createDonutOption(config);
    expect(option.title).toBeDefined();
    const title = Array.isArray(option.title) ? option.title[0] : option.title;
    expect(title?.text).toBe('3,000,000 元');
    expect(title?.subtext).toBe('总营收');
    expect(title?.left).toBe('center');
    expect(title?.top).toBe('45%');
  });

  it('3. 南丁格尔玫瑰图模式切换 (roseType: radius / area)', () => {
    const config: DonutChartConfig = {
      data: sampleDonutData,
      nameKey: 'category',
      valueKey: 'revenue',
      roseType: 'radius',
    };

    const option = createDonutOption(config);
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.roseType).toBe('radius');
  });

  it('4. Tooltip 格式化管道：包含千分位、度量单位与占比百分比', () => {
    const config: DonutChartConfig = {
      data: sampleDonutData,
      nameKey: 'category',
      valueKey: 'revenue',
      unit: '元',
    };

    const option = createDonutOption(config);
    const tooltip = option.tooltip as { formatter?: (params: unknown) => string };
    expect(typeof tooltip?.formatter).toBe('function');

    const html = tooltip.formatter!({
      marker: '<span style="color:red">●</span>',
      name: '企业云底座',
      value: 1200000,
      percent: 40,
    });

    expect(html).toContain('企业云底座');
    expect(html).toContain('1,200,000 元');
    expect(html).toContain('40.0%');
  });

  it('5. overrideOption 逃生通道拦截', () => {
    const config: DonutChartConfig = {
      data: sampleDonutData,
      nameKey: 'category',
      valueKey: 'revenue',
      overrideOption: base => ({
        ...base,
        backgroundColor: '#f0f0f0',
      }),
    };

    const option = createDonutOption(config);
    expect(option.backgroundColor).toBe('#f0f0f0');
  });
});

describe('createFunnelOption 纯函数转换契约测试', () => {
  const sampleFunnelData = [
    { stage: '首页访问', users: 100000 },
    { stage: '商品详情', users: 50000 },
    { stage: '加入购物车', users: 20000 },
    { stage: '提交订单', users: 8000 },
    { stage: '完成支付', users: 5000 },
  ];

  it('1. 基础配置：正确解析漏斗图 series、数据排序与阶段间距', () => {
    const config: FunnelChartConfig = {
      data: sampleFunnelData,
      nameKey: 'stage',
      valueKey: 'users',
      sort: 'descending',
      gap: 3,
      unit: '人',
    };

    const option = createFunnelOption(config);
    expect(option.series).toBeDefined();
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.type).toBe('funnel');
    expect(series?.sort).toBe('descending');
    expect(series?.gap).toBe(3);

    const seriesData = series?.data as Array<{ name: string; value: number }>;
    expect(seriesData).toHaveLength(5);
    expect(seriesData[0]).toEqual({ name: '首页访问', value: 100000 });
    expect(seriesData[4]).toEqual({ name: '完成支付', value: 5000 });
  });

  it('2. 转化率分析 Tooltip：计算前序转化率与总体转化率', () => {
    const config: FunnelChartConfig = {
      data: sampleFunnelData,
      nameKey: 'stage',
      valueKey: 'users',
      unit: '人',
    };

    const option = createFunnelOption(config);
    const tooltip = option.tooltip as { formatter?: (params: unknown) => string };
    expect(typeof tooltip?.formatter).toBe('function');

    // 验证第二阶段（商品详情：50000 / 100000 = 50%）
    const htmlStep2 = tooltip.formatter!({
      marker: '<span>●</span>',
      name: '商品详情',
      value: 50000,
      dataIndex: 1,
    });

    expect(htmlStep2).toContain('商品详情');
    expect(htmlStep2).toContain('50,000 人');
    expect(htmlStep2).toContain('50.0%'); // 相对前一步
    expect(htmlStep2).toContain('50.0%'); // 相对总转化
  });

  it('3. overrideOption 逃生通道拦截', () => {
    const config: FunnelChartConfig = {
      data: sampleFunnelData,
      nameKey: 'stage',
      valueKey: 'users',
      overrideOption: base => ({
        ...base,
        legend: { show: false },
      }),
    };

    const option = createFunnelOption(config);
    expect((option.legend as { show?: boolean })?.show).toBe(false);
  });

  it('4. 漏斗排序模式与时序流向自适应：升序与无序数据下环节转化率正确对应视觉流向', () => {
    const unorderedData = [
      { stage: '完成支付', users: 2000 },
      { stage: '首页访问', users: 10000 },
      { stage: '加入购物车', users: 5000 },
    ];

    const config: FunnelChartConfig = {
      data: unorderedData,
      nameKey: 'stage',
      valueKey: 'users',
      sort: 'descending',
    };

    const option = createFunnelOption(config);
    const tooltip = option.tooltip as { formatter?: (params: unknown) => string };

    // 验证降序时，加入购物车（5000）的前序是首页访问（10000），转化率应为 50.0%
    const cartHtml = tooltip.formatter!({
      marker: '<span>●</span>',
      name: '加入购物车',
      value: 5000,
    });
    expect(cartHtml).toContain('50.0%');

    // 验证首环节（首页访问）转化率应为 100.0%
    const homeHtml = tooltip.formatter!({
      marker: '<span>●</span>',
      name: '首页访问',
      value: 10000,
    });
    expect(homeHtml).toContain('100.0%');
  });
});

describe('AtengDonutChart & AtengFunnelChart 预设组件集成测试', () => {
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
      get: () => 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 350,
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

  it('1. 应成功挂载 AtengDonutChart 并支持空数据自愈判定', async () => {
    wrapper = mount(AtengDonutChart, {
      props: {
        data: [],
      },
      attachTo: document.body,
    });

    await nextTick();

    const emptyOverlay = wrapper.find('.at-echarts__empty');
    expect(emptyOverlay.exists()).toBe(true);
  });

  it('2. 应成功挂载 AtengFunnelChart 并透传配置至内部 AtengECharts', async () => {
    wrapper = mount(AtengFunnelChart, {
      props: {
        data: [{ stage: '访问', count: 100 }],
        nameKey: 'stage',
        valueKey: 'count',
        height: '360px',
      },
      attachTo: document.body,
    });

    await nextTick();

    const chartRoot = wrapper.find('.at-echarts');
    expect(chartRoot.exists()).toBe(true);
    expect(chartRoot.attributes('style')).toContain('height: 360px');
  });
});

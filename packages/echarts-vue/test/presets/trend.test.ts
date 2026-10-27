/**
 * AtengTrendChart 与 createTrendOption 预设单测。
 *
 * 恪守全自洽单测 3 项铁律：DOM 现场严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createTrendOption, AtengTrendChart } from '../../src';
import type { TrendChartConfig } from '../../src';

describe('createTrendOption 纯函数转换契约测试', () => {
  const sampleData = [
    { date: '2026-01', revenue: 12000, cost: 8000, profitRate: 33.3 },
    { date: '2026-02', revenue: 15000, cost: 9500, profitRate: 36.7 },
    { date: '2026-03', revenue: 18000, cost: 11000, profitRate: 38.9 },
  ];

  it('1. 基础配置：支持字符串 dimension 与 metrics 数组，正确解析 X 轴与 Series 数据', () => {
    const config: TrendChartConfig = {
      data: sampleData,
      dimension: 'date',
      metrics: ['revenue', 'cost'],
    };

    const option = createTrendOption(config);

    expect(option.xAxis).toBeDefined();
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    expect(xAxis?.type).toBe('category');
    expect(xAxis?.data).toEqual(['2026-01', '2026-02', '2026-03']);

    expect(Array.isArray(option.series)).toBe(true);
    const series = option.series as Array<Record<string, unknown>>;
    expect(series).toHaveLength(2);
    expect(series[0].name).toBe('revenue');
    expect(series[0].type).toBe('line');
    expect(series[0].data).toEqual([12000, 15000, 18000]);
    expect(series[1].name).toBe('cost');
    expect(series[1].data).toEqual([8000, 9500, 11000]);
  });

  it('2. 柱线混合与双 Y 轴配置：度量配置 yAxisIndex: 1 时自动生成左右双 Y 轴', () => {
    const config: TrendChartConfig = {
      data: sampleData,
      dimension: 'date',
      metrics: [
        { key: 'revenue', name: '营业额', type: 'bar', unit: '元' },
        { key: 'profitRate', name: '利润率', type: 'line', yAxisIndex: 1, unit: '%' },
      ],
      yAxis: [
        { name: '金额 (元)', splitLine: true },
        { name: '利润率 (%)', splitLine: false },
      ],
    };

    const option = createTrendOption(config);

    expect(Array.isArray(option.yAxis)).toBe(true);
    const yAxes = option.yAxis as Array<Record<string, unknown>>;
    expect(yAxes).toHaveLength(2);
    expect(yAxes[0].name).toBe('金额 (元)');
    expect(yAxes[1].name).toBe('利润率 (%)');
    expect(yAxes[1].splitLine).toEqual({ show: false });

    const series = option.series as Array<Record<string, unknown>>;
    expect(series[0].type).toBe('bar');
    expect(series[0].yAxisIndex).toBe(0);
    expect(series[1].type).toBe('line');
    expect(series[1].yAxisIndex).toBe(1);
  });

  it('3. 区域平滑渐变、堆叠模式与极值/标线标注解析', () => {
    const config: TrendChartConfig = {
      data: sampleData,
      dimension: 'date',
      metrics: [
        {
          key: 'revenue',
          name: '营收',
          smooth: true,
          area: true,
          stack: 'finance',
          markPoint: 'max',
          markLine: 'average',
        },
      ],
    };

    const option = createTrendOption(config);
    const series = (option.series as Array<Record<string, unknown>>)[0];

    expect(series.smooth).toBe(true);
    expect(series.areaStyle).toBeDefined();
    expect(series.stack).toBe('finance');
    expect(series.markPoint).toBeDefined();
    expect(series.markLine).toBeDefined();
  });

  it('4. DataZoom 缩放手柄受控配置生成', () => {
    const withZoom = createTrendOption({
      data: sampleData,
      dimension: 'date',
      metrics: ['revenue'],
      dataZoom: true,
    });

    expect(withZoom.dataZoom).toBeDefined();
    expect(Array.isArray(withZoom.dataZoom)).toBe(true);
    const zoomList = withZoom.dataZoom as Array<Record<string, unknown>>;
    expect(zoomList.some(z => z.type === 'slider')).toBe(true);
    expect(zoomList.some(z => z.type === 'inside')).toBe(true);

    const customZoom = createTrendOption({
      data: sampleData,
      dimension: 'date',
      metrics: ['revenue'],
      dataZoom: { slider: true, inside: false, start: 20, end: 80 },
    });
    const customZoomList = customZoom.dataZoom as Array<Record<string, unknown>>;
    expect(customZoomList.some(z => z.type === 'inside')).toBe(false);
    expect(customZoomList[0].start).toBe(20);
    expect(customZoomList[0].end).toBe(80);
  });

  it('5. Tooltip 内置格式化管道：千分位与单位格式化生效', () => {
    const config: TrendChartConfig = {
      data: [{ date: '2026-01', revenue: 1234567, rate: 12.345 }],
      dimension: 'date',
      metrics: [
        { key: 'revenue', name: '营收', unit: '元', precision: 0 },
        { key: 'rate', name: '增长率', unit: '%' },
      ],
    };

    const option = createTrendOption(config);
    const tooltip = option.tooltip as { formatter?: (params: unknown[]) => string };
    expect(typeof tooltip?.formatter).toBe('function');

    const formattedHtml = tooltip.formatter!([
      {
        axisValueLabel: '2026-01',
        marker: '<span style="color:red">●</span>',
        seriesName: '营收',
        seriesIndex: 0,
        value: 1234567,
      },
      {
        axisValueLabel: '2026-01',
        marker: '<span style="color:blue">●</span>',
        seriesName: '增长率',
        seriesIndex: 1,
        value: 12.345,
      },
    ]);

    expect(formattedHtml).toContain('2026-01');
    expect(formattedHtml).toContain('1,234,567 元');
    expect(formattedHtml).toContain('12.35 %');
  });

  it('6. overrideOption 逃生通道：允许深度拦截与定制 Option', () => {
    const config: TrendChartConfig = {
      data: sampleData,
      dimension: 'date',
      metrics: ['revenue'],
      overrideOption: base => ({
        ...base,
        title: { text: '定制标题' },
      }),
    };

    const option = createTrendOption(config);
    expect((option.title as Record<string, unknown>)?.text).toBe('定制标题');
  });

  it('7. 防御性空值保底：空数据或缺失字段不崩溃并输出合规结构', () => {
    const emptyConfig: TrendChartConfig = {
      data: [],
      dimension: 'date',
      metrics: ['revenue'],
    };

    const option = createTrendOption(emptyConfig);
    expect(option.series).toHaveLength(1);
    const series = (option.series as Array<Record<string, unknown>>)[0];
    expect(series.data).toEqual([]);
  });
});

describe('AtengTrendChart 预设组件集成测试', () => {
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

  it('1. 应成功挂载 AtengTrendChart 并透传配置至内部 AtengECharts', async () => {
    wrapper = mount(AtengTrendChart, {
      props: {
        data: [
          { month: '1月', sales: 100 },
          { month: '2月', sales: 200 },
        ],
        dimension: 'month',
        metrics: [{ key: 'sales', name: '销量', type: 'line' }],
        height: '400px',
      },
      attachTo: document.body,
    });

    await nextTick();

    const chartRoot = wrapper.find('.at-echarts');
    expect(chartRoot.exists()).toBe(true);
    expect(chartRoot.attributes('style')).toContain('height: 400px');
  });

  it('2. 能够正确触发内部暴露的方法（getInstance、resize、setOption 等）', async () => {
    wrapper = mount(AtengTrendChart, {
      props: {
        data: [{ date: '2026-01', v: 10 }],
        dimension: 'date',
        metrics: ['v'],
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as {
      getInstance: () => unknown;
      resize: () => void;
      setOption: () => void;
    };
    expect(typeof vm.getInstance).toBe('function');
    expect(typeof vm.resize).toBe('function');
    expect(typeof vm.setOption).toBe('function');
  });

  it('3. 插槽正确透传（支持 loading / empty / error 插槽自定义）', async () => {
    wrapper = mount(AtengTrendChart, {
      props: {
        data: [],
        dimension: 'date',
        metrics: ['v'],
        empty: true,
      },
      slots: {
        empty: '<div class="custom-trend-empty">无趋势数据</div>',
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.custom-trend-empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('无趋势数据');
  });
});

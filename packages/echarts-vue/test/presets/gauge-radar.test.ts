/**
 * AtengGaugeChart 与 AtengRadarChart 预设单测。
 *
 * 恪守全自洽单测 3 项铁律：DOM 现场严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createGaugeOption, createRadarOption, AtengGaugeChart, AtengRadarChart } from '../../src';
import type { GaugeChartConfig, RadarChartConfig } from '../../src';

describe('createGaugeOption 纯函数转换契约测试', () => {
  it('1. 基础配置：支持数值与标题，正确生成仪表盘 series 与刻度范围', () => {
    const config: GaugeChartConfig = {
      value: 78.5,
      name: '年度目标完成率',
      min: 0,
      max: 100,
      unit: '%',
    };

    const option = createGaugeOption(config);

    expect(option.series).toBeDefined();
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.type).toBe('gauge');
    expect(series?.min).toBe(0);
    expect(series?.max).toBe(100);

    const seriesData = series?.data as Array<{ name: string; value: number }>;
    expect(seriesData).toHaveLength(1);
    expect(seriesData[0]).toEqual({ name: '年度目标完成率', value: 78.5 });
  });

  it('2. 多段阈值色阶与进度条模式配置', () => {
    const config: GaugeChartConfig = {
      value: 85,
      name: '安全评分',
      thresholds: [
        { value: 60, color: '#F56C6C' },
        { value: 80, color: '#E6A23C' },
        { value: 100, color: '#67C23A' },
      ],
      progress: true,
    };

    const option = createGaugeOption(config);
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.progress).toBeDefined();
    expect((series?.progress as { show?: boolean })?.show).toBe(true);

    const axisLine = series?.axisLine as { lineStyle?: { color?: [number, string][] } };
    expect(axisLine?.lineStyle?.color).toBeDefined();
    expect(axisLine?.lineStyle?.color).toEqual([
      [0.6, '#F56C6C'],
      [0.8, '#E6A23C'],
      [1, '#67C23A'],
    ]);
  });

  it('3. overrideOption 逃生通道拦截', () => {
    const config: GaugeChartConfig = {
      value: 90,
      overrideOption: base => ({
        ...base,
        backgroundColor: '#fafafa',
      }),
    };

    const option = createGaugeOption(config);
    expect(option.backgroundColor).toBe('#fafafa');
  });

  it('4. 极值标注：正确生成 Min/Max 两端刻度极值标注', () => {
    const config: GaugeChartConfig = {
      value: 75,
      min: 10,
      max: 90,
      showExtremities: true,
      extremities: {
        minLabel: '最低 10分',
        maxLabel: '最高 90分',
      },
    };

    const option = createGaugeOption(config);
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    const axisLabel = series?.axisLabel as { formatter?: (val: number) => string };
    expect(typeof axisLabel?.formatter).toBe('function');

    expect(axisLabel.formatter!(10)).toBe('最低 10分');
    expect(axisLabel.formatter!(90)).toBe('最高 90分');
    expect(axisLabel.formatter!(50)).toBe('50');
  });

  it('5. 双模自适应动态空间编排：指针模式大数字避让沉降，无指针模式居中对齐', () => {
    // 指针模式 (默认 pointer: true)
    const pointerOption = createGaugeOption({ value: 65, pointer: true });
    const pointerSeries = Array.isArray(pointerOption.series)
      ? pointerOption.series[0]
      : pointerOption.series;
    const pointerDetail = pointerSeries?.detail as {
      offsetCenter?: [number | string, number | string];
    };
    const pointerTitle = pointerSeries?.title as {
      offsetCenter?: [number | string, number | string];
    };
    expect(pointerDetail.offsetCenter).toEqual([0, '42%']);
    expect(pointerTitle.offsetCenter).toEqual([0, '68%']);

    // 纯环形进度条模式 (pointer: false)
    const ringOption = createGaugeOption({ value: 65, pointer: false, progress: true });
    const ringSeries = Array.isArray(ringOption.series) ? ringOption.series[0] : ringOption.series;
    const ringDetail = ringSeries?.detail as { offsetCenter?: [number | string, number | string] };
    const ringTitle = ringSeries?.title as { offsetCenter?: [number | string, number | string] };
    expect(ringDetail.offsetCenter).toEqual([0, '-5%']);
    expect(ringTitle.offsetCenter).toEqual([0, '25%']);

    // 刻度文字呼吸空间与对比度
    const axisLabel = ringSeries?.axisLabel as {
      distance?: number;
      color?: string;
      fontSize?: number;
    };
    expect(axisLabel.distance).toBe(26);
    expect(axisLabel.color).toBe('#4E5969');
    expect(axisLabel.fontSize).toBe(12);
  });
});

describe('createRadarOption 纯函数转换契约测试', () => {
  const sampleIndicators = [
    { name: '代码质量', max: 100 },
    { name: '架构设计', max: 100 },
    { name: '自动化测试', max: 100 },
    { name: '持续交付', max: 100 },
    { name: '文档覆盖率', max: 100 },
  ];

  const sampleRadarData = [
    { name: '团队当前水准', value: [85, 90, 80, 75, 95] },
    { name: '业界标杆水准', value: [95, 95, 90, 90, 90] },
  ];

  it('1. 基础配置：支持多指标维度与多数据集对比，正确生成 radar 坐标系与 series', () => {
    const config: RadarChartConfig = {
      indicators: sampleIndicators,
      data: sampleRadarData,
      area: true,
    };

    const option = createRadarOption(config);

    expect(option.radar).toBeDefined();
    const radar = Array.isArray(option.radar) ? option.radar[0] : option.radar;
    expect(radar?.indicator).toEqual(sampleIndicators);

    expect(option.series).toBeDefined();
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    expect(series?.type).toBe('radar');

    const seriesData = series?.data as Array<{
      name: string;
      value: number[];
      areaStyle?: unknown;
    }>;
    expect(seriesData).toHaveLength(2);
    expect(seriesData[0].name).toBe('团队当前水准');
    expect(seriesData[0].value).toEqual([85, 90, 80, 75, 95]);
    expect(seriesData[0].areaStyle).toBeDefined();
  });

  it('2. 字符串维度简写：自动根据数据源最大值自适应计算各轴上限', () => {
    const config: RadarChartConfig = {
      indicators: ['维度A', '维度B', '维度C'],
      data: [
        { name: '样本1', value: [40, 60, 80] },
        { name: '样本2', value: [30, 90, 50] },
      ],
    };

    const option = createRadarOption(config);
    const radar = Array.isArray(option.radar) ? option.radar[0] : option.radar;
    const indicators = radar?.indicator as Array<{ name: string; max?: number }>;
    expect(indicators).toHaveLength(3);
    expect(indicators[0].name).toBe('维度A');
    expect(indicators[1].max).toBeGreaterThanOrEqual(90);
  });

  it('3. overrideOption 逃生通道拦截', () => {
    const config: RadarChartConfig = {
      indicators: sampleIndicators,
      data: sampleRadarData,
      overrideOption: base => ({
        ...base,
        title: { text: '综合能力雷达评估' },
      }),
    };

    const option = createRadarOption(config);
    expect((option.title as { text?: string })?.text).toBe('综合能力雷达评估');
  });

  it('4. 半透明渐变区域填充：当设置 item.color 时应自动构建 LinearGradient', () => {
    const config: RadarChartConfig = {
      indicators: sampleIndicators,
      data: [{ name: '渐变序列', value: [80, 90, 85, 70, 95], color: '#409EFF' }],
      area: true,
    };

    const option = createRadarOption(config);
    const series = Array.isArray(option.series) ? option.series[0] : option.series;
    const seriesData = series?.data as Array<{
      name: string;
      value: number[];
      areaStyle?: { color?: unknown; opacity?: number };
    }>;

    expect(seriesData[0].areaStyle).toBeDefined();
    expect(seriesData[0].areaStyle?.opacity).toBe(0.3);
    expect(seriesData[0].areaStyle?.color).toBeDefined();
  });
});

describe('AtengGaugeChart & AtengRadarChart 预设组件集成测试', () => {
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

  it('1. 应成功挂载 AtengGaugeChart 并透传配置至底层容器', async () => {
    wrapper = mount(AtengGaugeChart, {
      props: {
        value: 75,
        name: 'CPU 使用率',
        height: '320px',
      },
      attachTo: document.body,
    });

    await nextTick();

    const chartRoot = wrapper.find('.at-echarts');
    expect(chartRoot.exists()).toBe(true);
    expect(chartRoot.attributes('style')).toContain('height: 320px');
  });

  it('2. 应成功挂载 AtengRadarChart 并支持空数据自愈判定', async () => {
    wrapper = mount(AtengRadarChart, {
      props: {
        indicators: ['维度1', '维度2'],
        data: [],
      },
      attachTo: document.body,
    });

    await nextTick();

    const emptyOverlay = wrapper.find('.at-echarts__empty');
    expect(emptyOverlay.exists()).toBe(true);
  });
});

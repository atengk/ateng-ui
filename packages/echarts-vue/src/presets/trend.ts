/**
 * 趋势图看板预设 Option 生成工厂函数。
 *
 * 封装维度与指标提取、双 Y 轴自适配、柱线混合系列装配、区域平滑渐变、
 * 数值千分位 Tooltip 格式化与受控 DataZoom 缩放逻辑。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type {
  EChartsOption,
  SeriesOption,
  YAXisComponentOption,
  XAXisComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
} from 'echarts';
import { formatCurrency } from '@atengk/core';
import type {
  TrendChartConfig,
  TrendDimensionConfig,
  TrendMetricConfig,
  TrendDataZoomConfig,
} from './types';

/**
 * 规范化维度配置为统一对象结构。
 */
function normalizeDimension(dimension: TrendChartConfig['dimension']): TrendDimensionConfig {
  if (typeof dimension === 'string') {
    return { key: dimension };
  }
  return dimension;
}

/**
 * 规范化指标配置列表为统一对象数组。
 */
function normalizeMetrics(metrics: TrendChartConfig['metrics']): TrendMetricConfig[] {
  if (!Array.isArray(metrics)) {
    return [];
  }
  return metrics.map(metric => {
    if (typeof metric === 'string') {
      return {
        key: metric,
        name: metric,
        type: 'line',
        yAxisIndex: 0,
      };
    }
    return {
      ...metric,
      name: metric.name ?? metric.key,
      type: metric.type ?? 'line',
      yAxisIndex: metric.yAxisIndex ?? 0,
    };
  });
}

/**
 * 构建 ECharts MarkPoint 配置。
 */
function resolveMarkPoint(markPoint: TrendMetricConfig['markPoint']) {
  if (!markPoint) return undefined;
  if (markPoint === 'max') {
    return { data: [{ type: 'max' as const, name: '最大值' }] };
  }
  if (markPoint === 'min') {
    return { data: [{ type: 'min' as const, name: '最小值' }] };
  }
  if (markPoint === 'both') {
    return {
      data: [
        { type: 'max' as const, name: '最大值' },
        { type: 'min' as const, name: '最小值' },
      ],
    };
  }
  return markPoint;
}

/**
 * 构建 ECharts MarkLine 配置。
 */
function resolveMarkLine(markLine: TrendMetricConfig['markLine']) {
  if (!markLine) return undefined;
  if (markLine === 'average') {
    return { data: [{ type: 'average' as const, name: '平均值' }] };
  }
  if (markLine === 'max') {
    return { data: [{ type: 'max' as const, name: '最大值' }] };
  }
  if (markLine === 'min') {
    return { data: [{ type: 'min' as const, name: '最小值' }] };
  }
  return markLine;
}

/**
 * 根据业务配置生成工业级 ECharts 趋势对比图 Option 对象。
 *
 * @param config 语义化趋势图配置
 * @returns 标准合法且深度可覆盖的 EChartsOption
 */
export function createTrendOption(config: TrendChartConfig): EChartsOption {
  // 1. 规范化输入数据与字段映射
  const data = Array.isArray(config.data) ? config.data : [];
  const dimConfig = normalizeDimension(config.dimension);
  const metricConfigs = normalizeMetrics(config.metrics);

  // 2. 提取 X 轴类目维度
  const xCategories = data.map(item => {
    const rawVal = item[dimConfig.key];
    return dimConfig.formatter ? dimConfig.formatter(rawVal) : String(rawVal ?? '');
  });

  const xAxis: XAXisComponentOption = {
    type: 'category',
    data: xCategories,
    name: dimConfig.name,
    axisTick: { alignWithLabel: true },
    axisLine: { lineStyle: { color: '#DCDFE6' } },
    axisLabel: { color: '#606266' },
  };

  // 3. 计算双 Y 轴配置
  const hasRightAxis =
    metricConfigs.some(m => m.yAxisIndex === 1) ||
    (Array.isArray(config.yAxis) && config.yAxis.length > 1);

  const leftYConfig = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const leftAxis: YAXisComponentOption = {
    type: 'value',
    name: leftYConfig?.name,
    nameTextStyle: {
      color: '#909399',
      padding: [0, 0, 4, 0],
    },
    min: leftYConfig?.min,
    max: leftYConfig?.max,
    splitLine:
      leftYConfig?.splitLine !== false
        ? { show: true, lineStyle: { type: 'dashed', color: '#EBEEF5' } }
        : { show: false },
    axisLabel: {
      color: '#606266',
      formatter: (val: number) => {
        if (leftYConfig?.formatter) return leftYConfig.formatter(val);
        const unit = leftYConfig?.unit ?? '';
        const precision = Number.isInteger(val) ? 0 : 2;
        return `${formatCurrency(val, { symbol: '', precision })}${unit ? ` ${unit}` : ''}`;
      },
    },
  };

  let yAxis: YAXisComponentOption | YAXisComponentOption[];
  if (hasRightAxis) {
    const rightYConfig = Array.isArray(config.yAxis) ? config.yAxis[1] : undefined;
    const rightAxis: YAXisComponentOption = {
      type: 'value',
      name: rightYConfig?.name,
      nameTextStyle: {
        color: '#909399',
        padding: [0, 0, 4, 0],
      },
      min: rightYConfig?.min,
      max: rightYConfig?.max,
      splitLine: rightYConfig?.splitLine
        ? { show: true, lineStyle: { type: 'dashed', color: '#EBEEF5' } }
        : { show: false },
      axisLabel: {
        color: '#606266',
        formatter: (val: number) => {
          if (rightYConfig?.formatter) return rightYConfig.formatter(val);
          const unit = rightYConfig?.unit ?? '';
          const precision = Number.isInteger(val) ? 0 : 2;
          return `${formatCurrency(val, { symbol: '', precision })}${unit ? ` ${unit}` : ''}`;
        },
      },
    };
    yAxis = [leftAxis, rightAxis];
  } else {
    yAxis = leftAxis;
  }

  // 4. 组装多形态图表系列（折线、柱状、面积渐变、堆叠与极值）
  const series: SeriesOption[] = metricConfigs.map(metric => {
    const seriesValues = data.map(item => item[metric.key] ?? null);
    const isBar = metric.type === 'bar';

    if (isBar) {
      return {
        name: metric.name,
        type: 'bar',
        yAxisIndex: metric.yAxisIndex ?? 0,
        data: seriesValues,
        stack: metric.stack,
        barWidth: metric.barWidth,
        itemStyle: {
          ...(metric.color ? { color: metric.color } : {}),
          ...(metric.barBorderRadius ? { borderRadius: metric.barBorderRadius } : {}),
        },
        markPoint: resolveMarkPoint(metric.markPoint),
        markLine: resolveMarkLine(metric.markLine),
      };
    }

    // 默认折线系列处理
    let areaStyle: Record<string, unknown> | undefined;
    if (metric.area) {
      if (typeof metric.area === 'string') {
        areaStyle = {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: metric.area },
              { offset: 1, color: 'rgba(255, 255, 255, 0.05)' },
            ],
          },
        };
      } else {
        areaStyle = {
          opacity: 0.25,
          ...(metric.color
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: metric.color },
                    { offset: 1, color: 'rgba(255, 255, 255, 0.05)' },
                  ],
                },
              }
            : {}),
        };
      }
    }

    return {
      name: metric.name,
      type: 'line',
      yAxisIndex: metric.yAxisIndex ?? 0,
      data: seriesValues,
      smooth: metric.smooth ?? true,
      stack: metric.stack,
      itemStyle: metric.color ? { color: metric.color } : undefined,
      areaStyle,
      markPoint: resolveMarkPoint(metric.markPoint),
      markLine: resolveMarkLine(metric.markLine),
    };
  });

  // 5. 提示框 Tooltip 格式化管道（内置千分位与度量单位）
  let tooltip: EChartsOption['tooltip'];
  if (config.tooltip !== false) {
    const userTooltip = typeof config.tooltip === 'object' ? config.tooltip : {};
    tooltip = {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#909399' },
      },
      formatter: (params: unknown) => {
        if (userTooltip.formatter) {
          if (typeof userTooltip.formatter === 'function') {
            return (userTooltip.formatter as (p: unknown) => string)(params);
          }
          return userTooltip.formatter;
        }

        if (!Array.isArray(params) || params.length === 0) {
          return '';
        }

        const firstItem = params[0] as Record<string, unknown>;
        const title = String(firstItem.axisValueLabel ?? firstItem.name ?? '');

        const rows = params.map((item: unknown) => {
          const p = item as Record<string, unknown>;
          const sIndex = Number(p.seriesIndex ?? 0);
          const currentMetric = metricConfigs[sIndex];
          const rawVal = p.value;

          let valStr = '-';
          if (rawVal !== null && rawVal !== undefined && !Number.isNaN(Number(rawVal))) {
            const numVal = Number(rawVal);
            if (currentMetric?.formatThousands !== false) {
              const precision = currentMetric?.precision ?? (Number.isInteger(numVal) ? 0 : 2);
              valStr = formatCurrency(numVal, { symbol: '', precision });
            } else if (currentMetric?.precision !== undefined) {
              valStr = numVal.toFixed(currentMetric.precision);
            } else {
              valStr = String(numVal);
            }
          }

          const unitStr = currentMetric?.unit ? ` ${currentMetric.unit}` : '';
          const marker = String(p.marker ?? '');
          const seriesName = String(p.seriesName ?? currentMetric?.name ?? '');

          return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:4px;font-size:13px;line-height:1.5;">
            <span style="display:inline-flex;align-items:center;color:#606266;">${marker}<span>${seriesName}</span></span>
            <span style="font-weight:600;color:#303133;">${valStr}${unitStr}</span>
          </div>`;
        });

        return `<div style="font-size:13px;"><div style="font-weight:600;margin-bottom:6px;color:#303133;">${title}</div>${rows.join('')}</div>`;
      },
      ...userTooltip,
    };
  }

  // 6. 图例控制
  let legend: LegendComponentOption | undefined;
  if (config.legend !== false) {
    legend = {
      show: true,
      top: 8,
      textStyle: { color: '#606266' },
      ...(typeof config.legend === 'object' ? config.legend : {}),
    };
  }

  // 7. DataZoom 缩放手柄受控配置
  const zoomList: DataZoomComponentOption[] = [];
  if (config.dataZoom) {
    const zoomConfig: TrendDataZoomConfig =
      typeof config.dataZoom === 'object' ? config.dataZoom : {};

    if (zoomConfig.slider !== false) {
      zoomList.push({
        type: 'slider',
        show: true,
        start: zoomConfig.start ?? 0,
        end: zoomConfig.end ?? 100,
        bottom: 8,
        height: 22,
      });
    }

    if (zoomConfig.inside !== false) {
      zoomList.push({
        type: 'inside',
        start: zoomConfig.start ?? 0,
        end: zoomConfig.end ?? 100,
      });
    }
  }

  // 8. 默认网格边距（根据坐标轴与图例情况动态分配安全视距，杜绝元素重叠与气泡溢出）
  const hasAxisName = Boolean(
    dimConfig.name ||
    (Array.isArray(config.yAxis)
      ? config.yAxis.some(y => Boolean(y?.name))
      : Boolean(config.yAxis?.name)),
  );
  const hasMarkPoint = metricConfigs.some(m => Boolean(m.markPoint));
  const hasLegend = config.legend !== false;

  let defaultTop = 52;
  if (hasAxisName && hasRightAxis) {
    defaultTop = hasLegend ? 76 : 64;
  } else if (hasAxisName || hasRightAxis) {
    defaultTop = hasLegend ? 68 : 56;
  }

  // 右侧安全视距：双 Y 轴或末端气泡留出防截断视距
  const defaultRight = hasRightAxis ? 36 : hasMarkPoint ? 32 : 16;

  const grid: GridComponentOption = {
    top: defaultTop,
    left: 16,
    right: defaultRight,
    bottom: config.dataZoom ? 52 : 20,
    containLabel: true,
    ...config.grid,
  };

  let baseOption: EChartsOption = {
    grid,
    tooltip,
    legend,
    xAxis,
    yAxis,
    series,
    ...(zoomList.length > 0 ? { dataZoom: zoomList } : {}),
  };

  // 9. 逃生通道深度覆写拦截
  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}

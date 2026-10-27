/**
 * 极值 KPI 达成率仪表盘 Option 生成工厂函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { EChartsOption, GaugeSeriesOption, TooltipComponentOption } from 'echarts';
import { formatCurrency } from '@atengk/core';
import type { GaugeChartConfig } from './types';

/**
 * 根据业务配置生成指标达成率仪表盘 Option 对象。
 *
 * @param config 仪表盘语义化配置
 * @returns 合法且深度可覆盖的 EChartsOption
 */
export function createGaugeOption(config: GaugeChartConfig): EChartsOption {
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const range = max - min > 0 ? max - min : 100;

  // 1. 计算多段色阶阈值
  let lineColors: [number, string][] | undefined = config.colors;
  if (!lineColors && config.thresholds && config.thresholds.length > 0) {
    lineColors = config.thresholds.map(t => {
      const ratio = Math.min(1, Math.max(0, (t.value - min) / range));
      return [Number(ratio.toFixed(2)), t.color];
    });
  }

  // 2. 环形进度条模式与指针
  const progress = config.progress
    ? {
        show: true,
        width:
          typeof config.progress === 'object' && config.progress.width ? config.progress.width : 12,
        roundCap: typeof config.progress === 'object' ? config.progress.roundCap : true,
      }
    : { show: false };

  const pointer =
    config.pointer !== false
      ? {
          show: true,
          width:
            typeof config.pointer === 'object' && config.pointer.width ? config.pointer.width : 6,
          length:
            typeof config.pointer === 'object' && config.pointer.length
              ? config.pointer.length
              : '60%',
        }
      : { show: false };

  // 3. 构建详细指标数值展示
  const detail = {
    valueAnimation: true,
    fontSize: 26,
    fontWeight: 'bold' as const,
    offsetCenter: [0, '70%'],
    color: 'inherit',
    formatter: (val: number) => {
      const precision = config.precision ?? (Number.isInteger(val) ? 0 : 1);
      const valStr =
        config.formatThousands !== false
          ? formatCurrency(val, { symbol: '', precision })
          : String(val);
      const unit = config.unit !== undefined ? config.unit : '%';
      return `${valStr}${unit ? ` ${unit}` : ''}`;
    },
  };

  // 4. 构建提示框
  let tooltip: TooltipComponentOption | undefined;
  if (config.tooltip !== false) {
    const userTooltip = typeof config.tooltip === 'object' ? config.tooltip : {};
    const unitSuffix = config.unit !== undefined ? ` ${config.unit}` : '';
    tooltip = {
      formatter: `{a} <br/>{b} : {c}${unitSuffix}`,
      ...userTooltip,
    };
  }

  // 5. 构建 Gauge 系列
  const series: GaugeSeriesOption = {
    type: 'gauge',
    min,
    max,
    startAngle: config.startAngle ?? 210,
    endAngle: config.endAngle ?? -30,
    progress,
    pointer,
    axisLine: {
      lineStyle: {
        width: 14,
        ...(lineColors ? { color: lineColors } : {}),
      },
    },
    axisTick: { distance: -18, length: 6, lineStyle: { color: '#DCDFE6' } },
    splitLine: { distance: -22, length: 10, lineStyle: { color: '#DCDFE6', width: 2 } },
    axisLabel: { color: '#909399', distance: 20, fontSize: 11 },
    title: { offsetCenter: [0, '95%'], fontSize: 14, color: '#606266' },
    detail,
    data: [{ value: config.value, name: config.name ?? '' }],
  };

  let baseOption: EChartsOption = {
    tooltip,
    series: [series],
  };

  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}

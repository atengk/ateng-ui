/**
 * 极值 KPI 达成率仪表盘 Option 生成工厂函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { EChartsOption, GaugeSeriesOption, TooltipComponentOption } from 'echarts';
import { formatChartValue } from './format';
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
  const showExtremities = config.showExtremities ?? true;

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

  const hasPointer = config.pointer !== false;
  const pointer = hasPointer
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

  // 3. 构建详细指标数值展示与标题（双模自适应动态空间编排，彻底消灭指针穿模与色带挤压）
  // 经典指针模式：指针在上半弧自由旋转，大数值与标题沉降避让至转轴底座下方；
  // 环形进度条模式：拱门内部开阔无遮挡，大数值坐镇黄金腹心，标题居中映衬。
  const detailOffsetCenter: [number | string, number | string] = hasPointer
    ? [0, '42%']
    : [0, '-5%'];

  const titleOffsetCenter: [number | string, number | string] = hasPointer
    ? [0, '68%']
    : [0, '25%'];

  const detail = {
    valueAnimation: true,
    fontSize: 28,
    fontWeight: 'bold' as const,
    offsetCenter: detailOffsetCenter,
    color: 'inherit',
    formatter: (val: number) => {
      return formatChartValue(val, {
        precision: config.precision ?? (Number.isInteger(val) ? 0 : 1),
        formatThousands: config.formatThousands,
        unit: config.unit !== undefined ? config.unit : '%',
      });
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
    axisLabel: {
      color: '#4E5969',
      distance: 26,
      fontSize: 12,
      fontWeight: 500,
      formatter: (val: number) => {
        if (showExtremities) {
          if (val === min) {
            return config.extremities?.minLabel ?? `${min}`;
          }
          if (val === max) {
            return config.extremities?.maxLabel ?? `${max}`;
          }
        }
        return String(val);
      },
    },
    title: { offsetCenter: titleOffsetCenter, fontSize: 13, color: '#606266' },
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

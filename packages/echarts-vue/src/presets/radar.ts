/**
 * 多维能力画像雷达图 Option 生成工厂函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import * as echarts from 'echarts';
import type {
  EChartsOption,
  RadarComponentOption,
  RadarSeriesOption,
  TooltipComponentOption,
  LegendComponentOption,
} from 'echarts';
import type { RadarChartConfig } from './types';

/**
 * 根据业务配置生成多维综合评估雷达图 Option 对象。
 *
 * @param config 雷达图语义化配置
 * @returns 合法且深度可覆盖的 EChartsOption
 */
export function createRadarOption(config: RadarChartConfig): EChartsOption {
  const rawData = Array.isArray(config.data) ? config.data : [];

  // 1. 规范化各维度指示器（支持字符串简写与最大值自适应计算）
  const indicators = (config.indicators ?? []).map((ind, i) => {
    if (typeof ind === 'string') {
      const maxValInData = rawData.reduce((max, d) => {
        const v = Array.isArray(d.value) && d.value[i] !== undefined ? Number(d.value[i]) : 0;
        return Math.max(max, v);
      }, 0);
      const computedMax = maxValInData > 0 ? Math.ceil(maxValInData * 1.1) : 100;
      return {
        name: ind,
        max: computedMax,
      };
    }
    return ind;
  });

  // 2. 构建雷达坐标系（应用黄金比例中心下移与半径收敛，消除与顶部图例重叠并防止文字截断）
  const radar: RadarComponentOption = {
    indicator: indicators,
    shape: config.shape ?? 'polygon',
    splitNumber: config.splitNumber ?? 5,
    center: config.center ?? ['50%', '56%'],
    radius: config.radius ?? '60%',
    axisNameGap: 10,
    axisName: {
      color: '#606266',
      fontSize: 12,
    },
    splitLine: {
      lineStyle: {
        color: '#E4E7ED',
      },
    },
    splitArea: {
      show: true,
      areaStyle: {
        color: ['rgba(250, 250, 250, 0.4)', 'rgba(235, 238, 245, 0.4)'],
      },
    },
    axisLine: {
      lineStyle: {
        color: '#DCDFE6',
      },
    },
  };

  const isAreaEnabled = config.area !== false;
  const areaOpts = typeof config.area === 'object' ? config.area : {};
  const isGradient = areaOpts.gradient ?? true;
  const areaOpacity = areaOpts.opacity ?? 0.3;

  // 3. 构建雷达对比数据系列（内置半透明渐变区域填充）
  const seriesData = rawData.map(item => {
    let computedAreaStyle = item.areaStyle;
    if (!computedAreaStyle && isAreaEnabled) {
      if (isGradient && item.color && !item.color.startsWith('linear-gradient')) {
        computedAreaStyle = {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: item.color },
            { offset: 1, color: 'transparent' },
          ]),
          opacity: areaOpacity,
        };
      } else {
        computedAreaStyle = { opacity: areaOpacity };
      }
    }

    return {
      name: item.name,
      value: item.value,
      itemStyle: item.color ? { color: item.color } : undefined,
      lineStyle: item.color ? { color: item.color, width: 2 } : { width: 2 },
      areaStyle: computedAreaStyle,
    };
  });

  const series: RadarSeriesOption = {
    type: 'radar',
    data: seriesData,
  };

  // 4. 构建提示框与图例
  let tooltip: TooltipComponentOption | undefined;
  if (config.tooltip !== false) {
    const userTooltip = typeof config.tooltip === 'object' ? config.tooltip : {};
    tooltip = {
      trigger: 'item',
      ...userTooltip,
    };
  }

  let legend: LegendComponentOption | undefined;
  if (config.legend !== false) {
    legend = {
      show: true,
      top: 10,
      textStyle: { color: '#606266' },
      ...(typeof config.legend === 'object' ? config.legend : {}),
    };
  }

  let baseOption: EChartsOption = {
    tooltip,
    legend,
    radar,
    series: [series],
  };

  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}

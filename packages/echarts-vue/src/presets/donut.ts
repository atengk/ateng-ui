/**
 * 环形占比与南丁格尔玫瑰图 Option 生成工厂函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type {
  EChartsOption,
  PieSeriesOption,
  TitleComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
} from 'echarts';
import { formatCurrency } from '@atengk/core';
import type { DonutChartConfig, DonutCenterSummaryConfig } from './types';

/**
 * 根据业务配置生成标准环形图或南丁格尔玫瑰图 Option 对象。
 *
 * @param config 环形图语义化配置
 * @returns 合法且深度可覆盖的 EChartsOption
 */
export function createDonutOption(config: DonutChartConfig): EChartsOption {
  // 1. 规范化输入数据与字段映射
  const data = Array.isArray(config.data) ? config.data : [];
  const nameKey = config.nameKey ?? 'name';
  const valueKey = config.valueKey ?? 'value';

  const seriesData = data.map(item => ({
    name: String(item[nameKey] ?? ''),
    value: Number(item[valueKey] ?? 0),
  }));

  // 2. 计算中心指标卡总和
  const totalSum = seriesData.reduce((acc, cur) => {
    return acc + (Number.isNaN(cur.value) ? 0 : cur.value);
  }, 0);

  let title: TitleComponentOption | undefined;
  if (config.centerSummary) {
    const summaryConfig: DonutCenterSummaryConfig =
      typeof config.centerSummary === 'object' ? config.centerSummary : {};

    let formattedSum = '';
    if (summaryConfig.formatter) {
      formattedSum = summaryConfig.formatter(totalSum);
    } else {
      const precision = config.precision ?? (Number.isInteger(totalSum) ? 0 : 2);
      const valStr =
        config.formatThousands !== false
          ? formatCurrency(totalSum, { symbol: '', precision })
          : String(totalSum);
      const unitStr = config.unit ? ` ${config.unit}` : '';
      formattedSum = `${valStr}${unitStr}`;
    }

    title = {
      text: summaryConfig.showSum !== false ? formattedSum : '',
      subtext: summaryConfig.title ?? '总计',
      left: 'center',
      top: 'center',
      textStyle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#303133',
      },
      subtextStyle: {
        fontSize: 13,
        color: '#909399',
      },
    };
  }

  // 3. 构建提示框 Tooltip
  let tooltip: TooltipComponentOption | undefined;
  if (config.tooltip !== false) {
    const userTooltip = typeof config.tooltip === 'object' ? config.tooltip : {};
    tooltip = {
      trigger: 'item',
      formatter: (params: unknown) => {
        if (userTooltip.formatter) {
          if (typeof userTooltip.formatter === 'function') {
            return (userTooltip.formatter as (p: unknown) => string)(params);
          }
          return userTooltip.formatter;
        }

        const p = params as Record<string, unknown>;
        const name = String(p.name ?? '');
        const marker = String(p.marker ?? '');
        const rawVal = Number(p.value ?? 0);
        const percent = p.percent !== undefined ? Number(p.percent).toFixed(1) : '-';

        const precision = config.precision ?? (Number.isInteger(rawVal) ? 0 : 2);
        const valStr =
          config.formatThousands !== false
            ? formatCurrency(rawVal, { symbol: '', precision })
            : String(rawVal);
        const unitStr = config.unit ? ` ${config.unit}` : '';

        return `<div style="font-size:13px;line-height:1.5;">
          <div style="font-weight:600;margin-bottom:4px;color:#303133;">${name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <span style="color:#606266;">${marker}数值</span>
            <span style="font-weight:600;color:#303133;">${valStr}${unitStr}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:2px;">
            <span style="color:#606266;">占比</span>
            <span style="font-weight:600;color:#409EFF;">${percent}%</span>
          </div>
        </div>`;
      },
      ...userTooltip,
    };
  }

  // 4. 构建图例 Legend
  let legend: LegendComponentOption | undefined;
  if (config.legend !== false) {
    legend = {
      show: true,
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { color: '#606266' },
      ...(typeof config.legend === 'object' ? config.legend : {}),
    };
  }

  // 5. 构建 Pie / Rose 系列
  const roseTypeValue =
    config.roseType === true
      ? ('radius' as const)
      : config.roseType === false
        ? undefined
        : config.roseType;

  const series: PieSeriesOption = {
    type: 'pie',
    radius: config.radius ?? ['45%', '70%'],
    center: config.center ?? ['50%', '50%'],
    roseType: roseTypeValue,
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: config.borderRadius ?? 6,
      borderColor: '#fff',
      borderWidth: 2,
    },
    padAngle: config.padAngle,
    label: {
      show: false,
      position: 'center',
    },
    emphasis: {
      label: {
        show: !title,
        fontSize: 16,
        fontWeight: 'bold',
      },
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
      },
    },
    data: seriesData,
  };

  let baseOption: EChartsOption = {
    ...(title ? { title } : {}),
    tooltip,
    legend,
    series: [series],
  };

  // 6. 逃生通道拦截
  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}

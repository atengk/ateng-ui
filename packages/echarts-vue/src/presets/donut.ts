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
import { formatChartValue } from './format';
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

  // 2. 判定图例排版并计算饼图与中心指标卡的协同中心（默认底部水平居中，彻底消除横向碰撞）
  const isLegendEnabled = config.legend !== false;
  const userLegend = typeof config.legend === 'object' ? config.legend : {};
  const isExplicitVertical = userLegend.orient === 'vertical';

  let defaultCenterX = '50%';
  let defaultCenterY = isLegendEnabled ? '45%' : '50%';
  let defaultRadius: [string, string] = ['42%', '66%'];

  if (isExplicitVertical && (userLegend.left === 'left' || !userLegend.left)) {
    // 若用户显式要求左侧垂直图例，收敛饼图尺寸并右移至 65%，留出充足图例视距
    defaultCenterX = '65%';
    defaultCenterY = '50%';
    defaultRadius = ['36%', '56%'];
  }

  const resolvedCenter = config.center ?? [defaultCenterX, defaultCenterY];
  const resolvedRadius = config.radius ?? defaultRadius;

  const titleLeft = config.center ? config.center[0] : isExplicitVertical ? '65%' : 'center';
  const titleTop = config.center
    ? config.center[1]
    : isLegendEnabled && !isExplicitVertical
      ? '45%'
      : 'center';

  // 3. 计算中心指标卡总和
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
      formattedSum = formatChartValue(totalSum, {
        formatThousands: config.formatThousands,
        precision: config.precision,
        unit: config.unit,
      });
    }

    title = {
      text: summaryConfig.showSum !== false ? formattedSum : '',
      subtext: summaryConfig.title ?? '总计',
      left: titleLeft,
      top: titleTop,
      textAlign: 'center',
      textVerticalAlign: 'middle',
      textStyle: {
        fontSize: 20,
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

        const valStr = formatChartValue(rawVal, {
          formatThousands: config.formatThousands,
          precision: config.precision,
          unit: config.unit,
        });

        return `<div style="font-size:13px;line-height:1.5;">
          <div style="font-weight:600;margin-bottom:4px;color:#303133;">${name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <span style="color:#606266;">${marker}数值</span>
            <span style="font-weight:600;color:#303133;">${valStr}</span>
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

  // 4. 构建图例 Legend（默认底部水平居中，现代中后台主流规范）
  let legend: LegendComponentOption | undefined;
  if (config.legend !== false) {
    legend = {
      show: true,
      orient: 'horizontal',
      bottom: 8,
      left: 'center',
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
    radius: resolvedRadius,
    center: resolvedCenter,
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

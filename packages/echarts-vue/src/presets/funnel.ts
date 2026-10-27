/**
 * 业务转化漏斗图 Option 生成工厂函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type {
  EChartsOption,
  FunnelSeriesOption,
  TooltipComponentOption,
  LegendComponentOption,
} from 'echarts';
import { formatChartValue } from './format';
import type { FunnelChartConfig } from './types';

/**
 * 根据业务配置生成业务转化漏斗图 Option 对象。
 *
 * @param config 漏斗图语义化配置
 * @returns 合法且深度可覆盖的 EChartsOption
 */
export function createFunnelOption(config: FunnelChartConfig): EChartsOption {
  // 1. 规范化输入数据与字段映射
  const data = Array.isArray(config.data) ? config.data : [];
  const nameKey = config.nameKey ?? 'name';
  const valueKey = config.valueKey ?? 'value';

  const seriesData = data.map(item => ({
    name: String(item[nameKey] ?? ''),
    value: Number(item[valueKey] ?? 0),
  }));

  // 计算视觉展示的逻辑顺序，确保环节转化率计算与漏斗流向一致
  const sortMode = config.sort ?? 'descending';
  const displaySequence = [...seriesData];
  if (sortMode === 'descending') {
    displaySequence.sort((a, b) => b.value - a.value);
  } else if (sortMode === 'ascending') {
    displaySequence.sort((a, b) => a.value - b.value);
  }

  // 2. 构建提示框 Tooltip（阶段转化率与总转化率）
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

        const seqIdx = displaySequence.findIndex(item => item.name === name);
        const prevItem = seqIdx > 0 ? displaySequence[seqIdx - 1] : undefined;
        const prevVal = prevItem ? prevItem.value : rawVal;
        const firstItem = displaySequence[0];
        const firstVal = firstItem ? firstItem.value : 0;

        let stepRate = '-';
        if (seqIdx === 0) {
          stepRate = '100.0';
        } else if (prevVal > 0) {
          stepRate = ((rawVal / prevVal) * 100).toFixed(1);
        } else if (rawVal === 0) {
          stepRate = '0.0';
        }

        let totalRate = '-';
        if (seqIdx === 0) {
          totalRate = '100.0';
        } else if (firstVal > 0) {
          totalRate = ((rawVal / firstVal) * 100).toFixed(1);
        } else if (rawVal === 0) {
          totalRate = '0.0';
        }

        const valDisplay = formatChartValue(rawVal, {
          formatThousands: config.formatThousands,
          precision: config.precision,
          unit: config.unit,
        });

        return `<div style="font-size:13px;line-height:1.5;">
          <div style="font-weight:600;margin-bottom:4px;color:#303133;">${name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <span style="color:#606266;">${marker}转化量</span>
            <span style="font-weight:600;color:#303133;">${valDisplay}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:2px;">
            <span style="color:#606266;">环节转化率</span>
            <span style="font-weight:600;color:#67C23A;">${stepRate}%</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:2px;">
            <span style="color:#606266;">总体转化率</span>
            <span style="font-weight:600;color:#409EFF;">${totalRate}%</span>
          </div>
        </div>`;
      },
      ...userTooltip,
    };
  }

  // 3. 构建图例 Legend
  let legend: LegendComponentOption | undefined;
  if (config.legend !== false) {
    legend = {
      show: true,
      top: 12,
      textStyle: { color: '#606266' },
      ...(typeof config.legend === 'object' ? config.legend : {}),
    };
  }

  // 4. 构建 Funnel 系列（配置保底 minSize 与 overflow 截断防线，杜绝末端文字穿透与溢出）
  const series: FunnelSeriesOption = {
    type: 'funnel',
    left: '10%',
    top: 60,
    bottom: 24,
    width: '80%',
    minSize: config.minSize ?? '16%',
    maxSize: config.maxSize ?? '80%',
    sort: config.sort ?? 'descending',
    gap: config.gap ?? 2,
    label: {
      show: true,
      position: 'inside',
      formatter: '{b}: {c}',
      color: '#fff',
      overflow: 'truncate',
    },
    emphasis: {
      label: {
        fontSize: 14,
        fontWeight: 'bold',
      },
    },
    data: seriesData,
  };

  let baseOption: EChartsOption = {
    tooltip,
    legend,
    series: [series],
  };

  // 5. 逃生通道拦截
  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}

/**
 * AtengStatistic 统计指标与数字滚动组件类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef, StyleValue } from 'vue';

export type StatisticTrend = 'up' | 'down' | 'none';

/**
 * AtengStatistic 属性接口。
 */
export interface AtengStatisticProps {
  /**
   * 统计数值（支持数字或数字字符串）。
   */
  value: number | string;

  /**
   * 指标标题文案。
   */
  title?: string;

  /**
   * 小数点保留位数。
   * 若不传则根据 value 的实际小数位数智能推导。
   */
  precision?: number;

  /**
   * 千分位分隔符。
   * @default ','
   */
  separator?: string;

  /**
   * 数值前缀文本（如币种符号 ¥、$ 或图标）。
   */
  prefix?: string;

  /**
   * 数值后缀文本（如单位 %、单、人）。
   */
  suffix?: string;

  /**
   * 数字滚动动画持续时长（毫秒）。
   * 设为 0 时立即呈现目标值，不执行过渡动画。
   * @default 1500
   */
  duration?: number;

  /**
   * 涨跌趋势微标方向。
   * @default 'none'
   */
  trend?: StatisticTrend;

  /**
   * 涨跌趋势增减量或百分比文本（如 '+12.5%'、'-3.2%'）。
   */
  trendValue?: string | number;

  /**
   * 是否采用国际红跌绿涨配色反转（默认中国大陆市场规范：红涨绿跌）。
   * @default false
   */
  trendColorInverse?: boolean;

  /**
   * 是否处于数据加载中状态（展示骨架屏占位防布局抖动）。
   * @default false
   */
  loading?: boolean;

  /**
   * 数值区域自定义行内样式。
   */
  valueStyle?: StyleValue;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengStatistic 插槽接口。
 */
export interface AtengStatisticSlots {
  /**
   * 自定义标题栏。
   */
  title?: () => unknown;

  /**
   * 自定义前缀区域。
   */
  prefix?: () => unknown;

  /**
   * 自定义后缀区域。
   */
  suffix?: () => unknown;

  /**
   * 自定义涨跌趋势微标区域。
   */
  trend?: (scope: { trend: StatisticTrend; trendValue?: string | number }) => unknown;

  /**
   * 自定义整体数值渲染。
   */
  default?: (scope: { value: number | string; displayValue: string }) => unknown;
}

/**
 * AtengStatistic Expose 实例接口。
 */
export interface AtengStatisticExpose {
  /**
   * 重新播放翻牌数字滚动动画。
   */
  restart: () => void;

  /**
   * 当前缓动过程中的实时数值。
   */
  currentValue: ComputedRef<number>;

  /**
   * 当前格式化后的最终呈现文本。
   */
  displayValue: ComputedRef<string>;
}

/**
 * 趋势图看板预设强类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type {
  EChartsOption,
  TooltipComponentOption,
  LegendComponentOption,
  GridComponentOption,
  MarkPointComponentOption,
  MarkLineComponentOption,
} from 'echarts';
import type { AtengEChartsEmits, AtengEChartsProps } from '../types';

/**
 * 维度（X 轴）字段结构化配置。
 */
export interface TrendDimensionConfig {
  /**
   * 数据源字段名（如 'date'、'month'）。
   */
  key: string;

  /**
   * 坐标轴名称/标题。
   */
  name?: string;

  /**
   * 维度值格式化回调函数。
   */
  formatter?: (value: unknown) => string;
}

/**
 * 维度声明类型，支持简写字段字符串或完整对象配置。
 */
export type TrendDimension = string | TrendDimensionConfig;

/**
 * 度量（图表系列）结构化配置。
 */
export interface TrendMetricConfig {
  /**
   * 数据源字段名（如 'revenue'、'orderCount'）。
   */
  key: string;

  /**
   * 系列展示名称（图例与 Tooltip 显示），未配置时回退为 key。
   */
  name?: string;

  /**
   * 系列表现类型。
   * @default 'line'
   */
  type?: 'line' | 'bar';

  /**
   * 归属 Y 轴索引：0 为左 Y 轴，1 为右 Y 轴。
   * @default 0
   */
  yAxisIndex?: 0 | 1;

  /**
   * 折线是否采用平滑贝塞尔曲线。
   * @default true
   */
  smooth?: boolean;

  /**
   * 区域面积渐变填充。可传 true（使用系列色默认渐变）或特定颜色字符串。
   * @default false
   */
  area?: boolean | string;

  /**
   * 堆叠组标识，相同标识的系列将在同一坐标轴进行数值累加堆叠。
   */
  stack?: string;

  /**
   * 数值度量单位后缀（如 '元'、'%'、'件'、'万'）。
   */
  unit?: string;

  /**
   * 数值小数位精度，配合千分位格式化使用。
   */
  precision?: number;

  /**
   * 是否启用数值千分位展示。
   * @default true
   */
  formatThousands?: boolean;

  /**
   * 极值气泡标注（如最大值、最小值）。
   */
  markPoint?: 'min' | 'max' | 'both' | MarkPointComponentOption;

  /**
   * 辅助基准标线（如平均值）。
   */
  markLine?: 'average' | 'min' | 'max' | MarkLineComponentOption;

  /**
   * 单独指定该系列的调色盘颜色（十六进制或 rgba）。
   */
  color?: string;

  /**
   * 柱状图柱身宽度（像素数值或百分比）。
   */
  barWidth?: number | string;

  /**
   * 柱状图柱身顶部圆角半径。
   */
  barBorderRadius?: number | number[];
}

/**
 * 度量声明类型，支持简写字段字符串或完整对象配置。
 */
export type TrendMetric = string | TrendMetricConfig;

/**
 * 单个 Y 轴结构化配置。
 */
export interface TrendYAxisConfig {
  /**
   * 坐标轴名称/标题（如 '营收 (万元)'）。
   */
  name?: string;

  /**
   * 数值单位后缀。
   */
  unit?: string;

  /**
   * 坐标轴最小值。
   */
  min?: number | 'dataMin';

  /**
   * 坐标轴最大值。
   */
  max?: number | 'dataMax';

  /**
   * 坐标轴标签格式化回调函数。
   */
  formatter?: (value: number) => string;

  /**
   * 是否展示水平网格分割线。
   */
  splitLine?: boolean;
}

/**
 * 数据缩放（DataZoom）控制配置。
 */
export interface TrendDataZoomConfig {
  /**
   * 是否展示底部滑块缩放手柄。
   * @default true
   */
  slider?: boolean;

  /**
   * 是否支持鼠标滚轮与移动端触控捏合内置缩放。
   * @default true
   */
  inside?: boolean;

  /**
   * 初始可视范围起始百分比（0-100）。
   * @default 0
   */
  start?: number;

  /**
   * 初始可视范围结束百分比（0-100）。
   * @default 100
   */
  end?: number;
}

/**
 * createTrendOption 工厂函数主输入配置。
 */
export interface TrendChartConfig {
  /**
   * 扁平业务数据源列表。
   */
  data: Record<string, unknown>[];

  /**
   * X 轴维度声明（支持字段名或完整对象）。
   */
  dimension: TrendDimension;

  /**
   * 度量系列列表（支持单个或多个指标声明）。
   */
  metrics: TrendMetric[];

  /**
   * Y 轴配置：支持单个配置（作用于左轴）或左右双轴元组 [leftAxis, rightAxis]。
   */
  yAxis?: TrendYAxisConfig | [TrendYAxisConfig, TrendYAxisConfig];

  /**
   * 数据缩放手柄配置，传 boolean 快捷启用/关闭。
   * @default false
   */
  dataZoom?: boolean | TrendDataZoomConfig;

  /**
   * 是否显示图例或自定义图例选项。
   * @default true
   */
  legend?: boolean | LegendComponentOption;

  /**
   * 提示框（Tooltip）启用开关或定制选项。
   * @default true
   */
  tooltip?: boolean | TooltipComponentOption;

  /**
   * 绘图网格定位边距。
   */
  grid?: GridComponentOption;

  /**
   * 逃生通道：在默认 Option 生成后执行最终拦截与深度覆盖。
   */
  overrideOption?: (base: EChartsOption) => EChartsOption;
}

/**
 * AtengTrendChart 预设组件属性契约。
 */
export interface AtengTrendChartProps extends Omit<AtengEChartsProps, 'option'> {
  /**
   * 扁平业务数据源列表。
   */
  data: Record<string, unknown>[];

  /**
   * X 轴维度声明（如 'date'）。
   */
  dimension: TrendDimension;

  /**
   * 度量系列配置列表。
   */
  metrics: TrendMetric[];

  /**
   * Y 轴配置。
   */
  yAxis?: TrendYAxisConfig | [TrendYAxisConfig, TrendYAxisConfig];

  /**
   * 数据缩放手柄配置。
   */
  dataZoom?: boolean | TrendDataZoomConfig;

  /**
   * 图例开关或配置。
   */
  legend?: boolean | LegendComponentOption;

  /**
   * 提示框开关或配置。
   */
  tooltip?: boolean | TooltipComponentOption;

  /**
   * 网格布局边距。
   */
  grid?: GridComponentOption;

  /**
   * 深度覆盖逃生通道。
   */
  overrideOption?: (base: EChartsOption) => EChartsOption;
}

/**
 * AtengTrendChart 预设组件事件契约（继承自通用容器 Emits）。
 */
export type AtengTrendChartEmits = AtengEChartsEmits;

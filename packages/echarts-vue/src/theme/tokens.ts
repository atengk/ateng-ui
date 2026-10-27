/**
 * ECharts 5 企业级设计令牌与色彩体系。
 *
 * 与 Element Plus 原生色彩和蓝图现代看板色调 100% 对齐。
 *
 * @author Ateng
 * @since 2026-10-27
 */

export const AtengChartColors = {
  primary: '#409eff',
  success: '#67c23a',
  warning: '#e6a23c',
  danger: '#f56c6c',
  info: '#909399',
  palette: [
    '#409eff',
    '#67c23a',
    '#e6a23c',
    '#f56c6c',
    '#79bbff',
    '#95d475',
    '#eebe77',
    '#f89898',
    '#b3e19d',
    '#36cfc9',
  ],
  light: {
    backgroundColor: 'transparent',
    textColor: '#303133',
    subtextColor: '#909399',
    axisLineColor: '#dcdfe6',
    splitLineColor: '#ebeef5',
    tooltipBackground: 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: '#e4e7ed',
    tooltipText: '#303133',
  },
  dark: {
    backgroundColor: 'transparent',
    textColor: '#e5eaf3',
    subtextColor: '#a3a6ad',
    axisLineColor: '#4c4d4f',
    splitLineColor: '#363637',
    tooltipBackground: 'rgba(29, 30, 31, 0.95)',
    tooltipBorder: '#414243',
    tooltipText: '#e5eaf3',
  },
} as const;

/**
 * 亮色主题配置对象。
 */
export const atengLightTheme: Record<string, unknown> = {
  color: AtengChartColors.palette,
  backgroundColor: AtengChartColors.light.backgroundColor,
  textStyle: {
    color: AtengChartColors.light.textColor,
  },
  title: {
    textStyle: { color: AtengChartColors.light.textColor },
    subtextStyle: { color: AtengChartColors.light.subtextColor },
  },
  line: {
    itemStyle: { borderWidth: 2 },
    lineStyle: { width: 2 },
    smooth: true,
  },
  bar: {
    itemStyle: { barBorderRadius: [4, 4, 0, 0] },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: AtengChartColors.light.axisLineColor } },
    axisTick: { lineStyle: { color: AtengChartColors.light.axisLineColor } },
    axisLabel: { color: AtengChartColors.light.textColor },
    splitLine: { show: false, lineStyle: { color: AtengChartColors.light.splitLineColor } },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: AtengChartColors.light.subtextColor },
    splitLine: { show: true, lineStyle: { color: AtengChartColors.light.splitLineColor } },
  },
  tooltip: {
    backgroundColor: AtengChartColors.light.tooltipBackground,
    borderColor: AtengChartColors.light.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: AtengChartColors.light.tooltipText },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 6px;',
  },
};

/**
 * 暗黑主题配置对象。
 */
export const atengDarkTheme: Record<string, unknown> = {
  color: AtengChartColors.palette,
  backgroundColor: AtengChartColors.dark.backgroundColor,
  textStyle: {
    color: AtengChartColors.dark.textColor,
  },
  title: {
    textStyle: { color: AtengChartColors.dark.textColor },
    subtextStyle: { color: AtengChartColors.dark.subtextColor },
  },
  line: {
    itemStyle: { borderWidth: 2 },
    lineStyle: { width: 2 },
    smooth: true,
  },
  bar: {
    itemStyle: { barBorderRadius: [4, 4, 0, 0] },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: AtengChartColors.dark.axisLineColor } },
    axisTick: { lineStyle: { color: AtengChartColors.dark.axisLineColor } },
    axisLabel: { color: AtengChartColors.dark.textColor },
    splitLine: { show: false, lineStyle: { color: AtengChartColors.dark.splitLineColor } },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: AtengChartColors.dark.subtextColor },
    splitLine: { show: true, lineStyle: { color: AtengChartColors.dark.splitLineColor } },
  },
  tooltip: {
    backgroundColor: AtengChartColors.dark.tooltipBackground,
    borderColor: AtengChartColors.dark.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: AtengChartColors.dark.tooltipText },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); border-radius: 6px;',
  },
};

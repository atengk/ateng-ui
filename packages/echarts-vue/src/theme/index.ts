/**
 * ECharts 主题注册与管理门面。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import * as echarts from 'echarts';
import { atengLightTheme, atengDarkTheme } from './tokens';

export * from './tokens';

let registered = false;

/**
 * 确保注册内置企业级默认主题。
 */
export function ensureBuiltinThemes(): void {
  if (!registered) {
    echarts.registerTheme('ateng-light', atengLightTheme);
    echarts.registerTheme('ateng-dark', atengDarkTheme);
    registered = true;
  }
}

/**
 * 注册自定义 ECharts 主题。
 *
 * @param name 主题名称
 * @param theme 主题配置对象
 */
export function registerTheme(name: string, theme: object): void {
  echarts.registerTheme(name, theme);
}

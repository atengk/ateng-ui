/**
 * @atengk/grid-layout-vue 顶层导出入口。
 *
 * 遵循 ADR-0045 与工业级六件套规范，纯声明式具名导出全部组件、状态机与 TypeScript 契约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { App, Plugin } from 'vue';
import AtengGridLayout from './components/AtengGridLayout.vue';
import AtengGridItem from './components/AtengGridItem.vue';

// 样式引入
import './style/index.css';

// 导出组件
export { AtengGridLayout, AtengGridItem };

// 导出无头状态机
export { useGridLayout } from './composables/useGridLayout';
export { useGridItem } from './composables/useGridItem';

// 导出常量与注入键
export {
  GRID_LAYOUT_KEY,
  GRID_ITEM_KEY,
  DEFAULT_BREAKPOINTS,
  DEFAULT_RESPONSIVE_COLUMNS,
  resolveResponsiveColumns,
  CSS_PREFIX,
} from './constants';

// 导出强类型接口
export type {
  GridLayoutItem,
  GridResponsiveBreakpoints,
  UseGridLayoutOptions,
  UseGridLayoutReturn,
  GridItemContext,
} from './types';

/**
 * Vue 插件安装器。
 */
export const AtengGridLayoutPlugin: Plugin = {
  install(app: App): void {
    app.component('AtengGridLayout', AtengGridLayout);
    app.component('AtengGridItem', AtengGridItem);
  },
};

export default AtengGridLayoutPlugin;

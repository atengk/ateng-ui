/**
 * @atengk/map-vue 核心顶级导出入口。
 *
 * 遵循纯声明式具名导出与 Tree-Shaking 规范，严禁隐式全局副作用。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import './styles/index.css';

// 表现容器组件
export { default as AtengMap } from './components/AtengMap.vue';
export { default as AtengMapPicker } from './components/AtengMapPicker.vue';

// 核心类型契约
export * from './types';

// 常量与瓦片预设
export * from './constants';

// 视口几何自愈守卫
export * from './guards/map-resize-guard';

// 坐标防漂移转换引擎
export * from './engines/coord-transform';

// 空间几何算法引擎
export * from './engines/geo-math';

// 无头响应式状态机
export * from './composables/use-map-theme-sync';
export * from './composables/use-map';
export * from './composables/use-map-picker';

// 底座驱动适配器 SPI
export * from './adapters/leaflet-driver-adapter';
export * from './adapters/amap-driver-adapter';

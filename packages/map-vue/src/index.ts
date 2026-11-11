/**
 * @atengk/map-vue 核心顶级导出入口。
 *
 * 遵循纯声明式具名导出与 Tree-Shaking 规范，严禁隐式全局副作用。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import './styles/index.css';

// 核心类型契约
export * from './types';

// 常量与瓦片预设
export * from './constants';

// 坐标防漂移转换引擎
export * from './engines/coord-transform';

// 空间几何算法引擎
export * from './engines/geo-math';

// 底座驱动适配器 SPI
export * from './adapters/leaflet-driver-adapter';
export * from './adapters/amap-driver-adapter';

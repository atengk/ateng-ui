/**
 * @atengk/video-player-vue 主包纯声明式导出入口。
 *
 * 遵循系统极致 Tree-Shaking 与副作用零残留契约，严禁顶层隐式副作用。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { App, Plugin } from 'vue';
import { AtengVideoPlayer } from './components';

// 1. 组件导出
export * from './components';

// 2. 状态机 Hooks 导出
export * from './composables';

// 3. 播放引擎 SPI 与适配器导出
export * from './engine';

// 4. 强类型契约全量具名导出
export * from './types';

// 5. 企业级安全与鉴权防线导出
export * from './security';

// 6. 流媒体驱动器全量具名导出
export * from './drivers';

/**
 * Vue 插件安装器。
 *
 * @param app Vue 应用实例
 */
export function install(app: App): void {
  app.component('AtengVideoPlayer', AtengVideoPlayer);
}

const plugin: Plugin = { install };

export default plugin;

/**
 * @atengk/file-viewer 顶层统一入口与公共 API 导出。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { App } from 'vue';
import AtengFileViewer from './components/AtengFileViewer.vue';

export { AtengFileViewer };

export type {
  AtengFileViewerProps,
  AtengFileViewerEmits,
  AtengFileViewerSlots,
  AtengFileViewerExpose,
  AtengFileViewerInstance,
  FileViewerTheme,
} from './types';

/**
 * Vue 插件独立显式安装器。
 *
 * 遵循受控原则，供宿主应用主动调用 app.use(installFileViewer)。
 *
 * @param app Vue 应用实例
 */
export function install(app: App): void {
  app.component('AtengFileViewer', AtengFileViewer);
}

export interface AtengFileViewerPlugin {
  install(app: App): void;
}

const plugin: AtengFileViewerPlugin = {
  install,
};

export default plugin;

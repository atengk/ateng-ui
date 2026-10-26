/**
 * @atengk/file-viewer 顶层统一入口与公共 API 导出。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { App, Plugin } from 'vue';
import AtengFileViewer from './components/AtengFileViewer.vue';

export { AtengFileViewer };

export { detectFileType, sniffMagicNumber } from './utils/sniff';
export type { SniffOptions } from './utils/sniff';

export { fetchRemoteFileStream } from './utils/fetcher';
export type { RemoteFileFetchOptions, RemoteFileFetchResult } from './utils/fetcher';

export {
  normalizeWatermark,
  buildWatermarkSvg,
  buildWatermarkDataUrl,
  createWatermarkOverlay,
} from './utils/watermark';
export type { WatermarkInstance } from './utils/watermark';

export { setupDlpProtection } from './utils/dlp';
export type { DlpOptions, DlpController } from './utils/dlp';

export {
  saveViewStateHistory,
  restoreViewStateHistory,
  clearViewStateHistory,
  resolveViewStateKey,
  getViewStateHistorySize,
} from './utils/viewStateHistory';
export type { StoredViewState, ResolveViewStateKeyInput } from './utils/viewStateHistory';

export {
  configureFileViewer,
  getFileViewerConfig,
  resetFileViewerConfig,
  resolveThreeTierAssetBaseUrl,
  createTieredAssetOptions,
  DEFAULT_LOCAL_ASSET_BASE_URL,
  DEFAULT_PUBLIC_CDN_BASE_URL,
} from './utils/assets';
export type { FileViewerGlobalConfig, ResolveAssetBaseUrlOptions } from './utils/assets';

export {
  registerPreset,
  unregisterPreset,
  getRegisteredPresets,
  clearPresets,
  resolvePresets,
} from './utils/presets';
export type {
  FileViewerPreset,
  FileViewerPresetRenderer,
  FileViewerPresetRendererDefinition,
} from './utils/presets';

export {
  DEFAULT_MAX_SIZE,
  parseSizeLimit,
  formatFileSize,
  formatSpeed,
  isFileSizeExceeded,
  calculateProgress,
} from './utils/sizeGuard';
export type { FileViewerDownloadProgress, CalculateProgressInput } from './utils/sizeGuard';

export { useFileViewer } from './composables/useFileViewer';
export type { UseFileViewerOptions, UseFileViewerReturn } from './composables/useFileViewer';

export type {
  AtengFileViewerProps,
  AtengFileViewerEmits,
  AtengFileViewerSlots,
  AtengFileViewerExpose,
  AtengFileViewerInstance,
  FileViewerTheme,
  WatermarkOptions,
  FileViewerWatermark,
  FileViewerDocumentAnchor,
  FileViewerSheet,
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

const fileViewerPlugin: Plugin = {
  install,
};

export default fileViewerPlugin;

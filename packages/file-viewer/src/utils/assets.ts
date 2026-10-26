/**
 * 离线内网静态资产寻址与三级弹性解析器。
 *
 * 针对重型文件格式（PDF、CAD、3D 模型、Word、Excel、PPT、Archive 等）所依赖的
 * Web Worker、WASM 二进制内核与离线字体文件，提供统一的三级弹性寻址体系：
 * 1. 第一级：内网私有化基地址 (组件局部 assetBaseUrl 或全局 configureFileViewer 配置)；
 * 2. 第二级：公共 CDN 高可用回落 (fallbackMode: 'cdn')；
 * 3. 第三级：本地 public 静态资源同源寻址 (fallbackMode: 'local'，默认 /file-viewer/)。
 *
 * @author Ateng
 * @since 2026-10-26
 */

export interface FileViewerGlobalConfig {
  /**
   * 全局静态资产基地址 (例如 'https://intranet.corp.com/file-viewer/' 或 '/file-viewer/')。
   */
  assetBaseUrl?: string | URL | null;

  /**
   * 未指定私有化地址时的默认回落模式 ('cdn' | 'local'，默认 'local')。
   */
  fallbackMode?: 'cdn' | 'local';
}

export interface ResolveAssetBaseUrlOptions {
  /**
   * 组件局部传入的基地址覆盖。
   */
  localOverride?: string | URL | null;

  /**
   * 兜底回退模式 ('cdn' | 'local')。
   */
  fallbackMode?: 'cdn' | 'local';
}

/**
 * 本地 public 静态资源默认相对根路径。
 */
export const DEFAULT_LOCAL_ASSET_BASE_URL = '/file-viewer/';

/**
 * 官方公共 CDN 备用镜像基地址。
 */
export const DEFAULT_PUBLIC_CDN_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@file-viewer/assets@3.2.2/dist/';

// 全局运行时配置单例
let globalConfig: FileViewerGlobalConfig = {};

/**
 * 规范化基地址 URL，确保以斜杠 / 结尾且去除首尾空白。
 *
 * @param url 待规范化的 URL 字符串或对象
 * @returns 规范化的基地址字符串，若为空则返回 undefined
 */
export function normalizeAssetBaseUrl(url?: string | URL | null): string | undefined {
  if (!url) return undefined;
  const str = String(url).trim();
  if (!str) return undefined;
  return str.endsWith('/') ? str : `${str}/`;
}

/**
 * 配置 @atengk/file-viewer 全局静态资产基地址与回落策略。
 *
 * @param options 全局配置参数
 */
export function configureFileViewer(options: Partial<FileViewerGlobalConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...options,
  };
}

/**
 * 获取当前全局生效的配置快照。
 */
export function getFileViewerConfig(): Readonly<FileViewerGlobalConfig> {
  return { ...globalConfig };
}

/**
 * 重置全局配置至初始默认状态。
 */
export function resetFileViewerConfig(): void {
  globalConfig = {};
}

/**
 * 执行三级弹性静态资产基地址解析。
 *
 * 优先级顺序：
 * 1. 组件局部覆盖 (options.localOverride)；
 * 2. 全局私有化配置 (globalConfig.assetBaseUrl)；
 * 3. 兜底回退策略 (options.fallbackMode 或 globalConfig.fallbackMode)：
 *    - 'cdn' ➔ DEFAULT_PUBLIC_CDN_BASE_URL
 *    - 'local' (默认) ➔ DEFAULT_LOCAL_ASSET_BASE_URL
 *
 * @param options 解析入参
 * @returns 解析得到的确定性基地址 URL 字符串
 */
export function resolveThreeTierAssetBaseUrl(options: ResolveAssetBaseUrlOptions = {}): string {
  // 1. 检查局部覆盖
  const localNorm = normalizeAssetBaseUrl(options.localOverride);
  if (localNorm) {
    return localNorm;
  }

  // 2. 检查全局配置
  const globalNorm = normalizeAssetBaseUrl(globalConfig.assetBaseUrl);
  if (globalNorm) {
    return globalNorm;
  }

  // 3. 检查回落模式
  const mode = options.fallbackMode || globalConfig.fallbackMode || 'local';
  if (mode === 'cdn') {
    return DEFAULT_PUBLIC_CDN_BASE_URL;
  }

  return DEFAULT_LOCAL_ASSET_BASE_URL;
}

/**
 * 拼接基地址与相对资产路径。
 *
 * @param baseUrl 根基地址 (如 'https://intranet.corp.com/file-viewer/')
 * @param relativePath 相对资产路径 (如 'pdf.worker.js')
 * @returns 完整绝对或根相对 URL
 */
export function joinAssetUrl(baseUrl: string, relativePath: string): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanRel = relativePath.replace(/^\/+/, '');
  return `${cleanBase}${cleanRel}`;
}

/**
 * 根据确定的资产基地址，为各大格式内核生成完整的 options 配置结构。
 *
 * 覆盖 PDF、Word、Excel、PPT、CAD、3D 模型、Archive、Typst、CHM 等离线内核。
 *
 * @param assetBaseUrl 确定的资产基地址 (若不传则自动执行三级解析)
 * @returns 注入底层渲染器的完整 options 对象
 */
export function createTieredAssetOptions(
  assetBaseUrl?: string | URL | null,
): Record<string, Record<string, string>> {
  const base = resolveThreeTierAssetBaseUrl({ localOverride: assetBaseUrl });
  const buildUrl = (path: string) => joinAssetUrl(base, path);

  return {
    pdf: {
      workerUrl: buildUrl('pdf.worker.js'),
      cMapUrl: buildUrl('cmaps/'),
      wasmUrl: buildUrl('pdf.wasm'),
      standardFontDataUrl: buildUrl('standard_fonts/'),
      cjkFontFallbackPath: buildUrl('fonts/cjk/'),
    },
    docx: {
      workerUrl: `${buildUrl('docx.worker.js')}?v=3.2.2`,
      workerJsZipUrl: `${buildUrl('jszip.min.js')}?v=3.2.2`,
    },
    spreadsheet: {
      workerUrl: buildUrl('sheet.worker.js'),
    },
    presentation: {
      pptModuleUrl: buildUrl('pptx.module.js'),
      pptWorkerUrl: buildUrl('pptx.worker.js'),
      pptWasmUrl: buildUrl('ppt-native.wasm'),
      pptFontUrl: buildUrl('ppt-font-cjk.otf'),
      workerUrl: buildUrl('presentation.worker.js'),
    },
    cad: {
      wasmPath: buildUrl('cad.wasm'),
      workerUrl: `${buildUrl('cad.worker.js')}?v=3.2.2`,
      dwfWasmUrl: `${buildUrl('cad-dwf.wasm')}?v=3.2.2`,
    },
    model: {
      workerUrl: buildUrl('model.worker.js'),
      runtimeUrl: buildUrl('model.runtime.js'),
      wasmUrl: buildUrl('draco_decoder.wasm'),
    },
    archive: {
      workerUrl: buildUrl('archive.worker.js'),
      wasmUrl: buildUrl('archive.wasm'),
    },
    chm: {
      workerUrl: buildUrl('chm.worker.js'),
      wasmModuleUrl: buildUrl('chm.wasm.module.js'),
      wasmUrl: buildUrl('chm.wasm'),
    },
    typst: {
      compilerWasmUrl: buildUrl('typst_compiler.wasm'),
      rendererWasmUrl: buildUrl('typst_renderer.wasm'),
      fontAssetsUrl: buildUrl('typst_fonts/'),
    },
    data: {
      sqlWasmUrl: buildUrl('sql-wasm.wasm'),
    },
    drawing: {
      viewerScriptUrl: buildUrl('viewer.min.js'),
    },
  };
}

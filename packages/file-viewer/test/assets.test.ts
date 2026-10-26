/**
 * 三级弹性静态资产解析器单元测试。
 *
 * 验证三级优先级寻址：内网私有化基地址 ➔ 公共 CDN 回落 ➔ 本地 public 静态资源，
 * 以及全局配置 configureFileViewer 与组件局部 assetBaseUrl 覆盖。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  configureFileViewer,
  getFileViewerConfig,
  resetFileViewerConfig,
  resolveThreeTierAssetBaseUrl,
  createTieredAssetOptions,
  DEFAULT_LOCAL_ASSET_BASE_URL,
  DEFAULT_PUBLIC_CDN_BASE_URL,
} from '../src/utils/assets';

describe('assets 静态资产寻址与三级弹性解析器测试', () => {
  beforeEach(() => {
    resetFileViewerConfig();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetFileViewerConfig();
    vi.unstubAllGlobals();
  });

  it('全局配置门面 configureFileViewer 能够保存并在 getFileViewerConfig 中正确读取', () => {
    expect(getFileViewerConfig().assetBaseUrl).toBeUndefined();

    configureFileViewer({
      assetBaseUrl: 'https://intranet.corp.com/static/file-viewer/',
    });

    expect(getFileViewerConfig().assetBaseUrl).toBe(
      'https://intranet.corp.com/static/file-viewer/',
    );

    resetFileViewerConfig();
    expect(getFileViewerConfig().assetBaseUrl).toBeUndefined();
  });

  it('第一优先级：组件局部传入的 assetBaseUrl 优先于全局配置', () => {
    configureFileViewer({
      assetBaseUrl: 'https://global-intranet.com/assets/',
    });

    const resolved = resolveThreeTierAssetBaseUrl({
      localOverride: 'https://custom-component-cdn.com/assets',
    });

    // 自动补齐末尾斜杠
    expect(resolved).toBe('https://custom-component-cdn.com/assets/');
  });

  it('第一优先级：未传入局部参数时，优先使用全局配置的内网私有化基地址', () => {
    configureFileViewer({
      assetBaseUrl: 'http://192.168.10.88:9000/minio/file-viewer',
    });

    const resolved = resolveThreeTierAssetBaseUrl();
    expect(resolved).toBe('http://192.168.10.88:9000/minio/file-viewer/');
  });

  it('第二优先级：无私有化配置且有网络访问时，支持回退至公共 CDN 预设', () => {
    // 显式指定 fallbackMode 为 cdn
    const resolved = resolveThreeTierAssetBaseUrl({
      fallbackMode: 'cdn',
    });

    expect(resolved).toBe(DEFAULT_PUBLIC_CDN_BASE_URL);
  });

  it('第三优先级：完全离线环境 (fallbackMode: local) 时，默认回落至本地 public 静态路径', () => {
    const resolved = resolveThreeTierAssetBaseUrl({
      fallbackMode: 'local',
    });

    expect(resolved).toBe(DEFAULT_LOCAL_ASSET_BASE_URL);
  });

  it('createTieredAssetOptions 能够为各重型渲染器批量生成正确的静态资产 URL 映射', () => {
    const options = createTieredAssetOptions('https://intranet.corp.com/file-viewer/');

    // PDF 资产
    expect(options.pdf?.workerUrl).toBe('https://intranet.corp.com/file-viewer/pdf.worker.js');
    expect(options.pdf?.cMapUrl).toBe('https://intranet.corp.com/file-viewer/cmaps/');
    expect(options.pdf?.wasmUrl).toBe('https://intranet.corp.com/file-viewer/wasm/');
    expect(options.pdf?.wasmUrl.endsWith('/')).toBe(true);

    // CAD 资产
    expect(options.cad?.wasmPath).toBe('https://intranet.corp.com/file-viewer/cad.wasm');
    expect(options.cad?.workerUrl).toContain('https://intranet.corp.com/file-viewer/cad.worker.js');

    // 3D 模型资产
    expect(options.model?.workerUrl).toBe('https://intranet.corp.com/file-viewer/model.worker.js');
    expect(options.model?.wasmUrl).toBe('https://intranet.corp.com/file-viewer/draco_decoder.wasm');

    // Archive 压缩包
    expect(options.archive?.workerUrl).toBe(
      'https://intranet.corp.com/file-viewer/archive.worker.js',
    );
    expect(options.archive?.wasmUrl).toBe('https://intranet.corp.com/file-viewer/archive.wasm');

    // 表格与 Word 资产
    expect(options.spreadsheet?.workerUrl).toBe(
      'https://intranet.corp.com/file-viewer/sheet.worker.js',
    );
    expect(options.docx?.workerUrl).toContain(
      'https://intranet.corp.com/file-viewer/docx.worker.js',
    );
  });

  it('传入空值或无效 URL 时能优雅容错保底', () => {
    expect(resolveThreeTierAssetBaseUrl({ localOverride: '' })).toBe(DEFAULT_LOCAL_ASSET_BASE_URL);
    expect(resolveThreeTierAssetBaseUrl({ localOverride: '   ' })).toBe(
      DEFAULT_LOCAL_ASSET_BASE_URL,
    );
  });
});

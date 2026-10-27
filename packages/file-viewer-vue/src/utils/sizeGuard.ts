/**
 * 大文件体积阈值解析、进度指标计算与内存防崩护栏 (SizeGuard)。
 *
 * 为避免超百兆大型文档/图纸直接加载进浏览器内存导致标签页 OOM 崩溃，
 * 本模块提供体积单位解析、人性化指标格式化及进度状态平滑计算。
 *
 * @author Ateng
 * @since 2026-10-26
 */

/**
 * 默认最大允许直接渲染的文件体积上限 (100MB)。
 */
export const DEFAULT_MAX_SIZE: number = 100 * 1024 * 1024;

export interface FileViewerDownloadProgress {
  /**
   * 已加载字节数。
   */
  loaded: number;

  /**
   * 文件总字节数 (若未知则为 0 或 undefined)。
   */
  total?: number;

  /**
   * 下载进度百分比 (0 ~ 100)。
   */
  percent: number;

  /**
   * 瞬时下载网速 (bytes/s)。
   */
  speed: number;

  /**
   * 格式化后的下载网速 (如 '2.4 MB/s')。
   */
  formattedSpeed: string;

  /**
   * 格式化后的已下载体积 (如 '15.2 MB')。
   */
  formattedLoaded: string;

  /**
   * 格式化后的总大小 (如 '45.0 MB')。
   */
  formattedTotal: string;
}

export interface CalculateProgressInput {
  loaded: number;
  total?: number;
  bytesPerSec?: number;
}

/**
 * 解析用户配置的体积上限 (支持数字字节数或 '100MB', '50M', '1GB' 字符串)。
 *
 * @param limit 体积配置入参
 * @returns 确定的整数字节数 (默认 100MB)
 */
export function parseSizeLimit(limit?: string | number): number {
  if (limit === undefined || limit === null) {
    return DEFAULT_MAX_SIZE;
  }

  if (typeof limit === 'number') {
    return limit > 0 ? Math.floor(limit) : DEFAULT_MAX_SIZE;
  }

  const str = String(limit).trim().toLowerCase();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(b|kb|k|mb|m|gb|g)?$/i);
  if (!match || !match[1]) {
    return DEFAULT_MAX_SIZE;
  }

  const value = parseFloat(match[1]);
  if (Number.isNaN(value) || value <= 0) {
    return DEFAULT_MAX_SIZE;
  }

  const unit = (match[2] || 'b').toLowerCase();
  switch (unit) {
    case 'g':
    case 'gb':
      return Math.floor(value * 1024 * 1024 * 1024);
    case 'm':
    case 'mb':
      return Math.floor(value * 1024 * 1024);
    case 'k':
    case 'kb':
      return Math.floor(value * 1024);
    case 'b':
    default:
      return Math.floor(value);
  }
}

/**
 * 将字节大小格式化为人性化可读字符串 (B / KB / MB / GB)。
 *
 * @param bytes 字节大小
 * @returns 格式化后的字符串 (如 '15.4 MB')
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 将每秒字节数格式化为人性化下载速率 (KB/s 或 MB/s)。
 *
 * @param bytesPerSec 每秒字节数
 * @returns 格式化后的速率 (如 '3.2 MB/s')
 */
export function formatSpeed(bytesPerSec: number): string {
  if (typeof bytesPerSec !== 'number' || Number.isNaN(bytesPerSec) || bytesPerSec <= 0) {
    return '0 KB/s';
  }

  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }

  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * 判断给定体积是否超过了设定的最大安全阈值。
 *
 * @param size 实际字节大小
 * @param limit 配置的上限 (数字或字符串)
 * @returns 是否超出上限
 */
export function isFileSizeExceeded(
  size: number,
  limit: string | number = DEFAULT_MAX_SIZE,
): boolean {
  if (typeof size !== 'number' || size <= 0) {
    return false;
  }
  const threshold = parseSizeLimit(limit);
  return size > threshold;
}

/**
 * 根据已下载与总字节数平滑计算进度结构体。
 *
 * @param input 计算入参
 * @returns 完备的下载进度指标实体
 */
export function calculateProgress(input: CalculateProgressInput): FileViewerDownloadProgress {
  const loaded = Math.max(0, input.loaded || 0);
  const total = input.total && input.total > 0 ? input.total : undefined;
  const speed = Math.max(0, input.bytesPerSec || 0);

  let percent = 0;
  if (total && total > 0) {
    percent = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
  }

  return {
    loaded,
    total,
    percent,
    speed,
    formattedLoaded: formatFileSize(loaded),
    formattedTotal: total ? formatFileSize(total) : '未知大小',
    formattedSpeed: formatSpeed(speed),
  };
}

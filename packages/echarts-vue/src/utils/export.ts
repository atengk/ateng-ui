/**
 * 图表高清图片导出与安全文件名生成工具函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { saveBlobAsFile } from '@atengk/core';
import type { ChartExportOptions, EChartsInstance } from '../types';

/**
 * 格式化补零两位数字。
 */
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * 依据时间戳规约生成安全无歧义的文件名。
 *
 * @param prefix 文件名前缀（如 'chart'、'sales-trend'）
 * @param ext 文件扩展名（'png' | 'jpeg'）
 */
export function generateChartFilename(prefix = 'chart', ext: 'png' | 'jpeg' = 'png'): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const seconds = padZero(d.getSeconds());

  const cleanPrefix = (prefix || 'chart').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanPrefix}_${year}${month}${day}_${hours}${minutes}${seconds}.${ext}`;
}

/**
 * 将 DataURL (Base64) 转换为标准二进制 Blob 数据。
 *
 * 具备运行环境守卫，处于非浏览器宿主时安全返回 null。
 *
 * @param dataUrl 格式为 data:image/png;base64,xxxx 的字符串
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  if (typeof window === 'undefined' || typeof atob === 'undefined' || typeof Blob === 'undefined') {
    return null;
  }

  const parts = dataUrl.split(';base64,');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const mimeMatch = parts[0].match(/:(.*?)$/);
  const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/png';
  const byteString = window.atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mimeType });
}

/**
 * 导出图表为高清图片并触发下载。
 *
 * @param chart ECharts 实例
 * @param options 导出选项
 * @returns 是否成功触发下载
 */
export function exportChartImage(
  chart: EChartsInstance | null,
  options: ChartExportOptions = {},
): boolean {
  if (!chart || typeof chart.getDataURL !== 'function') {
    return false;
  }

  const type = options.type ?? 'png';
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? '#ffffff';
  const excludeComponents = options.excludeComponents ?? ['toolbox'];

  // 1. 获取高清图表 DataURL
  let dataUrl = '';
  try {
    dataUrl = chart.getDataURL({
      type,
      pixelRatio,
      backgroundColor,
      excludeComponents,
    });
  } catch (err) {
    console.error('[AtengECharts] getDataURL 失败:', err);
    return false;
  }

  if (!dataUrl) {
    return false;
  }

  // 2. 转换 DataURL 为 Blob 对象
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    return false;
  }

  // 3. 解析或生成安全文件名
  let filename = options.filename?.trim();
  if (!filename) {
    filename = generateChartFilename('chart', type);
  } else if (!filename.endsWith(`.${type}`)) {
    filename = `${filename}.${type}`;
  }

  // 4. 调用 @atengk/core 提供的平台守卫型安全下载器
  return saveBlobAsFile(blob, filename);
}

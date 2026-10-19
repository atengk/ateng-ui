/**
 * 平台守卫型安全文件下载与确定性内存回收器。
 *
 * 具备严格的环境宿主检测防御（在 Node.js/SSR 环境下安全降级返回 false，绝不崩溃），
 * 在浏览器环境下通过受控 a 标签触发文件下载，并在下载后确定性调用 URL.revokeObjectURL 回收临时内存。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import type { SaveBlobOptions } from './types';

/**
 * 将 Blob 数据流落地保存为本地文件。
 *
 * @param blob 待下载的二进制 Blob 数据
 * @param filename 下载保存的文件名
 * @param options 下载配置选项
 * @returns 若成功触发下载返回 true，若处于非浏览器环境或入参非法返回 false
 */
export function saveBlobAsFile(
  blob: unknown,
  filename: string,
  options?: SaveBlobOptions,
): boolean {
  // 1. 环境宿主检测防御：非浏览器环境安全降级
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  // 2. 数据有效性卫语句校验
  if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
    return false;
  }

  const cleanFilename = (filename || '').trim() || 'download';
  const objectUrl = URL.createObjectURL(blob);

  // 3. 触发模拟下载并在 finally 中确保确定性释放临时句柄
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = cleanFilename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    const delay = options?.revokeDelay ?? 1000;
    if (delay <= 0) {
      URL.revokeObjectURL(objectUrl);
    } else {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, delay);
    }
  }

  return true;
}

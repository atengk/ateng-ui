/**
 * @atengk/barcode-vue 二维码 Logo 容错智能提升与 CORS 跨域防污损守卫。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { ErrorCorrectionLevel } from 'qr-code-styling';
import type { SafeImageResult } from '../types/qrcode';

/**
 * 二维码容错权重等级映射：L (7%) < M (15%) < Q (25%) < H (30%)。
 */
const ERROR_LEVEL_WEIGHT: Record<ErrorCorrectionLevel, number> = {
  L: 1,
  M: 2,
  Q: 3,
  H: 4,
};

/**
 * 智能纠错等级自动提升管道。
 *
 * 当二维码中心内嵌 Logo 时，Logo 会遮盖中心数据模块：
 * - 若用户配置了 L(7%) 或 M(15%)，由于容错率不足容易导致扫码失败，系统将强制保底提升至 Q(25%) 或 H(30%)；
 * - 若用户已配置 H(30%)，则尊重用户最高级别设置；
 * - 若未内嵌 Logo，则保留用户原设定或默认 M 级别。
 *
 * @param currentLevel 当前配置的纠错级别
 * @param hasLogo 是否内嵌了中心 Logo 图像
 * @param autoElevate 是否允许自动提升（默认为 true）
 * @returns 最终安全的纠错级别
 */
export function elevateErrorCorrectionLevel(
  currentLevel?: ErrorCorrectionLevel,
  hasLogo: boolean = false,
  autoElevate: boolean = true,
): ErrorCorrectionLevel {
  const baseLevel: ErrorCorrectionLevel = currentLevel || 'M';

  if (!hasLogo || !autoElevate) {
    return baseLevel;
  }

  // 若当前容错等级低于 Q (25%)，自动智能提升至 Q
  if (ERROR_LEVEL_WEIGHT[baseLevel] < ERROR_LEVEL_WEIGHT.Q) {
    return 'Q';
  }

  return baseLevel;
}

/**
 * Logo 尺寸边界安全约束。
 *
 * 限制 Logo 宽高占二维码整体尺寸的比例，防止过大遮盖边缘三个角落的寻像图形（码眼）。
 * 默认推荐不超过 25% (0.25)，最大不得超过 30% (0.30)。
 *
 * @param requestedSize 用户请求的尺寸比例
 * @param defaultSize 默认安全比例 (0.25)
 * @param maxSafeLimit 最大安全比例上限 (0.30)
 * @returns 约束后的安全比例
 */
export function clampLogoSize(
  requestedSize?: number,
  defaultSize = 0.25,
  maxSafeLimit = 0.3,
): number {
  if (typeof requestedSize !== 'number' || isNaN(requestedSize) || requestedSize <= 0) {
    return defaultSize;
  }

  if (requestedSize > maxSafeLimit) {
    return maxSafeLimit;
  }

  return requestedSize;
}

/**
 * 跨域图片安全预检与防污损加载器。
 *
 * 杜绝跨域图片因缺少 Access-Control-Allow-Origin 导致 Canvas 进入 Tainted（污损）状态，
 * 进而导致后续任何 toDataURL() / toBlob() 抛出 SecurityError 严重安全异常。
 *
 * @param src 图片地址（DataURL、Blob URL、相对路径或网络绝对路径）
 * @param crossOrigin 跨域策略，默认为 'anonymous'
 * @returns Promise<SafeImageResult>
 */
export function loadSafeImage(
  src: string | null | undefined,
  crossOrigin = 'anonymous',
): Promise<SafeImageResult> {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return Promise.resolve({
      success: false,
      src: null,
      error: new Error('Logo 图片地址为空'),
    });
  }

  const trimmedSrc = src.trim();

  // 1. DataURL 或 BlobURL 本身即为同源数据，直接放行
  if (trimmedSrc.startsWith('data:') || trimmedSrc.startsWith('blob:')) {
    return Promise.resolve({
      success: true,
      src: trimmedSrc,
    });
  }

  // 2. 浏览器环境下的远程图片 CORS 预检
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve({
      success: true,
      src: trimmedSrc,
    });
  }

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = crossOrigin;

    img.onload = () => {
      resolve({
        success: true,
        src: trimmedSrc,
      });
    };

    img.onerror = () => {
      resolve({
        success: false,
        src: null,
        error: new Error(`Logo 图片跨域放行失败或资源不可达: ${trimmedSrc}`),
      });
    };

    img.src = trimmedSrc;
  });
}

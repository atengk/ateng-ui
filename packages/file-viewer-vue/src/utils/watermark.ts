/**
 * 防篡改安全水印矩阵生成与 DOM 监视引擎。
 *
 * 提供动态 SVG 倾斜平铺水印构造、XML 防注入转义与
 * 基于 MutationObserver 的防篡改自愈能力。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { WatermarkOptions, FileViewerWatermark } from '../types';

/**
 * 水印运行时实例接口。
 */
export interface WatermarkInstance {
  /** 水印 DOM 节点引用 */
  readonly element: HTMLElement;
  /** 销毁水印与解绑所有 MutationObserver 监视器 */
  destroy: () => void;
  /** 手动重新校验与强制恢复水印样式 */
  revalidate: () => void;
}

/**
 * XML / SVG 字符安全转义，防止 XSS 或格式破损。
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 数值区间截断保护。
 */
function clamp(val: unknown, fallback: number, min: number, max: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.min(max, Math.max(min, val));
  }
  return fallback;
}

/**
 * 标准化规范化水印配置对象。
 *
 * @param watermark 水印入参 (布尔值、文本简写或详细配置)
 * @returns 规范化的 WatermarkOptions，禁用时返回 null
 */
export function normalizeWatermark(
  watermark?: FileViewerWatermark | boolean,
): WatermarkOptions | null {
  if (!watermark) {
    return null;
  }

  if (watermark === true) {
    return {
      enabled: true,
      text: 'Confidential',
      fontSize: 16,
      color: 'rgba(0, 0, 0, 0.15)',
      rotate: -22,
      opacity: 0.18,
      gapX: 260,
      gapY: 180,
      width: 200,
      height: 60,
      zIndex: 9999,
    };
  }

  if (typeof watermark === 'string') {
    const trimmed = watermark.trim();
    if (!trimmed) return null;
    return {
      enabled: true,
      text: trimmed,
      fontSize: 16,
      color: 'rgba(0, 0, 0, 0.15)',
      rotate: -22,
      opacity: 0.18,
      gapX: 260,
      gapY: 180,
      width: 200,
      height: 60,
      zIndex: 9999,
    };
  }

  if (watermark.enabled === false) {
    return null;
  }

  if (!watermark.text && !watermark.image) {
    return null;
  }

  return {
    enabled: true,
    text: watermark.text,
    image: watermark.image,
    fontSize: clamp(watermark.fontSize, 16, 10, 72),
    color: watermark.color || 'rgba(0, 0, 0, 0.15)',
    fontFamily: watermark.fontFamily || "Aptos, 'Segoe UI', -apple-system, sans-serif",
    rotate: clamp(watermark.rotate, -22, -85, 85),
    opacity: clamp(watermark.opacity, 0.18, 0.01, 1),
    gapX: clamp(watermark.gapX, 260, 80, 800),
    gapY: clamp(watermark.gapY, 180, 60, 800),
    width: clamp(watermark.width, 200, 40, 800),
    height: clamp(watermark.height, 60, 20, 800),
    zIndex: clamp(watermark.zIndex, 9999, 0, 2147483647),
  };
}

/**
 * 构造平铺单元的动态矢量 SVG 字符串。
 *
 * @param options 水印配置项
 * @returns 矢量 SVG 代码
 */
export function buildWatermarkSvg(options: WatermarkOptions): string {
  const gapX = clamp(options.gapX, 260, 80, 800);
  const gapY = clamp(options.gapY, 180, 60, 800);
  const width = clamp(options.width, 200, 40, gapX);
  const height = clamp(options.height, 60, 20, gapY);
  const rotate = clamp(options.rotate, -22, -85, 85);
  const opacity = clamp(options.opacity, 0.18, 0.01, 1);
  const cx = gapX / 2;
  const cy = gapY / 2;

  if (options.image) {
    const href = escapeXml(options.image);
    const x = (gapX - width) / 2;
    const y = (gapY - height) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${gapX}" height="${gapY}" viewBox="0 0 ${gapX} ${gapY}"><g opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"><image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g></svg>`;
  }

  const text = escapeXml(options.text || 'Confidential');
  const fontSize = clamp(options.fontSize, 16, 10, 72);
  const color = escapeXml(options.color || 'rgba(0, 0, 0, 0.15)');
  const fontFamily = escapeXml(
    options.fontFamily || "Aptos, 'Segoe UI', -apple-system, sans-serif",
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${gapX}" height="${gapY}" viewBox="0 0 ${gapX} ${gapY}"><g opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600">${text}</text></g></svg>`;
}

/**
 * 构造用于 background-image 的 data:image/svg+xml 字符串。
 *
 * @param options 水印配置项
 * @returns DataURL 字符串
 */
export function buildWatermarkDataUrl(options: WatermarkOptions): string {
  const svg = buildWatermarkSvg(options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 在目标容器内挂载防篡改安全水印图层。
 *
 * 内置 MutationObserver 深度监视：
 * 1. 若宿主 DOM 树中被外部脚本恶意 removeChild，自愈重新挂载；
 * 2. 若节点的关键 style (display: none / opacity: 0 / visibility: hidden) 被篡改，立即强制重置恢复。
 *
 * @param container 目标父容器元素
 * @param options 水印配置参数
 * @returns 包含销毁与重置方法的 WatermarkInstance
 */
export function createWatermarkOverlay(
  container: HTMLElement,
  options: WatermarkOptions,
): WatermarkInstance {
  const dataUrl = buildWatermarkDataUrl(options);
  const zIndex = options.zIndex ?? 9999;

  const wm = document.createElement('div');
  wm.className = 'at-file-viewer__watermark';
  wm.setAttribute('aria-hidden', 'true');

  let isApplyingStyle = false;
  let isDestroyed = false;

  const lockedStyle = [
    'position: absolute !important',
    'inset: 0px !important',
    'width: 100% !important',
    'height: 100% !important',
    'pointer-events: none !important',
    `z-index: ${zIndex} !important`,
    `background-image: url("${dataUrl}") !important`,
    'background-repeat: repeat !important',
    'opacity: 1 !important',
    'display: block !important',
    'visibility: visible !important',
  ].join('; ');

  function applyLockedStyle(): void {
    if (isDestroyed) return;
    isApplyingStyle = true;
    wm.setAttribute('style', lockedStyle);
    isApplyingStyle = false;
  }

  // 1. 初次应用样式并加入容器
  applyLockedStyle();
  container.appendChild(wm);

  // 2. 建立 MutationObserver 深度反篡改守卫
  let observer: MutationObserver | null = null;

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(mutations => {
      if (isDestroyed || isApplyingStyle) return;

      for (const m of mutations) {
        // 节点被移除防线：自动重新挂载
        if (m.type === 'childList') {
          if (!container.contains(wm)) {
            isApplyingStyle = true;
            container.appendChild(wm);
            isApplyingStyle = false;
          }
        }
        // 属性篡改防线：自动恢复锁死样式
        else if (m.type === 'attributes') {
          if (wm.getAttribute('style') !== lockedStyle) {
            applyLockedStyle();
          }
        }
      }
    });

    observer.observe(container, { childList: true });
    observer.observe(wm, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  }

  return {
    element: wm,
    revalidate(): void {
      if (isDestroyed) return;
      if (!container.contains(wm)) {
        container.appendChild(wm);
      }
      applyLockedStyle();
    },
    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (wm.parentNode) {
        wm.parentNode.removeChild(wm);
      }
    },
  };
}

/**
 * @atengk/barcode-vue 企业级二维码主题预设常量与解析管道。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { QRCodeOptions, QRCodePreset } from '../types/qrcode';

/**
 * 六大企业级设计主题预设字典。
 */
export const QR_CODE_PRESETS: Record<QRCodePreset, QRCodeOptions> = {
  /**
   * standard: 极简纯黑白直角（高保真打印与极端工业现场首选）。
   */
  standard: {
    type: 'canvas',
    shape: 'square',
    margin: 0,
    dotsOptions: {
      type: 'square',
      color: '#000000',
    },
    cornersSquareOptions: {
      type: 'square',
      color: '#000000',
    },
    cornersDotOptions: {
      type: 'square',
      color: '#000000',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },

  /**
   * industrial: 高对比冷灰钛金（设备铭牌与资产标签专用）。
   */
  industrial: {
    type: 'canvas',
    shape: 'square',
    margin: 4,
    dotsOptions: {
      type: 'rounded',
      color: '#1e293b',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#0f172a',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#0284c7',
    },
    backgroundOptions: {
      color: '#f8fafc',
    },
  },

  /**
   * tech-blue: 现代科技蓝微圆角渐变（SaaS 平台与企业中台）。
   */
  'tech-blue': {
    type: 'canvas',
    shape: 'square',
    margin: 4,
    dotsOptions: {
      type: 'rounded',
      gradient: {
        type: 'linear',
        rotation: 45,
        colorStops: [
          { offset: 0, color: '#1d4ed8' },
          { offset: 1, color: '#06b6d4' },
        ],
      },
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#1e40af',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#2563eb',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },

  /**
   * elegant-dots: 柔和点阵圆角风格（对外营销宣传与单页）。
   */
  'elegant-dots': {
    type: 'canvas',
    shape: 'square',
    margin: 6,
    dotsOptions: {
      type: 'dots',
      color: '#4f46e5',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#4338ca',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#6366f1',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },

  /**
   * classy: 典雅商务风格（高端商务与证书凭据）。
   */
  classy: {
    type: 'canvas',
    shape: 'square',
    margin: 4,
    dotsOptions: {
      type: 'classy',
      color: '#78350f',
    },
    cornersSquareOptions: {
      type: 'classy',
      color: '#451a03',
    },
    cornersDotOptions: {
      type: 'classy',
      color: '#b45309',
    },
    backgroundOptions: {
      color: '#fffbeb',
    },
  },

  /**
   * minimal-fluid: 流体微圆角渐变（移动端 Web 交互）。
   */
  'minimal-fluid': {
    type: 'canvas',
    shape: 'square',
    margin: 4,
    dotsOptions: {
      type: 'classy-rounded',
      gradient: {
        type: 'linear',
        rotation: 135,
        colorStops: [
          { offset: 0, color: '#ec4899' },
          { offset: 1, color: '#8b5cf6' },
        ],
      },
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#8b5cf6',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#ec4899',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },
};

/**
 * 深度克隆纯对象，避免预设配置被调用方外部突变污染。
 *
 * @param obj 待克隆对象
 * @returns 深度克隆后的独立对象
 */
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * 递归深度合并对象。
 *
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的目标对象
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source?: Partial<T>): T {
  if (!source) {
    return target;
  }
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else if (val !== undefined) {
      target[key] = val as T[keyof T];
    }
  }
  return target;
}

/**
 * 解析并组装二维码主题预设配置，支持用户深度覆写。
 *
 * @param preset 主题预设名称，默认为 'standard'
 * @param overrides 用户自定义覆写选项
 * @returns 组装好的最终二维码配置项
 */
export function resolveQRCodePreset(
  preset: QRCodePreset = 'standard',
  overrides?: Partial<QRCodeOptions>,
): QRCodeOptions {
  const basePreset = QR_CODE_PRESETS[preset] || QR_CODE_PRESETS.standard;
  const cloned = deepClone(basePreset);

  if (!overrides) {
    return cloned;
  }

  return deepMerge(
    cloned as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>,
  ) as unknown as QRCodeOptions;
}

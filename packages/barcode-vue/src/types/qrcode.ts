/**
 * @atengk/barcode-vue 艺术二维码与企业级预设核心类型契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type {
  DotType,
  CornerDotType,
  CornerSquareType,
  FileExtension,
  GradientType,
  DrawType,
  ShapeType,
  ErrorCorrectionLevel,
  Mode,
  TypeNumber,
  Gradient,
} from 'qr-code-styling';
import type QRCodeStyling from 'qr-code-styling';

/**
 * 六大企业级设计主题预设。
 * - standard: 极简纯黑白直角（高保真打印与极端工业现场首选）；
 * - industrial: 高对比冷灰钛金（设备铭牌与资产标签专用）；
 * - tech-blue: 现代科技蓝微圆角渐变（SaaS 平台与企业中台）；
 * - elegant-dots: 柔和点阵圆角风格（对外营销宣传与单页）；
 * - classy: 典雅商务风格（高端商务与证书凭据）；
 * - minimal-fluid: 流体微圆角渐变（移动端 Web 交互）。
 */
export type QRCodePreset =
  'standard' | 'industrial' | 'tech-blue' | 'elegant-dots' | 'classy' | 'minimal-fluid';

/**
 * 图像导出支持的格式扩展名。
 */
export type QRCodeExportFormat = 'png' | 'jpeg' | 'svg' | 'blob';

/**
 * 码点配置项。
 */
export interface QRCodeDotsOptions {
  type?: DotType;
  color?: string;
  gradient?: Gradient;
  roundSize?: boolean;
}

/**
 * 码眼外框配置项。
 */
export interface QRCodeCornersSquareOptions {
  type?: CornerSquareType;
  color?: string;
  gradient?: Gradient;
}

/**
 * 码眼中心点配置项。
 */
export interface QRCodeCornersDotOptions {
  type?: CornerDotType;
  color?: string;
  gradient?: Gradient;
}

/**
 * 背景配置项。
 */
export interface QRCodeBackgroundOptions {
  round?: number;
  color?: string;
  gradient?: Gradient;
}

/**
 * 中心 Logo 图像配置项。
 */
export interface QRCodeImageOptions {
  saveAsBlob?: boolean;
  hideBackgroundDots?: boolean;
  imageSize?: number;
  crossOrigin?: string;
  margin?: number;
}

/**
 * 跨域安全图片加载结果。
 */
export interface SafeImageResult {
  /**
   * 是否安全加载成功。
   */
  success: boolean;
  /**
   * 最终可安全赋给 Canvas 渲染的图片 URL（若失败则为 null）。
   */
  src: string | null;
  /**
   * 失败原因或错误对象。
   */
  error?: Error;
}

/**
 * 二维码底层编码配置。
 */
export interface QRCodeEncodingOptions {
  typeNumber?: TypeNumber;
  mode?: Mode;
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

/**
 * 二维码综合配置选项。
 */
export interface QRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  type?: DrawType;
  shape?: ShapeType;
  image?: string;
  /**
   * 中心 Logo 地址（等价于 image）。
   */
  logo?: string;
  /**
   * 是否在传入 Logo 时自动将容错率提升至 Q 或 H（最低提升至 Q 级别，杜绝遮挡导致扫码失败）。
   * @default true
   */
  autoElevateErrorCorrection?: boolean;
  autoDpr?: boolean;
  qrOptions?: QRCodeEncodingOptions;
  imageOptions?: QRCodeImageOptions;
  dotsOptions?: QRCodeDotsOptions;
  cornersSquareOptions?: QRCodeCornersSquareOptions;
  cornersDotOptions?: QRCodeCornersDotOptions;
  backgroundOptions?: QRCodeBackgroundOptions;
}

/**
 * 图像导出配置项。
 */
export interface ExportQRCodeOptions {
  format?: QRCodeExportFormat;
  filename?: string;
  quality?: number;
  scale?: number;
  background?: string;
}

/**
 * 图像下载配置项。
 */
export interface DownloadQRCodeOptions extends ExportQRCodeOptions {
  filename?: string;
}

/**
 * useQRCode 状态机返回值契约。
 */
export interface UseQRCodeReturn {
  /**
   * 底层 qr-code-styling 实例引用。
   */
  readonly qrCodeInstance: import('vue').ShallowRef<QRCodeStyling | null>;
  /**
   * 当前是否已成功挂载渲染。
   */
  readonly isRendered: import('vue').Ref<boolean>;
  /**
   * 渲染异常对象（若有）。
   */
  readonly error: import('vue').Ref<Error | null>;
  /**
   * Logo 图片跨域或加载异常（若有，不阻断二维码本身渲染）。
   */
  readonly logoError: import('vue').Ref<Error | null>;
  /**
   * 手动触发重绘刷新。
   */
  refresh: () => Promise<void>;
  /**
   * 更新二维码配置并重绘。
   */
  update: (newOptions?: Partial<QRCodeOptions>) => Promise<void>;
  /**
   * 导出二维码图像数据（DataURL 或 Blob）。
   */
  exportAsImage: (options?: ExportQRCodeOptions) => Promise<string | Blob>;
  /**
   * 一键触发浏览器端图像下载。
   */
  download: (options?: DownloadQRCodeOptions) => Promise<void>;
}

export type {
  DotType,
  CornerDotType,
  CornerSquareType,
  FileExtension,
  GradientType,
  DrawType,
  ShapeType,
  ErrorCorrectionLevel,
  Mode,
  TypeNumber,
  Gradient,
};

/**
 * 图片裁剪与图像处理领域强类型契约与接口定义。
 *
 * 遵循 ADR-0048 确立的数据契约与导出管道规范。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Ref } from 'vue';

/**
 * 裁剪支持的图片源类型。
 */
export type CropperSource = string | Blob | File | null | undefined;

/**
 * 裁切框形状。
 */
export type CropperShape = 'rect' | 'circle';

/**
 * 拖拽模式。
 */
export type CropperDragMode = 'crop' | 'move' | 'none';

/**
 * 视口模式。
 */
export type CropperViewMode = 0 | 1 | 2 | 3;

/**
 * 高频业务场景预设。
 */
export type CropperPreset = 'avatar' | 'banner' | 'product' | 'id-card' | 'free';

/**
 * 物理像素级别的几何度量裁切坐标。
 */
export interface CropperCropData {
  /** 裁剪区域左上角 X 轴偏移（像素） */
  x: number;
  /** 裁剪区域左上角 Y 轴偏移（像素） */
  y: number;
  /** 裁剪区域宽度（像素） */
  width: number;
  /** 裁剪区域高度（像素） */
  height: number;
  /** 旋转角度（度） */
  rotate: number;
  /** 水平翻转缩放倍率 */
  scaleX: number;
  /** 垂直翻转缩放倍率 */
  scaleY: number;
}

/**
 * 视口容器中裁切框的渲染尺寸与坐标。
 */
export interface CropperBoxData {
  /** 裁切框距离容器左侧的距离（像素） */
  left: number;
  /** 裁切框距离容器顶部的距离（像素） */
  top: number;
  /** 裁切框渲染宽度（像素） */
  width: number;
  /** 裁切框渲染高度（像素） */
  height: number;
}

/**
 * 离屏 Canvas 防伪倾斜水印配置契约。
 */
export interface CropperWatermarkOptions {
  /** 水印文字内容，如 "仅供实名认证使用" */
  text: string;
  /** 水印文字颜色与透明度，默认 "rgba(180, 180, 180, 0.4)" */
  color?: string;
  /** 水印字号大小（像素），默认按画布尺寸自适应计算 */
  fontSize?: number;
  /** 水印倾斜旋转角度（度），默认 -22 度 */
  rotate?: number;
  /** 是否全图网格平铺重复，默认 true */
  repeat?: boolean;
}

/**
 * 裁剪导出管道配置契约。
 */
export interface CropperExportOptions {
  /** 目标导出图片 MIME 类型，默认 "image/png" */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** 导出质量（0.1 ~ 1.0），默认 0.92 */
  quality?: number;
  /** 导出图片最大宽度上限（像素），默认 4096 */
  maxWidth?: number;
  /** 导出图片最大高度上限（像素），默认 4096 */
  maxHeight?: number;
  /** 背景填充色，如 JPEG 下透明底填充色，默认 "#ffffff" */
  fillColor?: string;
  /** 圆形模式下是否执行物理透明 Alpha 切片，默认 true */
  clipCircle?: boolean;
  /** 目标最大文件体积上限（字节），超出时触发二分质量逼近与步进降采样压缩 */
  maxByteSize?: number;
  /** 声明式倾斜防伪水印选项 */
  watermark?: CropperWatermarkOptions;
}

/**
 * 结构化裁切最终输出结果契约。
 */
export interface CropperResult {
  /** 导出的二进制 Blob 数据，适合直接追加至 FormData 上传 */
  blob: Blob;
  /** 导出的带类型 File 实例 */
  file: File;
  /** 导出的 Base64 Data URL 字符串，适合前端轻量即时回显 */
  dataUrl: string;
  /** 物理像素级别的几何裁切坐标元数据 */
  data: CropperCropData;
  /** 视口容器内裁切框物理坐标 */
  cropBoxData: CropperBoxData;
}

/**
 * `<AtengCropper />` 基础容器组件 Props 契约。
 */
export interface AtengCropperProps {
  /** 图片数据源（支持 HTTP URL、Data URL、Blob URL、Blob、File） */
  source?: CropperSource;
  /** 裁剪框宽高比（如 1、16/9、4/3），为 NaN 时不锁定自由裁剪 */
  aspectRatio?: number;
  /** 视口模式，默认 1（限制裁剪框不超过画布大小） */
  viewMode?: CropperViewMode;
  /** 拖拽模式，默认 "crop" */
  dragMode?: CropperDragMode;
  /** 裁切框形状，默认 "rect" */
  shape?: CropperShape;
  /** 是否开启容器尺寸变动几何自感知自愈，默认 true */
  responsive?: boolean;
  /** 远程图片跨域请求凭据策略，默认 "anonymous" */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  /** 是否自动读取并校正 EXIF 旋转信息，默认 true */
  checkOrientation?: boolean;
  /** 是否禁用交互 */
  disabled?: boolean;
  /** 自定义根容器样式类名 */
  customClass?: string;
}

/**
 * `<AtengCropperModal />` 脱壳模态弹窗组件 Props 契约。
 */
export interface AtengCropperModalProps extends AtengCropperProps {
  /** 模态弹窗显隐双向绑定 */
  modelValue?: boolean;
  /** 弹窗标题，默认 "图片裁剪" */
  title?: string;
  /** 弹窗宽度，默认 "840px" */
  width?: string;
  /** 快捷场景预设，默认 "avatar" */
  preset?: CropperPreset;
  /** 是否在右侧展示多尺寸缩略预览面板，默认 true */
  showPreview?: boolean;
  /** 预览面板展示的尺寸列表，默认 [128, 64, 32] */
  previewSizes?: number[];
  /** 是否允许按 Ctrl+V / Cmd+V 自动捕获剪贴板图片，默认 true */
  pasteable?: boolean;
  /** 导出文件名（不含或含扩展名），默认自动根据时间戳生成 */
  fileName?: string;
  /** 导出选项配置 */
  exportOptions?: CropperExportOptions;
  /** 确认按钮文本，默认 "确定" */
  confirmText?: string;
  /** 取消按钮文本，默认 "取消" */
  cancelText?: string;
}

/**
 * `<AtengCropperPreview />` 实时预览组件 Props 契约。
 */
export interface AtengCropperPreviewProps {
  /** 预览规格尺寸列表（像素） */
  sizes?: number[];
  /** 预览遮罩形状，默认跟随裁剪器或 "rect" */
  shape?: CropperShape;
  /** 自定义外层样式类名 */
  customClass?: string;
}

/**
 * 无头状态机 `useCropper` 返回的核心操作与响应式状态契约。
 */
export interface UseCropperReturn {
  /** 实例是否已完成初始化并就绪 */
  ready: Readonly<Ref<boolean>>;
  /** 图片加载、异步压缩或导出中状态 */
  loading: Readonly<Ref<boolean>>;
  /** 当前物理像素级裁切区域几何坐标 */
  data: Readonly<Ref<CropperCropData>>;
  /** 视口容器内裁切框物理坐标 */
  cropBoxData: Readonly<Ref<CropperBoxData>>;
  /** 当前缩放倍率 */
  zoomRatio: Readonly<Ref<number>>;
  /** 当前旋转角度 */
  rotateAngle: Readonly<Ref<number>>;
  /** 缩放指定比例 */
  zoom: (ratio: number) => void;
  /** 绝对缩放到指定比例 */
  zoomTo: (ratio: number) => void;
  /** 旋转指定角度（度） */
  rotate: (degree: number) => void;
  /** 绝对旋转到指定角度（度） */
  rotateTo: (degree: number) => void;
  /** 水平镜像翻转 */
  flipX: () => void;
  /** 垂直镜像翻转 */
  flipY: () => void;
  /** 动态设置裁切长宽比 */
  setAspectRatio: (aspectRatio: number) => void;
  /** 设置拖拽模式 */
  setDragMode: (mode: CropperDragMode) => void;
  /** 动态替换图片源 */
  replace: (source: CropperSource) => Promise<void>;
  /** 重置裁剪状态与位置至初始值 */
  reset: () => void;
  /** 清除裁剪区域 */
  clear: () => void;
  /** 多轨导出：二进制 Blob */
  exportBlob: (options?: CropperExportOptions) => Promise<Blob>;
  /** 多轨导出：带类型 File */
  exportFile: (fileName?: string, options?: CropperExportOptions) => Promise<File>;
  /** 多轨导出：Base64 DataURL */
  exportDataUrl: (options?: CropperExportOptions) => string;
  /** 多轨导出：HTMLCanvasElement */
  exportCanvas: (options?: CropperExportOptions) => HTMLCanvasElement;
  /** 导出完整结构体结果 */
  exportResult: (fileName?: string, options?: CropperExportOptions) => Promise<CropperResult>;
  /** 销毁实例与释放跟踪的所有临时资源 */
  destroy: () => void;
}

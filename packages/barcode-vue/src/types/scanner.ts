/**
 * @atengk/barcode-vue 摄像头扫码器与无头状态机强类型契约。
 *
 * 依据 ADR-0047，定义扫码构型、设备枚举、硬件生命周期与事件强类型。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Ref } from 'vue';

/**
 * 扫码识别模式联合。
 * - 'qr-code': 专扫二维码（自动收敛为 QR/DataMatrix/Aztec/PDF417，正方形取景框）
 * - 'barcode': 专扫一维条码（收敛为 Code128/EAN/ITF 等，宽屏狭长取景框，大幅降低 CPU 功耗）
 * - 'all': 混合全模式识别
 */
export type ScanMode = 'qr-code' | 'barcode' | 'all';

/**
 * 摄像头硬件朝向。
 * - 'environment': 后置主摄像头（默认）
 * - 'user': 前置自拍镜头
 */
export type ScannerFacingMode = 'environment' | 'user';

/**
 * 取景框尺寸规格定义。
 */
export interface QrBoxDimensions {
  /** 取景框宽度 (px) */
  width: number;
  /** 取景框高度 (px) */
  height: number;
}

/**
 * 动态取景框自适应计算函数。
 *
 * @param viewfinderWidth 视频取景器当前物理渲染宽度
 * @param viewfinderHeight 视频取景器当前物理渲染高度
 * @returns 计算后的取景框尺寸
 */
export type QrBoxFunction = (viewfinderWidth: number, viewfinderHeight: number) => QrBoxDimensions;

/**
 * 取景框配置联合类型。
 */
export type QrBoxConfig = number | QrBoxDimensions | QrBoxFunction;

/**
 * 摄像头硬件设备描述信息。
 */
export interface ScannerCameraDevice {
  /** 摄像头唯一硬件设备 ID */
  id: string;
  /** 摄像头人类可读标签名称 */
  label: string;
}

/**
 * 扫码成功解码结果结构。
 */
export interface ScanResult {
  /** 解码得到的纯文本内容 */
  text: string;
  /** 码制格式名称（例如 'QR_CODE', 'CODE_128', 'EAN_13' 等） */
  format?: string;
  /** 底层原始识别结果对象 */
  rawResult?: unknown;
}

/**
 * 扫码器无头启动配置项。
 */
export interface StartScanOptions {
  /** 扫码模式，默认 'all' */
  scanMode?: ScanMode;
  /** 摄像头朝向，默认 'environment' */
  facingMode?: ScannerFacingMode;
  /** 指定的具体摄像头硬件设备 ID（若指定则优先于 facingMode） */
  cameraId?: string;
  /** 扫描帧率 (fps)，默认 10 */
  fps?: number;
  /** 视频画面长宽比 (例如 1.777778 表示 16:9，1.333333 表示 4:3) */
  aspectRatio?: number;
  /** 取景框尺寸或动态计算函数，若不传则基于 scanMode 自动构型 */
  qrbox?: QrBoxConfig;
  /** 底层解码格式枚举数组，若不传则基于 scanMode 自动收敛 */
  formatsToSupport?: number[];
  /** 页面切入后台时是否自动停轨释放硬件，切回前台自动恢复，默认 true */
  autoManageLifecycle?: boolean;
  /** 是否在支持时使用平台原生 BarcodeDetector 硬件加速，默认 false */
  useBarCodeDetectorIfSupported?: boolean;
}

/**
 * 无头扫码器状态机 Hook 返回对象契约。
 */
export interface UseCodeScannerReturn {
  /** 是否处于视频流持续扫描运行中 */
  isScanning: Readonly<Ref<boolean>>;
  /** 是否正在异步加载引擎或启动摄像头 */
  isLoading: Readonly<Ref<boolean>>;
  /** 扫描流是否处于临时暂停状态 */
  isPaused: Readonly<Ref<boolean>>;
  /** 手电筒补光灯是否已开启 */
  torchActive: Readonly<Ref<boolean>>;
  /** 当前活动摄像头是否支持手电筒补光能力 */
  torchSupported: Readonly<Ref<boolean>>;
  /** 系统已枚举的可用摄像头设备列表（保底返回空数组 []） */
  cameras: Readonly<Ref<readonly ScannerCameraDevice[]>>;
  /** 当前正在使用的摄像头硬件设备 ID */
  currentCameraId: Readonly<Ref<string | null>>;
  /** 运行时异常或权限拒绝错误对象 */
  error: Readonly<Ref<Error | null>>;

  /**
   * 启动指定 DOM 容器上的摄像头扫码。
   *
   * @param elementOrId DOM 元素或其唯一 elementId 字符串
   * @param options 启动配置选项
   */
  start: (elementOrId: string | HTMLElement, options?: StartScanOptions) => Promise<void>;

  /**
   * 彻底停止扫码、停用视频轨道并释放摄像头硬件与 Worker 资源。
   */
  stop: () => Promise<void>;

  /**
   * 临时暂停扫码解码（可保持画面静止）。
   */
  pause: () => void;

  /**
   * 恢复扫码解码。
   */
  resume: () => void;

  /**
   * 切换手电筒补光灯开/关。
   *
   * @returns 切换后的补光灯状态，若不支持则返回 false
   */
  toggleTorch: () => Promise<boolean>;

  /**
   * 切换摄像头设备或镜头朝向。
   *
   * @param targetCamera 设备 ID 字符串或镜头朝向 ('environment' | 'user')
   */
  switchCamera: (targetCamera: string | ScannerFacingMode) => Promise<void>;

  /**
   * 主动枚举当前系统可用的摄像头列表。
   *
   * @returns 摄像头设备列表，无可用时保底返回 []
   */
  getCameras: () => Promise<ScannerCameraDevice[]>;
}

/**
 * AtengCodeScanner 表现容器 Props 配置契约。
 */
export interface AtengCodeScannerProps {
  /** 扫码识别模式，默认 'all' */
  scanMode?: ScanMode;
  /** 镜头朝向，默认 'environment' */
  facingMode?: ScannerFacingMode;
  /** 指定的摄像头硬件设备 ID */
  cameraId?: string;
  /** 扫描帧率 (fps)，默认 10 */
  fps?: number;
  /** 视频画面长宽比 (例如 1.777778 表示 16:9) */
  aspectRatio?: number;
  /** 自定义取景框规格或计算函数 */
  qrbox?: QrBoxConfig;
  /** 组件挂载后是否自动启动摄像头扫码，默认 true */
  autoStart?: boolean;
  /** 是否展示内建半透明控制工具栏，默认 true */
  showControls?: boolean;
  /** 是否展示手电筒补光按钮，默认 true */
  showTorchButton?: boolean;
  /** 是否展示镜头翻转按钮，默认 true */
  showSwitchCameraButton?: boolean;
  /** 是否展示激光扫描线动画，默认 true */
  showLaser?: boolean;
  /** 引擎加载与相机启动过程中的提示文案 */
  loadingText?: string;
}

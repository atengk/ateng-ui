/**
 * @atengk/barcode-vue useCodeScanner 无头扫码器状态机。
 *
 * 依据 ADR-0047，提供动态按需懒加载、多摄像头切换、手电筒补光、
 * 长宽比构型自适应与确定性生命周期治理（后台防发热与卸载停轨）。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue';
import type {
  UseCodeScannerReturn,
  StartScanOptions,
  ScannerCameraDevice,
  ScannerFacingMode,
  ScanResult,
} from '../types/scanner';
import {
  loadHtml5Qrcode,
  resolveFormatsForScanMode,
  resolveAdaptiveQrBox,
} from '../utils/scannerLoader';

export interface UseCodeScannerOptions {
  /** 扫码成功全局通知钩子 */
  onScan?: (result: ScanResult) => void;
  /** 扫码失败或异常诊断钩子 */
  onError?: (error: Error) => void;
}

/** 底层 html5-qrcode 实例抽象驱动契约，杜绝生产代码裸 any */
interface Html5QrcodeInstanceDriver {
  start: (
    cameraIdOrConfig: unknown,
    configuration: unknown,
    onSuccess: (decodedText: string, rawResult: unknown) => void,
    onError: (errorMessage: string) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  clear?: () => void;
  getRunningTrackCapabilities?: () => { torch?: boolean };
  applyVideoConstraints: (constraints: unknown) => Promise<null>;
}

/**
 * 摄像头扫码器无头状态机 Hook。
 *
 * @param hookOptions 基础钩子配置
 * @returns 扫码器受管状态与控制方法门面
 */
export function useCodeScanner(hookOptions?: UseCodeScannerOptions): UseCodeScannerReturn {
  const isScanning = ref(false);
  const isLoading = ref(false);
  const isPaused = ref(false);
  const torchActive = ref(false);
  const torchSupported = ref(false);
  const cameras = ref<ScannerCameraDevice[]>([]);
  const currentCameraId = ref<string | null>(null);
  const error = ref<Error | null>(null);

  // 内部保持的底层实例与状态标记
  let html5QrcodeInstance: Html5QrcodeInstanceDriver | null = null;
  let currentTargetElementId: string | null = null;
  let activeOptions: StartScanOptions | null = null;
  let autoPausedByVisibility = false;

  /**
   * 枚举系统可用的摄像头设备列表。
   *
   * 严守十二道防线之空安全保底，异常或无设备时 100% 返回空数组 []。
   */
  const getCameras = async (): Promise<ScannerCameraDevice[]> => {
    try {
      const { Html5Qrcode } = await loadHtml5Qrcode();
      const rawDevices = await Html5Qrcode.getCameras();
      if (!Array.isArray(rawDevices)) {
        cameras.value = [];
        return [];
      }
      const formatted: ScannerCameraDevice[] = rawDevices.map((dev: unknown) => {
        const item = (dev && typeof dev === 'object' ? dev : {}) as Record<string, unknown>;
        return {
          id: String(item.id ?? ''),
          label: String(item.label ?? `摄像头 ${item.id ?? ''}`),
        };
      });
      cameras.value = formatted;
      return formatted;
    } catch {
      // 捕获权限被拒或无设备错误，空安全降级
      cameras.value = [];
      return [];
    }
  };

  /**
   * 彻底停止扫码并释放硬件轨道与解码 Worker。
   */
  const stop = async (): Promise<void> => {
    isScanning.value = false;
    isPaused.value = false;
    torchActive.value = false;
    torchSupported.value = false;
    autoPausedByVisibility = false;

    const instance = html5QrcodeInstance;
    html5QrcodeInstance = null;

    if (!instance) {
      return;
    }

    try {
      await instance.stop();
      if (typeof instance.clear === 'function') {
        instance.clear();
      }
    } catch {
      // 容错吸收重复停止异常
    }
  };

  /**
   * 启动指定 DOM 容器上的摄像头扫码。
   */
  const start = async (
    elementOrId: string | HTMLElement,
    options?: StartScanOptions,
  ): Promise<void> => {
    // 若当前已有活动扫码，先停止释放
    if (isScanning.value) {
      await stop();
    }

    isLoading.value = true;
    error.value = null;
    activeOptions = { ...options };

    try {
      // 解析目标容器 elementId
      let elementId: string;
      if (typeof elementOrId === 'string') {
        elementId = elementOrId;
      } else {
        if (!elementOrId.id) {
          elementOrId.id = `at-code-scanner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        }
        elementId = elementOrId.id;
      }
      currentTargetElementId = elementId;

      // 动态按需加载 html5-qrcode
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await loadHtml5Qrcode();

      // 解码格式与取景框算法收敛
      const scanMode = options?.scanMode ?? 'all';
      const formatsToSupport =
        options?.formatsToSupport ??
        resolveFormatsForScanMode(
          scanMode,
          Html5QrcodeSupportedFormats as unknown as Record<string, number>,
        );
      const adaptiveQrBox = resolveAdaptiveQrBox(scanMode, options?.qrbox);

      // 创建底层扫描器实例
      const scannerConfig = {
        formatsToSupport,
        useBarCodeDetectorIfSupported: options?.useBarCodeDetectorIfSupported ?? false,
        verbose: false,
      };
      const createdInstance = new Html5Qrcode(
        elementId,
        scannerConfig,
      ) as unknown as Html5QrcodeInstanceDriver;
      html5QrcodeInstance = createdInstance;

      // 确定摄像头配置
      let cameraConfigOrId: unknown;
      if (options?.cameraId) {
        cameraConfigOrId = options.cameraId;
        currentCameraId.value = options.cameraId;
      } else {
        const facing = options?.facingMode ?? 'environment';
        cameraConfigOrId = { facingMode: facing };
        currentCameraId.value = null;
      }

      // 相机采集与渲染配置
      const scanConfig: Record<string, unknown> = {
        fps: options?.fps ?? 10,
        qrbox: adaptiveQrBox,
      };
      if (options?.aspectRatio) {
        scanConfig.aspectRatio = options.aspectRatio;
      }

      // 启动底层相机流
      await createdInstance.start(
        cameraConfigOrId,
        scanConfig,
        (decodedText: string, rawResult: unknown) => {
          let resolvedFormat: string | undefined;
          if (rawResult && typeof rawResult === 'object') {
            const rawObj = rawResult as Record<string, unknown>;
            const subResult = rawObj.result as Record<string, unknown> | undefined;
            const formatObj = subResult?.format as Record<string, unknown> | undefined;
            if (formatObj?.formatName) {
              resolvedFormat = String(formatObj.formatName);
            } else if (rawObj.format && typeof rawObj.format === 'object') {
              resolvedFormat = String((rawObj.format as Record<string, unknown>).name ?? '');
            }
          }

          const result: ScanResult = {
            text: decodedText,
            format: resolvedFormat,
            rawResult,
          };
          hookOptions?.onScan?.(result);
        },
        (_errorMessage: string) => {
          // 常规未检测到条码的帧轮询错误不向外抛出
        },
      );

      isScanning.value = true;
      isPaused.value = false;

      // 探测手电筒补光能力
      try {
        const capabilities = createdInstance.getRunningTrackCapabilities?.();
        torchSupported.value = Boolean(capabilities?.torch);
      } catch {
        torchSupported.value = false;
      }
    } catch (err: unknown) {
      const normalizedError =
        err instanceof Error ? err : new Error(String(err ?? '启动扫码器失败'));
      error.value = normalizedError;
      hookOptions?.onError?.(normalizedError);
      await stop();
      throw normalizedError;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 临时暂停扫码解码。
   */
  const pause = (): void => {
    if (!html5QrcodeInstance || !isScanning.value || isPaused.value) {
      return;
    }
    try {
      html5QrcodeInstance.pause();
      isPaused.value = true;
    } catch {
      // 容错处理
    }
  };

  /**
   * 恢复扫码解码。
   */
  const resume = (): void => {
    if (!html5QrcodeInstance || !isScanning.value || !isPaused.value) {
      return;
    }
    try {
      html5QrcodeInstance.resume();
      isPaused.value = false;
    } catch {
      // 容错处理
    }
  };

  /**
   * 切换手电筒补光灯状态。
   */
  const toggleTorch = async (): Promise<boolean> => {
    if (!html5QrcodeInstance || !isScanning.value) {
      return false;
    }

    const nextState = !torchActive.value;
    try {
      await html5QrcodeInstance.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      torchActive.value = nextState;
      return nextState;
    } catch {
      return torchActive.value;
    }
  };

  /**
   * 切换摄像头设备或镜头朝向。
   */
  const switchCamera = async (targetCamera: string | ScannerFacingMode): Promise<void> => {
    if (!currentTargetElementId) {
      return;
    }

    const newOptions: StartScanOptions = {
      ...(activeOptions ?? {}),
    };

    if (targetCamera === 'environment' || targetCamera === 'user') {
      newOptions.facingMode = targetCamera;
      delete newOptions.cameraId;
    } else {
      newOptions.cameraId = targetCamera;
      delete newOptions.facingMode;
    }

    await start(currentTargetElementId, newOptions);
  };

  // -------------------------------------------------------------
  // 硬件生命周期治理：后台防发热与卸载自动清理 (ADR-0047 防线 2)
  // -------------------------------------------------------------
  const handleVisibilityChange = (): void => {
    if (activeOptions?.autoManageLifecycle === false) {
      return;
    }

    if (document.visibilityState === 'hidden') {
      if (isScanning.value && !isPaused.value) {
        pause();
        autoPausedByVisibility = true;
      }
    } else if (document.visibilityState === 'visible') {
      if (autoPausedByVisibility) {
        resume();
        autoPausedByVisibility = false;
      }
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // 确保在组件/作用域卸载时 100% 销毁清理
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      stop();
    });
  }

  return {
    isScanning: readonly(isScanning),
    isLoading: readonly(isLoading),
    isPaused: readonly(isPaused),
    torchActive: readonly(torchActive),
    torchSupported: readonly(torchSupported),
    cameras: readonly(cameras),
    currentCameraId: readonly(currentCameraId),
    error: readonly(error),
    start,
    stop,
    pause,
    resume,
    toggleTorch,
    switchCamera,
    getCameras,
  };
}

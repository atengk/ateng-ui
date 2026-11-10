/**
 * @atengk/barcode-vue useCodeScanner 无头状态机与硬件生命周期治理单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope } from 'vue';
import { useCodeScanner } from '../src/composables/useCodeScanner';
import { setScannerEngineMock, resetScannerEngineMock } from '../src/utils/scannerLoader';

describe('useCodeScanner (无头状态机与硬件生命周期)', () => {
  let mockHtml5QrcodeInstance: any;

  beforeEach(() => {
    // 构造模拟的 Html5Qrcode 实例与类
    mockHtml5QrcodeInstance = {
      start: vi.fn().mockResolvedValue(null),
      stop: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      clear: vi.fn(),
      getState: vi.fn().mockReturnValue(2), // 2 = SCANNING
      getRunningTrackCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyVideoConstraints: vi.fn().mockResolvedValue(null),
    };

    const MockHtml5Qrcode = vi.fn().mockImplementation(() => mockHtml5QrcodeInstance);
    (MockHtml5Qrcode as any).getCameras = vi.fn().mockResolvedValue([
      { id: 'cam-1', label: '后置主摄' },
      { id: 'cam-2', label: '前置镜头' },
    ]);

    const mockSupportedFormats = {
      QR_CODE: 0,
      CODE_128: 5,
      EAN_13: 9,
    };

    setScannerEngineMock({
      Html5Qrcode: MockHtml5Qrcode,
      Html5QrcodeSupportedFormats: mockSupportedFormats,
      Html5QrcodeScannerState: {
        UNKNOWN: 0,
        NOT_STARTED: 1,
        SCANNING: 2,
        PAUSED: 3,
      },
    });
  });

  afterEach(() => {
    resetScannerEngineMock();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('初始状态与空安全返回', () => {
    it('应具有正确的初始响应式状态，空安全保底', () => {
      const scanner = useCodeScanner();

      expect(scanner.isScanning.value).toBe(false);
      expect(scanner.isLoading.value).toBe(false);
      expect(scanner.isPaused.value).toBe(false);
      expect(scanner.torchActive.value).toBe(false);
      expect(scanner.torchSupported.value).toBe(false);
      expect(scanner.cameras.value).toEqual([]);
      expect(scanner.currentCameraId.value).toBeNull();
      expect(scanner.error.value).toBeNull();
    });

    it('getCameras 在异常或无摄像头时保底返回空数组 []', async () => {
      const loader = await import('../src/utils/scannerLoader');
      const { Html5Qrcode } = (await loader.loadHtml5Qrcode()) as any;
      (Html5Qrcode as any).getCameras = vi.fn().mockRejectedValue(new Error('Devices not found'));

      const scanner = useCodeScanner();
      const cameras = await scanner.getCameras();
      expect(cameras).toEqual([]);
      expect(scanner.cameras.value).toEqual([]);
    });
  });

  describe('扫描启动与流程流转', () => {
    it('正常启动扫码并调用底层 Html5Qrcode.start', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target';
      document.body.appendChild(container);

      const startPromise = scanner.start('scanner-target', {
        scanMode: 'barcode',
      });

      await startPromise;

      expect(scanner.isScanning.value).toBe(true);
      expect(scanner.isLoading.value).toBe(false);
      expect(mockHtml5QrcodeInstance.start).toHaveBeenCalled();
    });

    it('调用 pause 和 resume 能够正确触发底层操作与状态更新', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target-2';
      document.body.appendChild(container);

      await scanner.start(container);

      scanner.pause();
      expect(scanner.isPaused.value).toBe(true);
      expect(mockHtml5QrcodeInstance.pause).toHaveBeenCalled();

      scanner.resume();
      expect(scanner.isPaused.value).toBe(false);
      expect(mockHtml5QrcodeInstance.resume).toHaveBeenCalled();
    });

    it('toggleTorch 能够切换手电筒补光状态', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target-3';
      document.body.appendChild(container);

      await scanner.start(container);

      const state1 = await scanner.toggleTorch();
      expect(state1).toBe(true);
      expect(scanner.torchActive.value).toBe(true);
      expect(mockHtml5QrcodeInstance.applyVideoConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }],
      });

      const state2 = await scanner.toggleTorch();
      expect(state2).toBe(false);
      expect(scanner.torchActive.value).toBe(false);
    });

    it('stop 能够优雅停止扫描并清理实例', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target-4';
      document.body.appendChild(container);

      await scanner.start(container);
      expect(scanner.isScanning.value).toBe(true);

      await scanner.stop();
      expect(scanner.isScanning.value).toBe(false);
      expect(mockHtml5QrcodeInstance.stop).toHaveBeenCalled();
    });

    it('扫码成功时能正确触发 hookOptions.onScan 回调', async () => {
      let scanSuccessCallback: any;
      mockHtml5QrcodeInstance.start = vi.fn().mockImplementation((_cam, _cfg, successCb) => {
        scanSuccessCallback = successCb;
        return Promise.resolve(null);
      });

      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const container = document.createElement('div');
      container.id = 'scanner-target-scan';
      document.body.appendChild(container);

      await scanner.start(container);

      // 模拟底层识别出条码
      scanSuccessCallback('6901234567890', {
        result: { format: { formatName: 'EAN_13' } },
      });

      expect(onScan).toHaveBeenCalledWith({
        text: '6901234567890',
        format: 'EAN_13',
        rawResult: expect.anything(),
      });
    });

    it('switchCamera 能够重启扫描并应用新的镜头参数', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target-switch';
      document.body.appendChild(container);

      await scanner.start(container, { facingMode: 'environment' });

      await scanner.switchCamera('user');
      expect(scanner.isScanning.value).toBe(true);
      expect(mockHtml5QrcodeInstance.start).toHaveBeenLastCalledWith(
        { facingMode: 'user' },
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('当启动底层相机拒绝时应触发 onError 并优雅降级', async () => {
      mockHtml5QrcodeInstance.start = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const onError = vi.fn();
      const scanner = useCodeScanner({ onError });

      const container = document.createElement('div');
      container.id = 'scanner-target-err';
      document.body.appendChild(container);

      await expect(scanner.start(container)).rejects.toThrow('Permission denied');
      expect(onError).toHaveBeenCalled();
      expect(scanner.isScanning.value).toBe(false);
      expect(scanner.error.value?.message).toBe('Permission denied');
    });
  });

  describe('生命周期治理与后台防发热守卫', () => {
    it('当页面隐藏 (visibilitychange: hidden) 时自动暂停释放，切回前台时自动恢复', async () => {
      const scanner = useCodeScanner();
      const container = document.createElement('div');
      container.id = 'scanner-target-5';
      document.body.appendChild(container);

      await scanner.start(container, { autoManageLifecycle: true });
      expect(scanner.isScanning.value).toBe(true);

      // 模拟切入后台
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockHtml5QrcodeInstance.pause).toHaveBeenCalled();
      expect(scanner.isPaused.value).toBe(true);

      // 模拟切回前台
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockHtml5QrcodeInstance.resume).toHaveBeenCalled();
      expect(scanner.isPaused.value).toBe(false);
    });

    it('Scope 销毁 (onScopeDispose) 时 100% 销毁扫码器与句柄', async () => {
      const scope = effectScope();
      let scanner: any;

      scope.run(() => {
        scanner = useCodeScanner();
      });

      const container = document.createElement('div');
      container.id = 'scanner-target-6';
      document.body.appendChild(container);

      await scanner.start(container);
      expect(scanner.isScanning.value).toBe(true);

      // 销毁 scope
      scope.stop();

      expect(mockHtml5QrcodeInstance.stop).toHaveBeenCalled();
      expect(scanner.isScanning.value).toBe(false);
    });
  });
});

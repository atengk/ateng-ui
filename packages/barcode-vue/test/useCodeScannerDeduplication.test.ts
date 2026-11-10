/**
 * @atengk/barcode-vue useCodeScanner 连续去重冷却与文件解码单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCodeScanner } from '../src/composables/useCodeScanner';
import { setScannerEngineMock, resetScannerEngineMock } from '../src/utils/scannerLoader';
import { setAudioContextMock, resetAudioContextMock } from '../src/utils/audioFeedback';

describe('useCodeScanner (连续去重冷却与文件解码)', () => {
  let mockHtml5QrcodeInstance: any;
  let scanSuccessCallback: any;

  beforeEach(() => {
    // 注入 AudioContext Mock
    setAudioContextMock({
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
    });

    mockHtml5QrcodeInstance = {
      start: vi.fn().mockImplementation((_cam, _cfg, successCb) => {
        scanSuccessCallback = successCb;
        return Promise.resolve(null);
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      clear: vi.fn(),
      scanFileV2: vi.fn().mockResolvedValue({
        decodedText: 'FILE_MOCK_BARCODE_888',
        result: { format: { formatName: 'QR_CODE' } },
      }),
      getState: vi.fn().mockReturnValue(2),
      getRunningTrackCapabilities: vi.fn().mockReturnValue({ torch: false }),
      applyVideoConstraints: vi.fn().mockResolvedValue(null),
    };

    const MockHtml5Qrcode = vi.fn().mockImplementation(() => mockHtml5QrcodeInstance);
    (MockHtml5Qrcode as any).getCameras = vi.fn().mockResolvedValue([]);

    setScannerEngineMock({
      Html5Qrcode: MockHtml5Qrcode,
      Html5QrcodeSupportedFormats: { QR_CODE: 0, CODE_128: 5 },
      Html5QrcodeScannerState: { SCANNING: 2 },
    });
  });

  afterEach(() => {
    resetScannerEngineMock();
    resetAudioContextMock();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('流水线连续扫码同码冷却与异码零延迟', () => {
    it('连续模式下同码在冷却时间窗口 (1500ms) 内快速触发只派发 1 次', async () => {
      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const container = document.createElement('div');
      container.id = 'dedup-container-1';
      document.body.appendChild(container);

      await scanner.start(container, {
        interactionMode: 'continuous',
        duplicateIntervalMs: 1500,
      });

      // 快速连续触发 3 次相同的条码
      scanSuccessCallback('6901234567890', { result: { format: { formatName: 'EAN_13' } } });
      scanSuccessCallback('6901234567890', { result: { format: { formatName: 'EAN_13' } } });
      scanSuccessCallback('6901234567890', { result: { format: { formatName: 'EAN_13' } } });

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(scanner.totalScannedCount.value).toBe(1);
    });

    it('连续模式下异码应零延迟立即响应触发', async () => {
      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const container = document.createElement('div');
      container.id = 'dedup-container-2';
      document.body.appendChild(container);

      await scanner.start(container, {
        interactionMode: 'continuous',
        duplicateIntervalMs: 1500,
      });

      // 连续触发两个不同的条码
      scanSuccessCallback('CODE_A', { result: { format: { formatName: 'CODE_128' } } });
      scanSuccessCallback('CODE_B', { result: { format: { formatName: 'CODE_128' } } });

      expect(onScan).toHaveBeenCalledTimes(2);
      expect(scanner.totalScannedCount.value).toBe(2);
      expect(scanner.lastScannedResult.value?.text).toBe('CODE_B');
    });

    it('同码在等待超过冷却时间窗口后应能再次派发', async () => {
      vi.useFakeTimers();
      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const container = document.createElement('div');
      container.id = 'dedup-container-3';
      document.body.appendChild(container);

      await scanner.start(container, {
        interactionMode: 'continuous',
        duplicateIntervalMs: 1500,
      });

      // 首次扫码
      scanSuccessCallback('SAME_CODE', { result: { format: { formatName: 'QR_CODE' } } });
      expect(onScan).toHaveBeenCalledTimes(1);

      // 时间前进 1000ms（尚未脱离冷却期）
      vi.advanceTimersByTime(1000);
      scanSuccessCallback('SAME_CODE', { result: { format: { formatName: 'QR_CODE' } } });
      expect(onScan).toHaveBeenCalledTimes(1);

      // 时间再前进 600ms（累计 1600ms > 1500ms，已脱离冷却期）
      vi.advanceTimersByTime(600);
      scanSuccessCallback('SAME_CODE', { result: { format: { formatName: 'QR_CODE' } } });
      expect(onScan).toHaveBeenCalledTimes(2);
      expect(scanner.totalScannedCount.value).toBe(2);

      vi.useRealTimers();
    });

    it('单次模式 (single) 识别成功后应立即停止视频流', async () => {
      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const container = document.createElement('div');
      container.id = 'single-container';
      document.body.appendChild(container);

      await scanner.start(container, {
        interactionMode: 'single',
      });

      expect(scanner.isScanning.value).toBe(true);

      // 触发识别
      await scanSuccessCallback('SINGLE_CODE', { result: { format: { formatName: 'QR_CODE' } } });

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(mockHtml5QrcodeInstance.stop).toHaveBeenCalled();
      expect(scanner.isScanning.value).toBe(false);
    });
  });

  describe('静态文件与 Blob 静默解码', () => {
    it('decodeFile 能够解码传入的 File 对象', async () => {
      const onScan = vi.fn();
      const scanner = useCodeScanner({ onScan });

      const file = new File(['dummy-content'], 'test-barcode.png', { type: 'image/png' });
      const result = await scanner.decodeFile(file);

      expect(result.text).toBe('FILE_MOCK_BARCODE_888');
      expect(result.format).toBe('QR_CODE');
      expect(onScan).toHaveBeenCalledWith(result);
      expect(scanner.totalScannedCount.value).toBe(1);
    });

    it('decodeFile 能够兼容纯 Blob 对象并自动包装为 File 解码', async () => {
      const scanner = useCodeScanner();

      const blob = new Blob(['blob-content'], { type: 'image/jpeg' });
      const result = await scanner.decodeFile(blob);

      expect(result.text).toBe('FILE_MOCK_BARCODE_888');
      expect(mockHtml5QrcodeInstance.scanFileV2).toHaveBeenCalled();
    });
  });
});

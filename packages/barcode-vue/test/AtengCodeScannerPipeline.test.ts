/**
 * @atengk/barcode-vue AtengCodeScanner 流水线连续扫码与拖拽/粘贴解码单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengCodeScanner from '../src/components/AtengCodeScanner.vue';
import { setScannerEngineMock, resetScannerEngineMock } from '../src/utils/scannerLoader';
import { setAudioContextMock, resetAudioContextMock } from '../src/utils/audioFeedback';

describe('AtengCodeScanner.vue (流水线连续与文件拖拽解码)', () => {
  let mockHtml5QrcodeInstance: any;

  beforeEach(() => {
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
      start: vi.fn().mockResolvedValue(null),
      stop: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      clear: vi.fn(),
      scanFileV2: vi.fn().mockResolvedValue({
        decodedText: 'PIPELINE_DROP_SUCCESS_999',
        result: { format: { formatName: 'CODE_128' } },
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

  it('支持直接拖入图片文件进行静默解码并触发 scan 事件', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: false,
        enableDrop: true,
      },
    });

    const file = new File(['mock-image-bytes'], 'drop-test.png', { type: 'image/png' });

    // 模拟拖入 drop 事件
    await wrapper.trigger('drop', {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockHtml5QrcodeInstance.scanFileV2).toHaveBeenCalled();
    expect(wrapper.emitted('scan')).toBeTruthy();
    expect(wrapper.emitted('scan')?.[0]?.[0]).toMatchObject({
      text: 'PIPELINE_DROP_SUCCESS_999',
      format: 'CODE_128',
    });

    wrapper.unmount();
  });

  it('支持监听剪贴板粘贴 (Ctrl+V) 图片文件进行静默解码', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: false,
        enablePaste: true,
      },
    });

    const file = new File(['clipboard-bytes'], 'paste-barcode.png', { type: 'image/png' });

    // 模拟 paste 事件
    await wrapper.trigger('paste', {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => file,
          },
        ],
      },
    });

    expect(mockHtml5QrcodeInstance.scanFileV2).toHaveBeenCalled();
    expect(wrapper.emitted('scan')).toBeTruthy();

    wrapper.unmount();
  });

  it('组件对外暴露 decodeFile 方法能够直接调用', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: false,
      },
    });

    const file = new File(['direct-call'], 'call.png', { type: 'image/png' });
    const result = await wrapper.vm.decodeFile(file);

    expect(result.text).toBe('PIPELINE_DROP_SUCCESS_999');
    expect(wrapper.vm.totalScannedCount).toBe(1);

    wrapper.unmount();
  });
});

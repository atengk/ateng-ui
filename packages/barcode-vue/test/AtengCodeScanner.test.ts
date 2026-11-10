/**
 * @atengk/barcode-vue AtengCodeScanner 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengCodeScanner from '../src/components/AtengCodeScanner.vue';
import { setScannerEngineMock, resetScannerEngineMock } from '../src/utils/scannerLoader';

describe('AtengCodeScanner.vue (摄像头扫码表现容器)', () => {
  let mockHtml5QrcodeInstance: any;

  beforeEach(() => {
    mockHtml5QrcodeInstance = {
      start: vi.fn().mockResolvedValue(null),
      stop: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      clear: vi.fn(),
      getState: vi.fn().mockReturnValue(2),
      getRunningTrackCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyVideoConstraints: vi.fn().mockResolvedValue(null),
    };

    const MockHtml5Qrcode = vi.fn().mockImplementation(() => mockHtml5QrcodeInstance);
    (MockHtml5Qrcode as any).getCameras = vi
      .fn()
      .mockResolvedValue([{ id: 'cam-1', label: '后置主摄' }]);

    setScannerEngineMock({
      Html5Qrcode: MockHtml5Qrcode,
      Html5QrcodeSupportedFormats: {
        QR_CODE: 0,
        CODE_128: 5,
      },
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

  it('正常挂载并渲染扫码器根节点与内部视口容器', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: false,
      },
    });

    expect(wrapper.classes()).toContain('at-code-scanner');
    expect(wrapper.find('.at-code-scanner__viewport').exists()).toBe(true);

    wrapper.unmount();
  });

  it('当 autoStart 为 true 时挂载后自动调用底层 start 启动扫描', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: true,
        scanMode: 'barcode',
      },
    });

    // 等待异步挂载完成
    await vi.waitFor(() => {
      expect(mockHtml5QrcodeInstance.start).toHaveBeenCalled();
    });

    expect(wrapper.vm.isScanning).toBe(true);

    wrapper.unmount();
    expect(mockHtml5QrcodeInstance.stop).toHaveBeenCalled();
  });

  it('扫码成功时能向外触发 scan 事件', async () => {
    let capturedSuccessCallback: any;
    mockHtml5QrcodeInstance.start = vi.fn().mockImplementation((_cam, _cfg, successCb) => {
      capturedSuccessCallback = successCb;
      return Promise.resolve(null);
    });

    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: true,
      },
    });

    await vi.waitFor(() => {
      expect(mockHtml5QrcodeInstance.start).toHaveBeenCalled();
    });

    // 触发底层扫描识别
    capturedSuccessCallback('TEST_BARCODE_123', {
      result: { format: { formatName: 'CODE_128' } },
    });

    expect(wrapper.emitted('scan')).toBeTruthy();
    expect(wrapper.emitted('scan')?.[0]?.[0]).toMatchObject({
      text: 'TEST_BARCODE_123',
      format: 'CODE_128',
    });

    wrapper.unmount();
  });

  it('暴露的方法如 pause、resume 与 toggleTorch 能够正常响应', async () => {
    const wrapper = mount(AtengCodeScanner, {
      props: {
        autoStart: true,
      },
    });

    await vi.waitFor(() => {
      expect(mockHtml5QrcodeInstance.start).toHaveBeenCalled();
    });

    wrapper.vm.pause();
    expect(mockHtml5QrcodeInstance.pause).toHaveBeenCalled();
    expect(wrapper.vm.isPaused).toBe(true);

    wrapper.vm.resume();
    expect(mockHtml5QrcodeInstance.resume).toHaveBeenCalled();
    expect(wrapper.vm.isPaused).toBe(false);

    await wrapper.vm.toggleTorch();
    expect(mockHtml5QrcodeInstance.applyVideoConstraints).toHaveBeenCalled();

    wrapper.unmount();
  });
});

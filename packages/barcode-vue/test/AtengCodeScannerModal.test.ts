/**
 * @atengk/barcode-vue AtengCodeScannerModal 弹窗组件单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengCodeScannerModal from '../src/components/AtengCodeScannerModal.vue';
import { setScannerEngineMock, resetScannerEngineMock } from '../src/utils/scannerLoader';
import { setAudioContextMock, resetAudioContextMock } from '../src/utils/audioFeedback';

describe('AtengCodeScannerModal.vue (轻量脱壳扫码弹窗)', () => {
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
        decodedText: 'MODAL_SCAN_RESULT_777',
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

  it('modelValue 为 false 时默认不渲染弹窗 DOM 结构', () => {
    const wrapper = mount(AtengCodeScannerModal, {
      props: {
        modelValue: false,
      },
    });

    expect(document.body.querySelector('.at-code-scanner-modal')).toBeNull();
    wrapper.unmount();
  });

  it('modelValue 为 true 时通过 Teleport 挂载到 body 并展示标题', async () => {
    const wrapper = mount(AtengCodeScannerModal, {
      props: {
        modelValue: true,
        title: '测试仓储扫码弹窗',
      },
    });

    const modalEl = document.body.querySelector('.at-code-scanner-modal');
    expect(modalEl).not.toBeNull();
    expect(modalEl?.textContent).toContain('测试仓储扫码弹窗');

    wrapper.unmount();
  });

  it('点击关闭按钮能够触发 update:modelValue(false) 与 close 事件', async () => {
    const wrapper = mount(AtengCodeScannerModal, {
      props: {
        modelValue: true,
      },
    });

    const closeBtn = document.body.querySelector(
      '.at-code-scanner-modal__close-btn',
    ) as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe(false);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('扫码成功时触发 scan 事件，且 autoCloseOnSuccess 为 true 时自动触发关闭', async () => {
    const wrapper = mount(AtengCodeScannerModal, {
      props: {
        modelValue: true,
        autoCloseOnSuccess: true,
      },
    });

    const scannerComponent = wrapper.findComponent({ name: 'AtengCodeScanner' });
    expect(scannerComponent.exists()).toBe(true);

    // 模拟内部 scanner 派发 scan 事件
    await scannerComponent.vm.$emit('scan', {
      text: 'SUCCESS_PALLET_001',
      format: 'CODE_128',
    });

    expect(wrapper.emitted('scan')).toBeTruthy();
    expect(wrapper.emitted('scan')?.[0]?.[0]).toMatchObject({
      text: 'SUCCESS_PALLET_001',
    });
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe(false);

    wrapper.unmount();
  });
});

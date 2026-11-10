/**
 * @atengk/barcode-vue 扫码引擎动态懒加载器与长宽比构型单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  loadHtml5Qrcode,
  setScannerEngineMock,
  resetScannerEngineMock,
  resolveFormatsForScanMode,
  resolveAdaptiveQrBox,
} from '../src/utils/scannerLoader';
import type { QrBoxFunction } from '../src/types/scanner';

describe('scannerLoader (扫码引擎懒加载与长宽比构型)', () => {
  afterEach(() => {
    resetScannerEngineMock();
  });

  describe('引擎动态懒加载与 Mock 注入', () => {
    it('能够成功加载真实或 Mock 的 html5-qrcode 模块', async () => {
      const mockEngine = {
        Html5Qrcode: vi.fn(),
        Html5QrcodeSupportedFormats: {
          QR_CODE: 0,
          CODE_128: 5,
        },
      };

      setScannerEngineMock(mockEngine);
      const loaded = await loadHtml5Qrcode();
      expect(loaded).toBe(mockEngine);
    });

    it('重置 Mock 后多次加载应返回相同的单例 Promise', async () => {
      resetScannerEngineMock();
      const p1 = loadHtml5Qrcode();
      const p2 = loadHtml5Qrcode();
      expect(p1).toBe(p2);
      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toBe(res2);
      expect(res1).toHaveProperty('Html5Qrcode');
    });
  });

  describe('resolveFormatsForScanMode (解码算法集收敛)', () => {
    const mockFormats = {
      QR_CODE: 0,
      AZTEC: 1,
      CODABAR: 2,
      CODE_39: 3,
      CODE_93: 4,
      CODE_128: 5,
      DATA_MATRIX: 6,
      MAXICODE: 7,
      ITF: 8,
      EAN_13: 9,
      EAN_8: 10,
      PDF_417: 11,
      RSS_14: 12,
      RSS_EXPANDED: 13,
      UPC_A: 14,
      UPC_E: 15,
      UPC_EAN_EXTENSION: 16,
    };

    it('barcode 模式应仅收敛为一维条码格式集', () => {
      const formats = resolveFormatsForScanMode('barcode', mockFormats);
      expect(formats).toBeDefined();
      expect(formats).toContain(mockFormats.CODE_128);
      expect(formats).toContain(mockFormats.EAN_13);
      expect(formats).toContain(mockFormats.CODE_39);
      expect(formats).toContain(mockFormats.ITF);
      // 严禁包含二维码格式
      expect(formats).not.toContain(mockFormats.QR_CODE);
      expect(formats).not.toContain(mockFormats.DATA_MATRIX);
    });

    it('qr-code 模式应仅收敛为二维码与矩阵码格式集', () => {
      const formats = resolveFormatsForScanMode('qr-code', mockFormats);
      expect(formats).toBeDefined();
      expect(formats).toContain(mockFormats.QR_CODE);
      expect(formats).toContain(mockFormats.DATA_MATRIX);
      expect(formats).toContain(mockFormats.AZTEC);
      // 严禁包含一维码
      expect(formats).not.toContain(mockFormats.CODE_128);
      expect(formats).not.toContain(mockFormats.EAN_13);
    });

    it('all 模式应返回 undefined 以使用底层全量解码集', () => {
      const formats = resolveFormatsForScanMode('all', mockFormats);
      expect(formats).toBeUndefined();
    });
  });

  describe('resolveAdaptiveQrBox (长宽比取景框自适应)', () => {
    it('当传入自定义 qrbox 时优先使用自定义值', () => {
      const customNum = 250;
      expect(resolveAdaptiveQrBox('barcode', customNum)).toBe(customNum);

      const customObj = { width: 300, height: 100 };
      expect(resolveAdaptiveQrBox('qr-code', customObj)).toBe(customObj);
    });

    it('barcode 模式默认生成 2.8:1 狭长宽屏构型函数', () => {
      const qrbox = resolveAdaptiveQrBox('barcode');
      expect(typeof qrbox).toBe('function');

      const calc = qrbox as QrBoxFunction;
      // 假设取景器为 400x300
      const res = calc(400, 300);
      expect(res.width).toBeGreaterThan(res.height);
      // 宽度约为 400 * 0.85 = 340，高度约为 340 / 2.8 ≈ 121
      expect(res.width).toBe(340);
      expect(res.height).toBe(121);
    });

    it('qr-code 模式默认生成 1:1 正方形取景框', () => {
      const qrbox = resolveAdaptiveQrBox('qr-code');
      expect(typeof qrbox).toBe('function');

      const calc = qrbox as QrBoxFunction;
      // 假设取景器为 400x300，短边为 300，300 * 0.7 = 210
      const res = calc(400, 300);
      expect(res.width).toBe(res.height);
      expect(res.width).toBe(210);
    });

    it('all 模式默认生成 0.75 短边正方形取景框', () => {
      const qrbox = resolveAdaptiveQrBox('all');
      expect(typeof qrbox).toBe('function');

      const calc = qrbox as QrBoxFunction;
      const res = calc(400, 300);
      expect(res.width).toBe(res.height);
      expect(res.width).toBe(225); // 300 * 0.75
    });
  });
});

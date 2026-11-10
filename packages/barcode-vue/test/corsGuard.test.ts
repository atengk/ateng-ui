/**
 * @atengk/barcode-vue corsGuard 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { elevateErrorCorrectionLevel, clampLogoSize, loadSafeImage } from '../src/utils/corsGuard';

describe('elevateErrorCorrectionLevel()', () => {
  it('未提供 Logo 时应保留原纠错级别或默认 M', () => {
    expect(elevateErrorCorrectionLevel(undefined, false)).toBe('M');
    expect(elevateErrorCorrectionLevel('L', false)).toBe('L');
    expect(elevateErrorCorrectionLevel('H', false)).toBe('H');
  });

  it('存在 Logo 且开启自动提升时，L 与 M 应被保底提升为 Q', () => {
    expect(elevateErrorCorrectionLevel('L', true, true)).toBe('Q');
    expect(elevateErrorCorrectionLevel('M', true, true)).toBe('Q');
    expect(elevateErrorCorrectionLevel(undefined, true, true)).toBe('Q');
  });

  it('存在 Logo 但用户本身配置了最高容错 H 时，应尊重原配置', () => {
    expect(elevateErrorCorrectionLevel('H', true, true)).toBe('H');
  });

  it('当 autoElevate 显式为 false 时，不执行强制提升', () => {
    expect(elevateErrorCorrectionLevel('L', true, false)).toBe('L');
  });
});

describe('clampLogoSize()', () => {
  it('未提供或非法数值时应返回默认 0.25', () => {
    expect(clampLogoSize(undefined)).toBe(0.25);
    expect(clampLogoSize(-0.5)).toBe(0.25);
    expect(clampLogoSize(NaN)).toBe(0.25);
  });

  it('合法合理范围内的比例应原样返回', () => {
    expect(clampLogoSize(0.2)).toBe(0.2);
    expect(clampLogoSize(0.15)).toBe(0.15);
  });

  it('超过 0.3 上限时应自动 clamp 至 0.3 保护码眼', () => {
    expect(clampLogoSize(0.45)).toBe(0.3);
    expect(clampLogoSize(0.8)).toBe(0.3);
  });
});

describe('loadSafeImage()', () => {
  it('DataURL 与 BlobURL 应直接同步安全放行', async () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await loadSafeImage(dataUrl);
    expect(res.success).toBe(true);
    expect(res.src).toBe(dataUrl);

    const blobUrl = 'blob:http://localhost:3000/mock-uuid';
    const blobRes = await loadSafeImage(blobUrl);
    expect(blobRes.success).toBe(true);
    expect(blobRes.src).toBe(blobUrl);
  });

  it('传入空地址时应快速失败且不抛出未捕获异常', async () => {
    const res = await loadSafeImage('');
    expect(res.success).toBe(false);
    expect(res.src).toBeNull();
    expect(res.error).toBeDefined();
  });

  it('跨域远程图片加载失败时应返回 success: false 并附带语义化错误', async () => {
    // 模拟 Image 加载失败
    const originalImage = global.Image;
    // @ts-expect-error 模拟构造函数
    global.Image = class {
      crossOrigin = '';
      src = '';
      set onload(_fn: () => void) {
        // do nothing
      }
      set onerror(fn: () => void) {
        setTimeout(fn, 10);
      }
    };

    const res = await loadSafeImage('https://forbidden-cors.example.com/logo.png');
    expect(res.success).toBe(false);
    expect(res.src).toBeNull();
    expect(res.error?.message).toContain('Logo 图片跨域放行失败');

    global.Image = originalImage;
  });
});

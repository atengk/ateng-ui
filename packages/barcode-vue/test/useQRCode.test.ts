/**
 * @atengk/barcode-vue useQRCode 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, effectScope } from 'vue';
import { useQRCode } from '../src/composables/useQRCode';
import type { UseQRCodeOptions } from '../src/composables/useQRCode';

describe('useQRCode()', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('成功在容器内挂载二维码并设置 isRendered 为 true', async () => {
    const value = ref('https://atengk.com');
    const options = ref<UseQRCodeOptions>({
      preset: 'standard',
      width: 180,
      height: 180,
      type: 'canvas',
    });

    const { isRendered, qrCodeInstance } = useQRCode(container, value, options);

    // 等待异步渲染
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isRendered.value).toBe(true);
    expect(qrCodeInstance.value).toBeDefined();
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('高分屏 Retina 下 Canvas 应自动调整物理倍率并锁死 CSS 逻辑宽高', async () => {
    // 模拟高分屏 2x DPR
    vi.stubGlobal('devicePixelRatio', 2);

    const value = ref('https://atengk.com');
    const options = ref<UseQRCodeOptions>({
      preset: 'tech-blue',
      width: 240,
      height: 240,
      type: 'canvas',
      autoDpr: true,
    });

    const { isRendered } = useQRCode(container, value, options);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isRendered.value).toBe(true);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    if (canvas) {
      expect(canvas.style.width).toBe('240px');
      expect(canvas.style.height).toBe('240px');
    }

    vi.unstubAllGlobals();
  });

  it('支持 SVG 模式渲染', async () => {
    const value = ref('https://atengk.com/svg');
    const options = ref<UseQRCodeOptions>({
      preset: 'elegant-dots',
      type: 'svg',
      width: 200,
      height: 200,
    });

    const { isRendered } = useQRCode(container, value, options);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isRendered.value).toBe(true);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('scope 销毁时应清空容器 DOM 并注销实例', async () => {
    const scope = effectScope();
    let qrReturn: ReturnType<typeof useQRCode> | undefined;

    scope.run(() => {
      qrReturn = useQRCode(container, 'test-dispose', { preset: 'industrial' });
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(container.querySelector('canvas')).not.toBeNull();

    // 销毁 scope
    scope.stop();

    expect(container.innerHTML).toBe('');
    expect(qrReturn?.isRendered.value).toBe(false);
    expect(qrReturn?.qrCodeInstance.value).toBeNull();
  });

  it('传入 Logo 且容错为 L 时，内部应自动保底提升至 Q 级别', async () => {
    const value = ref('https://atengk.com/logo-test');
    const options = ref<UseQRCodeOptions>({
      preset: 'standard',
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      qrOptions: {
        errorCorrectionLevel: 'L',
      },
    });

    const { isRendered, qrCodeInstance } = useQRCode(container, value, options);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isRendered.value).toBe(true);
    // @ts-expect-error 读取内部 options 验证安全纠错级别
    expect(qrCodeInstance.value?._options?.qrOptions?.errorCorrectionLevel).toBe('Q');
  });

  it('远程 Logo 加载失败时不应阻断二维码渲染，应记录 logoError', async () => {
    // 模拟 Image 加载异常
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

    const value = ref('https://atengk.com/cors-fail');
    const options = ref<UseQRCodeOptions>({
      preset: 'tech-blue',
      logo: 'https://bad-cors-domain.com/logo.png',
    });

    const { isRendered, logoError } = useQRCode(container, value, options);
    await new Promise(resolve => setTimeout(resolve, 80));

    expect(isRendered.value).toBe(true);
    expect(logoError.value).not.toBeNull();
    expect(logoError.value?.message).toContain('Logo 图片跨域放行失败');

    global.Image = originalImage;
  });
});

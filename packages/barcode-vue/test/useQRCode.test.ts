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
});

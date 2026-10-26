/**
 * 防篡改水印矩阵与 SVG 构造单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  normalizeWatermark,
  buildWatermarkSvg,
  buildWatermarkDataUrl,
  createWatermarkOverlay,
} from '../src/utils/watermark';
import type { WatermarkOptions } from '../src/types';

describe('Watermark 防泄密动态安全水印模块', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  describe('normalizeWatermark', () => {
    it('处理布尔与假值入参', () => {
      expect(normalizeWatermark(false)).toBeNull();
      expect(normalizeWatermark(undefined)).toBeNull();
      expect(normalizeWatermark(null as unknown as undefined)).toBeNull();
      expect(normalizeWatermark({ enabled: false })).toBeNull();

      const defaultTrue = normalizeWatermark(true);
      expect(defaultTrue).not.toBeNull();
      expect(defaultTrue?.enabled).toBe(true);
      expect(defaultTrue?.text).toBe('Confidential');
    });

    it('处理纯字符串简写入参', () => {
      const normalized = normalizeWatermark('内部绝密 10086');
      expect(normalized).not.toBeNull();
      expect(normalized?.enabled).toBe(true);
      expect(normalized?.text).toBe('内部绝密 10086');
      expect(normalized?.rotate).toBe(-22);
      expect(normalized?.fontSize).toBe(16);
    });

    it('处理结构化参数并保留自定义覆盖', () => {
      const options: WatermarkOptions = {
        enabled: true,
        text: '张三 (研发部)',
        fontSize: 24,
        color: '#ff0000',
        rotate: -45,
        opacity: 0.25,
        gapX: 300,
        gapY: 200,
      };
      const normalized = normalizeWatermark(options);
      expect(normalized?.text).toBe('张三 (研发部)');
      expect(normalized?.fontSize).toBe(24);
      expect(normalized?.color).toBe('#ff0000');
      expect(normalized?.rotate).toBe(-45);
      expect(normalized?.opacity).toBe(0.25);
      expect(normalized?.gapX).toBe(300);
      expect(normalized?.gapY).toBe(200);
    });
  });

  describe('buildWatermarkSvg & buildWatermarkDataUrl', () => {
    it('正确生成文本水印 SVG 并对特殊字符实施转义防御', () => {
      const svg = buildWatermarkSvg({
        text: '安全标识 <Test> & "Draft"',
        color: 'rgba(0,0,0,0.15)',
        fontSize: 18,
      });

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('&lt;Test&gt; &amp; &quot;Draft&quot;');
      expect(svg).not.toContain('<Test>');
    });

    it('支持图片类型水印', () => {
      const svg = buildWatermarkSvg({
        image: 'https://example.com/logo.png',
        width: 120,
        height: 40,
      });

      expect(svg).toContain('<image href="https://example.com/logo.png"');
    });

    it('生成标准 DataURL 字符串', () => {
      const dataUrl = buildWatermarkDataUrl({ text: '保密' });
      expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      expect(dataUrl).toContain(encodeURIComponent('保密'));
    });
  });

  describe('createWatermarkOverlay 与 MutationObserver 反篡改监听', () => {
    it('挂载水印图层至容器', () => {
      const instance = createWatermarkOverlay(container, {
        text: '绝密文件 2026',
      });

      const wm = container.querySelector('.at-file-viewer__watermark');
      expect(wm).not.toBeNull();
      expect(wm?.getAttribute('style')).toContain('position: absolute');
      expect(wm?.getAttribute('style')).toContain('background-repeat: repeat');

      instance.destroy();
      expect(container.querySelector('.at-file-viewer__watermark')).toBeNull();
    });

    it('当水印节点被外部从 DOM 强行移除时，MutationObserver 立即反篡改自动重绘并重新挂载', async () => {
      const instance = createWatermarkOverlay(container, {
        text: '防删除水印',
      });

      const wm = container.querySelector('.at-file-viewer__watermark') as HTMLElement;
      expect(wm).not.toBeNull();

      // 模拟恶意脚本从 DOM 树中移除水印
      wm.remove();
      expect(container.querySelector('.at-file-viewer__watermark')).toBeNull();

      // 等待 MutationObserver 微任务派发
      await new Promise(resolve => setTimeout(resolve, 30));

      const restoredWm = container.querySelector('.at-file-viewer__watermark');
      expect(restoredWm).not.toBeNull();

      instance.destroy();
    });

    it('当水印节点的关键隐藏样式被篡改时，立即强制恢复样式', async () => {
      const instance = createWatermarkOverlay(container, {
        text: '防篡改样式水印',
      });

      const wm = container.querySelector('.at-file-viewer__watermark') as HTMLElement;
      expect(wm).not.toBeNull();

      // 恶意修改 display 为 none
      wm.style.display = 'none';

      // 等待 MutationObserver 响应
      await new Promise(resolve => setTimeout(resolve, 30));

      expect(wm.style.display).not.toBe('none');
      expect(wm.getAttribute('style')).toContain('display: block');

      instance.destroy();
    });
  });
});

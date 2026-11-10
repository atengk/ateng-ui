/**
 * WatermarkEngine 防伪倾斜水印合成引擎单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { WatermarkEngine } from '../src/utils/watermark-engine';

describe('WatermarkEngine', () => {
  it('未提供配置或文字为空时，透明返回原 Canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;

    expect(WatermarkEngine.apply(canvas)).toBe(canvas);
    expect(WatermarkEngine.apply(canvas, { text: '' })).toBe(canvas);
    expect(WatermarkEngine.apply(canvas, { text: '   ' })).toBe(canvas);
  });

  it('配置文字水印时，应创建新 Canvas 副本并调用 fillText 绘制', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;

    const result = WatermarkEngine.apply(canvas, {
      text: '仅供实名认证使用',
      color: 'rgba(200, 0, 0, 0.5)',
      rotate: -30,
      repeat: true,
    });

    expect(result).not.toBe(canvas);
    expect(result.width).toBe(600);
    expect(result.height).toBe(400);

    const ctx = result.getContext('2d');
    expect(ctx?.fillText).toHaveBeenCalled();
  });

  it('支持 repeat=false 单中心水印模式', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;

    const result = WatermarkEngine.apply(canvas, {
      text: 'CONFIDENTIAL',
      repeat: false,
    });

    expect(result).toBeDefined();
    const ctx = result.getContext('2d');
    expect(ctx?.fillText).toHaveBeenCalledWith('CONFIDENTIAL', 0, 0);
  });
});

/**
 * @atengk/barcode-vue 二维码主题预设单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { QR_CODE_PRESETS, resolveQRCodePreset } from '../src/constants/presets';
import type { QRCodePreset } from '../src/types/qrcode';

describe('QR_CODE_PRESETS', () => {
  const PRESET_NAMES: QRCodePreset[] = [
    'standard',
    'industrial',
    'tech-blue',
    'elegant-dots',
    'classy',
    'minimal-fluid',
  ];

  it('应该完整提供六大企业级设计主题预设', () => {
    for (const name of PRESET_NAMES) {
      expect(QR_CODE_PRESETS[name]).toBeDefined();
      expect(QR_CODE_PRESETS[name].dotsOptions).toBeDefined();
      expect(QR_CODE_PRESETS[name].cornersSquareOptions).toBeDefined();
      expect(QR_CODE_PRESETS[name].cornersDotOptions).toBeDefined();
      expect(QR_CODE_PRESETS[name].backgroundOptions).toBeDefined();
    }
  });

  it('standard 预设应为纯黑白方块结构', () => {
    const std = QR_CODE_PRESETS.standard;
    expect(std.dotsOptions?.type).toBe('square');
    expect(std.dotsOptions?.color).toBe('#000000');
    expect(std.backgroundOptions?.color).toBe('#ffffff');
  });

  it('tech-blue 预设应包含线性渐变配置', () => {
    const tech = QR_CODE_PRESETS['tech-blue'];
    expect(tech.dotsOptions?.gradient).toBeDefined();
    expect(tech.dotsOptions?.gradient?.type).toBe('linear');
    expect(tech.dotsOptions?.gradient?.colorStops).toHaveLength(2);
  });
});

describe('resolveQRCodePreset()', () => {
  it('默认解析应返回 standard 预设的独立副本', () => {
    const res = resolveQRCodePreset();
    expect(res.dotsOptions?.type).toBe('square');
    expect(res.backgroundOptions?.color).toBe('#ffffff');

    // 突变副本不应污染原始常量
    if (res.dotsOptions) {
      res.dotsOptions.color = '#ff0000';
    }
    expect(QR_CODE_PRESETS.standard.dotsOptions?.color).toBe('#000000');
  });

  it('应正确解析指定的 preset', () => {
    const classy = resolveQRCodePreset('classy');
    expect(classy.dotsOptions?.type).toBe('classy');
    expect(classy.backgroundOptions?.color).toBe('#fffbeb');
  });

  it('遇到未知 preset 应优雅降级为 standard', () => {
    // @ts-expect-error 测试未知非法参数
    const fallback = resolveQRCodePreset('unknown-preset');
    expect(fallback.dotsOptions?.type).toBe('square');
  });

  it('应支持深度合并用户传入的 overrides 且保持深层隔离', () => {
    const custom = resolveQRCodePreset('tech-blue', {
      margin: 10,
      dotsOptions: {
        type: 'dots',
      },
    });

    expect(custom.margin).toBe(10);
    // dotsOptions.type 被覆盖
    expect(custom.dotsOptions?.type).toBe('dots');
    // dotsOptions.gradient 依然保留
    expect(custom.dotsOptions?.gradient).toBeDefined();
    expect(custom.cornersSquareOptions?.color).toBe('#1e40af');

    // 验证原预设不受影响
    expect(QR_CODE_PRESETS['tech-blue'].margin).toBe(4);
    expect(QR_CODE_PRESETS['tech-blue'].dotsOptions?.type).toBe('rounded');
  });
});

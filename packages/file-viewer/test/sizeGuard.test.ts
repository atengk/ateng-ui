/**
 * sizeGuard 体积阈值解析、格式化与防崩护栏单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect } from 'vitest';
import {
  parseSizeLimit,
  formatFileSize,
  formatSpeed,
  isFileSizeExceeded,
  calculateProgress,
  DEFAULT_MAX_SIZE,
} from '../src/utils/sizeGuard';

describe('sizeGuard 工具函数与阈值防御测试', () => {
  it('parseSizeLimit 支持数字与各种字符串表达式解析', () => {
    // 默认值
    expect(parseSizeLimit()).toBe(DEFAULT_MAX_SIZE);
    expect(parseSizeLimit(undefined)).toBe(100 * 1024 * 1024);

    // 数字直接返回
    expect(parseSizeLimit(50 * 1024 * 1024)).toBe(52428800);

    // 字符串单位解析 (大小写不敏感)
    expect(parseSizeLimit('50MB')).toBe(50 * 1024 * 1024);
    expect(parseSizeLimit('100m')).toBe(100 * 1024 * 1024);
    expect(parseSizeLimit('1gb')).toBe(1024 * 1024 * 1024);
    expect(parseSizeLimit('512kb')).toBe(512 * 1024);
    expect(parseSizeLimit('2048b')).toBe(2048);

    // 非法或负数返回默认值
    expect(parseSizeLimit('invalid')).toBe(DEFAULT_MAX_SIZE);
    expect(parseSizeLimit(-10)).toBe(DEFAULT_MAX_SIZE);
  });

  it('formatFileSize 能够人性化格式化字节体积', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatFileSize(100 * 1024 * 1024)).toBe('100.0 MB');
    expect(formatFileSize(2.25 * 1024 * 1024 * 1024)).toBe('2.25 GB');
  });

  it('formatSpeed 能够人性化格式化下载速率', () => {
    expect(formatSpeed(0)).toBe('0 KB/s');
    expect(formatSpeed(500 * 1024)).toBe('500.0 KB/s');
    expect(formatSpeed(3.8 * 1024 * 1024)).toBe('3.8 MB/s');
  });

  it('isFileSizeExceeded 能够准确判断是否超过安全阈值', () => {
    const limit = '100MB'; // 104,857,600 字节

    expect(isFileSizeExceeded(50 * 1024 * 1024, limit)).toBe(false);
    expect(isFileSizeExceeded(100 * 1024 * 1024, limit)).toBe(false);
    expect(isFileSizeExceeded(100 * 1024 * 1024 + 1, limit)).toBe(true);
    expect(isFileSizeExceeded(150 * 1024 * 1024, limit)).toBe(true);
  });

  it('calculateProgress 能够平滑计算百分比与速率指标', () => {
    const progress1 = calculateProgress({
      loaded: 25 * 1024 * 1024,
      total: 100 * 1024 * 1024,
      bytesPerSec: 5 * 1024 * 1024,
    });

    expect(progress1.percent).toBe(25);
    expect(progress1.loaded).toBe(25 * 1024 * 1024);
    expect(progress1.total).toBe(100 * 1024 * 1024);
    expect(progress1.speed).toBe(5 * 1024 * 1024);
    expect(progress1.formattedLoaded).toBe('25.0 MB');
    expect(progress1.formattedTotal).toBe('100.0 MB');
    expect(progress1.formattedSpeed).toBe('5.0 MB/s');

    // total 未知时的兜底 (0 或 undefined)
    const progress2 = calculateProgress({
      loaded: 10 * 1024 * 1024,
      total: 0,
      bytesPerSec: 1024 * 1024,
    });

    expect(progress2.percent).toBe(0);
    expect(progress2.formattedLoaded).toBe('10.0 MB');
    expect(progress2.formattedTotal).toBe('未知大小');
  });
});

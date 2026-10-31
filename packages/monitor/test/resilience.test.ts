/**
 * 弹性工程、指纹去重与熔断断路器单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hashString, cleanStack, generateErrorFingerprint } from '../src/resilience/fingerprint';
import { ErrorDeduplicator } from '../src/resilience/deduplicator';
import { CircuitBreaker } from '../src/resilience/circuitBreaker';

describe('Resilience & Anti-Storm Engine', () => {
  describe('fingerprint & hashString', () => {
    it('hashString 应当具有确定性输出且长度为 8 位十六进制', () => {
      const h1 = hashString('TypeError::Cannot read properties');
      const h2 = hashString('TypeError::Cannot read properties');
      expect(h1).toBe(h2);
      expect(h1.length).toBe(8);

      const h3 = hashString('Different message');
      expect(h1).not.toBe(h3);
    });

    it('cleanStack 应当剥离文件 URL、Query 参数与行号微小偏差', () => {
      const rawStack = `Error: network failed
    at fetchUser (https://cdn.example.com/assets/app.12345.js?v=2:120:45)
    at onClick (https://cdn.example.com/assets/vendor.js:34:12)`;

      const cleaned = cleanStack(rawStack);
      expect(cleaned).not.toContain('https://');
      expect(cleaned).not.toContain(':120:45');
      expect(cleaned).not.toContain('?v=2');
    });

    it('generateErrorFingerprint 针对相同类型与关键特征应产生相同特征指纹', () => {
      const f1 = generateErrorFingerprint({
        name: 'TypeError',
        message: 'Cannot read properties of undefined',
        stack: 'at render (https://example.com/app.js:10:20)',
      });

      const f2 = generateErrorFingerprint({
        name: 'TypeError',
        message: 'Cannot read properties of undefined',
        stack: 'at render (https://example.com/app.js:99:88)', // 行号不同
      });

      // 行号不同但关键帧相同，指纹应一致
      expect(f1).toBe(f2);

      const f3 = generateErrorFingerprint({
        name: 'ReferenceError',
        message: 'foo is not defined',
      });
      expect(f1).not.toBe(f3);
    });
  });

  describe('ErrorDeduplicator', () => {
    let deduplicator: ErrorDeduplicator;

    beforeEach(() => {
      deduplicator = new ErrorDeduplicator({ windowMs: 5000 });
    });

    it('首次出现应判定为非重复，5秒内再次出现判定为重复并累加次数', () => {
      const fp = 'fp-test-001';
      const t0 = 1000000;

      // 1. 首次触发
      const r1 = deduplicator.process(fp, t0);
      expect(r1.isDuplicate).toBe(false);
      expect(r1.repeatCount).toBe(1);

      // 2. 1秒后再次触发（在 5000ms 窗口内）
      const r2 = deduplicator.process(fp, t0 + 1000);
      expect(r2.isDuplicate).toBe(true);
      expect(r2.repeatCount).toBe(2);

      // 3. 3秒后第三次触发
      const r3 = deduplicator.process(fp, t0 + 3000);
      expect(r3.isDuplicate).toBe(true);
      expect(r3.repeatCount).toBe(3);

      expect(deduplicator.getCount(fp)).toBe(3);
    });

    it('超出时间窗口后应当重置计数并重新判定为非重复', () => {
      const fp = 'fp-test-002';
      const t0 = 1000000;

      deduplicator.process(fp, t0);
      deduplicator.process(fp, t0 + 2000);

      // 6秒后再次触发（超过 5000ms 窗口）
      const r3 = deduplicator.process(fp, t0 + 8000);
      expect(r3.isDuplicate).toBe(false);
      expect(r3.repeatCount).toBe(1);
    });

    it('clear 应当清空所有去重记录', () => {
      deduplicator.process('fp-1', 1000);
      deduplicator.clear();
      expect(deduplicator.getCount('fp-1')).toBe(0);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({ maxErrors: 3 });
    });

    it('未达阈值时应当正常放行，到达阈值时首次触发熔断', () => {
      expect(breaker.isTripped).toBe(false);

      // 第 1 次
      const r1 = breaker.recordError();
      expect(r1.allowed).toBe(true);
      expect(r1.trippedJustNow).toBe(false);
      expect(r1.currentCount).toBe(1);
      expect(breaker.isTripped).toBe(false);

      // 第 2 次
      const r2 = breaker.recordError();
      expect(r2.allowed).toBe(true);
      expect(r2.trippedJustNow).toBe(false);
      expect(r2.currentCount).toBe(2);
      expect(breaker.isTripped).toBe(false);

      // 第 3 次（达到阈值 3，首次触发熔断）
      const r3 = breaker.recordError();
      expect(r3.allowed).toBe(true);
      expect(r3.trippedJustNow).toBe(true);
      expect(r3.currentCount).toBe(3);
      expect(breaker.isTripped).toBe(true);

      // 第 4 次（已熔断，坚决阻断）
      const r4 = breaker.recordError();
      expect(r4.allowed).toBe(false);
      expect(r4.trippedJustNow).toBe(false);
      expect(breaker.isTripped).toBe(true);
    });

    it('reset 应当恢复熔断器至初始闭合状态', () => {
      breaker.recordError();
      breaker.recordError();
      breaker.recordError();
      expect(breaker.isTripped).toBe(true);

      breaker.reset();
      expect(breaker.isTripped).toBe(false);
      expect(breaker.errorCount).toBe(0);

      const r = breaker.recordError();
      expect(r.allowed).toBe(true);
    });
  });
});

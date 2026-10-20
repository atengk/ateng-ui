/**
 * useIdempotent 前端提交防刷与幂等互斥锁单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useIdempotent } from '../src';

describe('useIdempotent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Seam 1: Mutex Execution & Rapid Consecutive Click Blocking', () => {
    it('should block consecutive executions when an operation is pending', async () => {
      const onBlocked = vi.fn();
      const actionFn = vi.fn(async (orderId: number) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return `paid_${orderId}`;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string, [number]>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { onBlocked });
      });

      expect(result.executing.value).toBe(false);

      // 1. 首次触发执行
      const p1 = result.run(1001);
      expect(result.executing.value).toBe(true);
      expect(actionFn).toHaveBeenCalledTimes(1);
      expect(actionFn).toHaveBeenCalledWith(1001);

      // 2. 在未决期间快速连击触发 3 次
      const p2 = result.run(1002);
      const p3 = result.run(1003);
      const p4 = result.run(1004);

      // 后续 3 次调用应被互斥锁全部阻断忽略
      expect(actionFn).toHaveBeenCalledTimes(1);
      expect(onBlocked).toHaveBeenCalledTimes(3);
      expect(onBlocked).toHaveBeenNthCalledWith(1, [1002]);
      expect(onBlocked).toHaveBeenNthCalledWith(2, [1003]);
      expect(onBlocked).toHaveBeenNthCalledWith(3, [1004]);

      // 验证被阻断的调用返回 undefined
      expect(await p2).toBeUndefined();
      expect(await p3).toBeUndefined();
      expect(await p4).toBeUndefined();

      // 3. 200ms 后首个请求正常完成
      await vi.advanceTimersByTimeAsync(200);
      const res1 = await p1;

      expect(res1).toBe('paid_1001');
      expect(result.executing.value).toBe(false);

      // 4. 解锁后可以再次正常发起新请求
      const p5 = result.run(1005);
      expect(result.executing.value).toBe(true);
      expect(actionFn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      expect(await p5).toBe('paid_1005');
      expect(result.executing.value).toBe(false);

      scope.stop();
    });

    it('should automatically release mutex lock when actionFn rejects', async () => {
      const testError = new Error('Payment gateway error');
      const onError = vi.fn();
      const onFinally = vi.fn();

      const actionFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw testError;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<void>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { onError, onFinally });
      });

      const promise = result.run();
      expect(result.executing.value).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(result.executing.value).toBe(false);
      expect(onError).toHaveBeenCalledWith(testError, []);
      expect(onFinally).toHaveBeenCalledWith([]);

      // 锁已释放，后续可再次执行
      result.run();
      expect(result.executing.value).toBe(true);

      scope.stop();
    });
  });

  describe('Seam 2: Timeout Auto-Release Invariant (Deadlock Prevention)', () => {
    it('should automatically release mutex lock when action exceeds configured timeout', async () => {
      // 模拟一个挂起不返回或超时超长的请求 (3000ms)
      const actionFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return 'late_response';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { timeout: 500 });
      });

      result.run();
      expect(result.executing.value).toBe(true);

      // 前进 400ms，尚未超时，锁仍持有
      await vi.advanceTimersByTimeAsync(400);
      expect(result.executing.value).toBe(true);

      // 再前进 150ms（总计 550ms），已超过 500ms 超时阈值，触发自动防死锁释放
      await vi.advanceTimersByTimeAsync(150);
      expect(result.executing.value).toBe(false);

      // 超时释放后，允许用户重新发起操作
      result.run();
      expect(result.executing.value).toBe(true);
      expect(actionFn).toHaveBeenCalledTimes(2);

      scope.stop();
    });

    it('should support MaybeRefOrGetter dynamic timeout resolution', async () => {
      const actionFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return 'delayed';
      });

      const dynamicTimeout = ref(400);
      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { timeout: () => dynamicTimeout.value });
      });

      result.run();
      expect(result.executing.value).toBe(true);

      // 前进 300ms（尚未达到 400ms）
      await vi.advanceTimersByTimeAsync(300);
      expect(result.executing.value).toBe(true);

      // 再前进 150ms（超过 400ms）
      await vi.advanceTimersByTimeAsync(150);
      expect(result.executing.value).toBe(false);

      scope.stop();
    });
  });

  describe('Seam 3: Manual Unlock & Callbacks', () => {
    it('unlock should forcibly release mutex lock and cancel pending timeout', async () => {
      const actionFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'data';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { timeout: 5000 });
      });

      result.run();
      expect(result.executing.value).toBe(true);

      // 手动强制解锁
      result.unlock();
      expect(result.executing.value).toBe(false);

      // 再次调用可立即获得锁
      result.run();
      expect(result.executing.value).toBe(true);
      expect(actionFn).toHaveBeenCalledTimes(2);

      scope.stop();
    });

    it('runAsync should reject when locked and resolve when action completes', async () => {
      const actionFn = vi.fn(async (val: number) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return val * 2;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<number, [number]>>;

      scope.run(() => {
        result = useIdempotent(actionFn);
      });

      const p1 = result.runAsync(5);
      expect(result.executing.value).toBe(true);

      // 并发触发 runAsync 应被互斥拦截并抛出受控拒绝
      await expect(result.runAsync(10)).rejects.toThrow();

      await vi.advanceTimersByTimeAsync(100);
      expect(await p1).toBe(10);
      expect(result.executing.value).toBe(false);

      scope.stop();
    });
  });

  describe('Seam 4: Lifecycle Cleanup & Readonly Safety', () => {
    it('executing and error refs should be strictly readonly', async () => {
      const testErr = new Error('action failed');
      const actionFn = vi.fn(async () => {
        throw testErr;
      });
      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string>>;

      scope.run(() => {
        result = useIdempotent(actionFn);
      });

      expect(isReadonly(result.executing)).toBe(true);
      expect(isReadonly(result.error)).toBe(true);
      expect(result.error.value).toBeUndefined();

      await result.run();
      expect(result.error.value).toBe(testErr);

      scope.stop();
    });

    it('should clean up active timer and release lock on effect scope disposal', () => {
      const actionFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'done';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useIdempotent<string>>;

      scope.run(() => {
        result = useIdempotent(actionFn, { timeout: 2000 });
      });

      result.run();
      expect(result.executing.value).toBe(true);

      // 销毁作用域
      scope.stop();

      expect(result.executing.value).toBe(false);
    });
  });
});

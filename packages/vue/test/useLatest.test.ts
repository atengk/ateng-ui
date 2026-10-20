/**
 * useLatest 异步时序竞态双重防御协调器单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope, h, isReadonly } from 'vue';
import { createAtengVue, useLatest } from '../src';

describe('useLatest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Seam 1: Async State Machine & Readonly Reactivity', () => {
    it('should transition loading, data, and error states correctly on successful execution', async () => {
      const asyncFn = vi.fn(async (_signal: AbortSignal, keyword: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return `result_${keyword}`;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string, [string]>>;

      scope.run(() => {
        result = useLatest(asyncFn, { initialData: 'init' });
      });

      expect(result.data.value).toBe('init');
      expect(result.loading.value).toBe(false);
      expect(result.error.value).toBeUndefined();

      expect(isReadonly(result.data)).toBe(true);
      expect(isReadonly(result.loading)).toBe(true);
      expect(isReadonly(result.error)).toBe(true);

      const promise = result.run('apple');
      expect(result.loading.value).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      const data = await promise;

      expect(data).toBe('result_apple');
      expect(result.data.value).toBe('result_apple');
      expect(result.loading.value).toBe(false);
      expect(result.error.value).toBeUndefined();
      expect(asyncFn).toHaveBeenCalledTimes(1);

      scope.stop();
    });

    it('should transition error state and invoke onError when async function throws', async () => {
      const error = new Error('Async execution failed');
      const onError = vi.fn();
      const onFinally = vi.fn();

      const asyncFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw error;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string>>;

      scope.run(() => {
        result = useLatest(asyncFn, { onError, onFinally });
      });

      const promise = result.run();
      expect(result.loading.value).toBe(true);

      await vi.advanceTimersByTimeAsync(50);
      const data = await promise;

      expect(data).toBeUndefined();
      expect(result.loading.value).toBe(false);
      expect(result.error.value).toBe(error);
      expect(onError).toHaveBeenCalledWith(error, []);
      expect(onFinally).toHaveBeenCalledWith([]);

      scope.stop();
    });

    it('should propagate error to globalConfig.onError when configured via plugin', async () => {
      const globalError = vi.fn();
      const testError = new Error('Global error test');
      const asyncFn = vi.fn(async () => {
        throw testError;
      });

      let result!: ReturnType<typeof useLatest<void>>;

      const app = createApp({
        setup() {
          result = useLatest(asyncFn);
          return () => h('div');
        },
      });

      app.use(createAtengVue({ onError: globalError }));
      const root = document.createElement('div');
      app.mount(root);

      await result.run();

      expect(globalError).toHaveBeenCalledTimes(1);
      expect(globalError).toHaveBeenCalledWith(testError);

      app.unmount();
    });
  });

  describe('Seam 2: Dual Defense & Anti-Race Invariant (Fast-after-Slow)', () => {
    it('should discard slow request result when fast subsequent request resolves earlier', async () => {
      const receivedSignals: AbortSignal[] = [];
      const onSuccess = vi.fn();

      const asyncFn = vi.fn(async (signal: AbortSignal, delay: number, val: string) => {
        receivedSignals.push(signal);
        await new Promise(resolve => setTimeout(resolve, delay));
        return val;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string, [number, string]>>;

      scope.run(() => {
        result = useLatest(asyncFn, { onSuccess });
      });

      // 1. 发起先发慢请求 A (400ms)
      result.run(400, 'slow_A');
      expect(receivedSignals[0]?.aborted).toBe(false);

      // 2. 50ms 后发起后发快请求 B (100ms)
      await vi.advanceTimersByTimeAsync(50);
      result.run(100, 'fast_B');

      // 物理中断检验：请求 A 的 signal 应立即被触发 abort
      expect(receivedSignals[0]?.aborted).toBe(true);
      expect(receivedSignals[1]?.aborted).toBe(false);

      // 3. 再前进 100ms（总计 150ms），请求 B 到达并返回
      await vi.advanceTimersByTimeAsync(100);
      expect(result.data.value).toBe('fast_B');
      expect(result.loading.value).toBe(false);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('fast_B', [100, 'fast_B']);

      // 4. 再前进 250ms（总计 400ms），原本慢请求 A 延时结束
      await vi.advanceTimersByTimeAsync(250);

      // 逻辑过期检验：请求 A 的结果被坚决丢弃，绝不覆盖 fast_B
      expect(result.data.value).toBe('fast_B');
      expect(onSuccess).toHaveBeenCalledTimes(1); // 慢请求成功回调不得触发

      scope.stop();
    });

    it('should discard expired error when a slow request fails after a fast request succeeds', async () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();

      const asyncFn = vi.fn(async (signal: AbortSignal, delay: number, shouldFail: boolean) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            if (shouldFail) {
              reject(new Error('Slow request failed'));
            } else {
              resolve('Fast success');
            }
          }, delay);

          signal.addEventListener('abort', () => {
            // 物理中断模拟
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });
        return 'done';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<unknown, [number, boolean]>>;

      scope.run(() => {
        result = useLatest(asyncFn, { onError, onSuccess });
      });

      // 发起慢请求（本应失败）
      result.run(300, true);

      // 50ms 后发起快请求（成功）
      await vi.advanceTimersByTimeAsync(50);
      result.run(50, false);

      // 快请求在 100ms 完成
      await vi.advanceTimersByTimeAsync(50);
      expect(result.data.value).toBe('done');
      expect(result.error.value).toBeUndefined();
      expect(onError).not.toHaveBeenCalled();

      // 前进到 300ms 慢请求完全结束
      await vi.advanceTimersByTimeAsync(200);
      expect(result.data.value).toBe('done');
      expect(result.error.value).toBeUndefined();
      expect(onError).not.toHaveBeenCalled();

      scope.stop();
    });
  });

  describe('Seam 3: Cancel & Mutate Facades', () => {
    it('cancel should immediately abort active request and discard pending resolution', async () => {
      let activeSignal!: AbortSignal;
      const asyncFn = vi.fn(async (signal: AbortSignal) => {
        activeSignal = signal;
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'resolved_later';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string>>;

      scope.run(() => {
        result = useLatest(asyncFn);
      });

      result.run();
      expect(result.loading.value).toBe(true);
      expect(activeSignal.aborted).toBe(false);

      // 主动取消
      result.cancel();
      expect(result.loading.value).toBe(false);
      expect(activeSignal.aborted).toBe(true);

      // 200ms 后原 Promise 结束，数据不应被更新
      await vi.advanceTimersByTimeAsync(200);
      expect(result.data.value).toBeUndefined();

      scope.stop();
    });

    it('mutate should support optimistic direct value and updater function', () => {
      const asyncFn = vi.fn(async () => 'hello');
      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string>>;

      scope.run(() => {
        result = useLatest(asyncFn, { initialData: 'init' });
      });

      // 1. 直接赋值
      result.mutate('optimistic_1');
      expect(result.data.value).toBe('optimistic_1');

      // 2. 函数式更新
      result.mutate(prev => `${prev}_mutated`);
      expect(result.data.value).toBe('optimistic_1_mutated');

      scope.stop();
    });
  });

  describe('Seam 4: Deterministic Lifecycle Cleanup', () => {
    it('should abort in-flight request when effect scope is disposed', () => {
      let activeSignal!: AbortSignal;
      const asyncFn = vi.fn(async (signal: AbortSignal) => {
        activeSignal = signal;
        await new Promise(resolve => setTimeout(resolve, 300));
        return 'scope_data';
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useLatest<string>>;

      scope.run(() => {
        result = useLatest(asyncFn);
      });

      result.run();
      expect(result.loading.value).toBe(true);
      expect(activeSignal.aborted).toBe(false);

      // 销毁作用域
      scope.stop();

      expect(activeSignal.aborted).toBe(true);
      expect(result.loading.value).toBe(false);
    });
  });
});

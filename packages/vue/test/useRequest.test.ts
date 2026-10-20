/**
 * useRequest 请求状态机与只读响应式契约单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref, createApp, h } from 'vue';
import { BusinessException } from '@atengk/core';
import { useRequest, createAtengVue } from '../src';

describe('useRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should auto-run by default on setup and update readonly state', async () => {
    const service = vi.fn(async (id: number) => `user_${id}`);
    const scope = effectScope();

    let result!: ReturnType<typeof useRequest<string, [number]>>;

    scope.run(() => {
      result = useRequest(service, { defaultParams: [1] });
    });

    expect(result.loading.value).toBe(true);
    expect(isReadonly(result.loading)).toBe(true);
    expect(isReadonly(result.data)).toBe(true);
    expect(isReadonly(result.error)).toBe(true);

    await vi.runAllTimersAsync();

    expect(result.loading.value).toBe(false);
    expect(result.data.value).toBe('user_1');
    expect(result.error.value).toBeUndefined();
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith(1);

    scope.stop();
  });

  it('should not execute automatically when manual: true is configured', async () => {
    const service = vi.fn(async () => 'manual_data');
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service, { manual: true });
    });

    expect(result.loading.value).toBe(false);
    expect(result.data.value).toBeUndefined();
    expect(service).not.toHaveBeenCalled();

    const promise = result.run();
    expect(result.loading.value).toBe(true);

    await vi.runAllTimersAsync();
    await promise;

    expect(result.loading.value).toBe(false);
    expect(result.data.value).toBe('manual_data');
    expect(service).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('should allow local optimistic updates via mutate without re-running service', async () => {
    const service = vi.fn(async () => 'original');
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service);
    });

    await vi.runAllTimersAsync();
    expect(result.data.value).toBe('original');

    // 显式 mutate 赋值
    result.mutate('optimistic_updated');
    expect(result.data.value).toBe('optimistic_updated');
    expect(service).toHaveBeenCalledTimes(1);

    // 函数式 mutate
    result.mutate(prev => `${prev}_suffix`);
    expect(result.data.value).toBe('optimistic_updated_suffix');

    scope.stop();
  });

  it('should respect ready guard and trigger when ready transitions to true', async () => {
    const isReady = ref(false);
    let finishRequest!: (v: string) => void;
    const service = vi.fn(
      () =>
        new Promise<string>(resolve => {
          finishRequest = resolve;
        }),
    );
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service, { ready: isReady });
    });

    expect(result.loading.value).toBe(false);
    expect(service).not.toHaveBeenCalled();

    isReady.value = true;
    expect(result.loading.value).toBe(true);
    expect(service).toHaveBeenCalledTimes(1);

    finishRequest('ready_data');
    await vi.runAllTimersAsync();
    expect(result.loading.value).toBe(false);
    expect(result.data.value).toBe('ready_data');

    scope.stop();
  });

  it('should refresh using previous parameters', async () => {
    const service = vi.fn(async (query: string) => `result_${query}`);
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, [string]>>;

    scope.run(() => {
      result = useRequest(service, { defaultParams: ['initial'] });
    });

    await vi.runAllTimersAsync();
    expect(result.data.value).toBe('result_initial');

    await result.run('custom');
    await vi.runAllTimersAsync();
    expect(result.data.value).toBe('result_custom');

    await result.refresh();
    await vi.runAllTimersAsync();
    expect(service).toHaveBeenLastCalledWith('custom');

    scope.stop();
  });

  it('should discard stale promise result on concurrent calls when cancelPrevious: true', async () => {
    let slowResolve!: (v: string) => void;
    let fastResolve!: (v: string) => void;

    const slowService = () =>
      new Promise<string>(resolve => {
        slowResolve = resolve;
      });

    const fastService = () =>
      new Promise<string>(resolve => {
        fastResolve = resolve;
      });

    let currentService: () => Promise<string> = slowService;
    const service = vi.fn(() => currentService());

    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service, { manual: true, cancelPrevious: true });
    });

    // 第一次调用（慢请求）
    currentService = slowService;
    const p1 = result.run();

    // 第二次调用（快请求）
    currentService = fastService;
    const p2 = result.run();

    // 快请求先返回
    fastResolve('fast_result');
    await p2;
    expect(result.data.value).toBe('fast_result');

    // 慢请求后返回，状态应被丢弃，保持最新快请求数据
    slowResolve('slow_result_stale');
    await p1;
    expect(result.data.value).toBe('fast_result');

    scope.stop();
  });

  it('should cancel active request via cancel()', async () => {
    const service = vi.fn(
      () =>
        new Promise<string>(resolve => {
          setTimeout(() => resolve('done'), 1000);
        }),
    );

    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service);
    });

    expect(result.loading.value).toBe(true);

    result.cancel();
    expect(result.loading.value).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(result.data.value).toBeUndefined();

    scope.stop();
  });

  it('should debounce rapid run invocations when debounceInterval is set', async () => {
    const service = vi.fn(async (q: string) => `data_${q}`);
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, [string]>>;

    scope.run(() => {
      result = useRequest(service, { manual: true, debounceInterval: 300 });
    });

    result.run('a');
    result.run('b');
    result.run('c');

    expect(service).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(service).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith('c');

    await vi.runAllTimersAsync();
    expect(result.data.value).toBe('data_c');

    scope.stop();
  });

  it('should throttle rapid run invocations when throttleInterval is set', async () => {
    const service = vi.fn(async (q: string) => `throttle_${q}`);
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, [string]>>;

    scope.run(() => {
      result = useRequest(service, { manual: true, throttleInterval: 500 });
    });

    result.run('1');
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith('1');

    result.run('2');
    result.run('3');
    expect(service).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(service).toHaveBeenCalledTimes(2);

    scope.stop();
  });

  it('should poll periodically when pollingInterval is set', async () => {
    const service = vi.fn(async () => 'poll_tick');
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service, { pollingInterval: 1000 });
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(service).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service).toHaveBeenCalledTimes(3);

    result.cancel();
    scope.stop();
  });

  it('should automatically cleanup timers and cancel in-flight request when scope disposes', async () => {
    const service = vi.fn(async () => 'poll_data');
    const scope = effectScope();
    let result!: ReturnType<typeof useRequest<string, []>>;

    scope.run(() => {
      result = useRequest(service, { pollingInterval: 1000 });
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(service).toHaveBeenCalledTimes(1);

    // 销毁作用域
    scope.stop();

    await vi.advanceTimersByTimeAsync(5000);
    // 销毁后不应继续轮询
    expect(service).toHaveBeenCalledTimes(1);
    expect(result.loading.value).toBe(false);
  });

  it('should capture BusinessException into error state and trigger onError callback', async () => {
    const customError = new BusinessException('系统忙', 5001, 'trace_abc');
    const service = vi.fn(async () => {
      throw customError;
    });

    const onErrorHook = vi.fn();
    const globalOnError = vi.fn();

    const app = createApp({
      setup() {
        useRequest(service, { onError: onErrorHook });
        return () => h('div');
      },
    });

    app.use(createAtengVue({ onError: globalOnError }));

    const root = document.createElement('div');
    app.mount(root);

    await vi.advanceTimersByTimeAsync(0);

    expect(onErrorHook).toHaveBeenCalledTimes(1);
    expect(onErrorHook).toHaveBeenCalledWith(customError, []);

    expect(globalOnError).toHaveBeenCalledTimes(1);
    expect(globalOnError).toHaveBeenCalledWith(customError);

    app.unmount();
  });
});

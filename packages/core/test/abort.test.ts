/**
 * 异步请求取消协调器与防竞态互斥单元测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { describe, expect, it, vi } from 'vitest';
import {
  AbortCoordinator,
  createAbortCoordinator,
  generateRequestKey,
  isAbortError,
} from '../src/abort';

describe('AbortCoordinator & Concurrency Control (请求取消协调器与防竞态互斥)', () => {
  describe('1. generateRequestKey (请求特征唯一键生成器)', () => {
    it('应根据 Method + URL + Params 规范化组装唯一请求键', () => {
      const key1 = generateRequestKey({
        method: 'get',
        url: '/api/v1/users',
        params: { pageNum: 1, pageSize: 20 },
      });

      expect(key1).toBe('GET:/api/v1/users?{"pageNum":1,"pageSize":20}');
    });

    it('不同字段顺序的对象参数应生成相同的确定性指纹', () => {
      const keyA = generateRequestKey({
        method: 'POST',
        url: '/api/v1/order',
        data: { b: 2, a: 1, c: { z: 26, y: 25 } },
      });

      const keyB = generateRequestKey({
        method: 'post',
        url: '/api/v1/order',
        data: { c: { y: 25, z: 26 }, a: 1, b: 2 },
      });

      expect(keyA).toBe(keyB);
    });

    it('显式传入 abortKey 时应优先使用自定义键名', () => {
      const key = generateRequestKey({
        method: 'GET',
        url: '/api/users',
        abortKey: 'custom-user-fetch-key',
      });

      expect(key).toBe('custom-user-fetch-key');
    });

    it('空入参应具备确定性空安全保底', () => {
      expect(generateRequestKey({})).toBe('GET:');
    });
  });

  describe('2. AbortCoordinator 未决请求生命周期', () => {
    it('register 后应能准确查询未决状态，并在 remove 后注销', () => {
      const coordinator = new AbortCoordinator();
      const registration = coordinator.register({
        key: 'GET:/api/users',
      });

      expect(registration.key).toBe('GET:/api/users');
      expect(registration.controller).toBeDefined();
      expect(registration.signal.aborted).toBe(false);
      expect(coordinator.isPending('GET:/api/users')).toBe(true);
      expect(coordinator.getPendingCount()).toBe(1);

      coordinator.remove('GET:/api/users');
      expect(coordinator.isPending('GET:/api/users')).toBe(false);
      expect(coordinator.getPendingCount()).toBe(0);
    });

    it('cancel 能手动中断指定请求，触发 signal 的 abort 事件', () => {
      const coordinator = createAbortCoordinator();
      const registration = coordinator.register({
        key: 'GET:/api/slow-report',
      });

      const onAbort = vi.fn();
      registration.signal.addEventListener('abort', onAbort);

      const canceled = coordinator.cancel('GET:/api/slow-report', 'User clicked cancel');
      expect(canceled).toBe(true);
      expect(registration.signal.aborted).toBe(true);
      expect(onAbort).toHaveBeenCalledTimes(1);
      expect(coordinator.isPending('GET:/api/slow-report')).toBe(false);
    });

    it('cancelAll 能批量中断所有未决请求', () => {
      const coordinator = createAbortCoordinator();
      const reg1 = coordinator.register({ key: 'req-1' });
      const reg2 = coordinator.register({ key: 'req-2' });

      expect(coordinator.getPendingCount()).toBe(2);

      coordinator.cancelAll('Batch cancellation');

      expect(reg1.signal.aborted).toBe(true);
      expect(reg2.signal.aborted).toBe(true);
      expect(coordinator.getPendingCount()).toBe(0);
    });
  });

  describe('3. cancelDuplicate 重复请求自动中断与防竞态', () => {
    it('配置 cancelDuplicate: true 时，后置同特征请求应中断前置未决请求', () => {
      const coordinator = createAbortCoordinator();
      const key = 'GET:/api/search?keyword=vue';

      // 发起第 1 次搜索请求
      const reg1 = coordinator.register({
        key,
        cancelDuplicate: true,
      });

      const onAbort1 = vi.fn();
      reg1.signal.addEventListener('abort', onAbort1);
      expect(reg1.signal.aborted).toBe(false);

      // 紧接着发起第 2 次相同特征的搜索请求
      const reg2 = coordinator.register({
        key,
        cancelDuplicate: true,
      });

      // 验证第 1 次请求已被自动中断
      expect(reg1.signal.aborted).toBe(true);
      expect(onAbort1).toHaveBeenCalledTimes(1);

      // 验证第 2 次请求正常处于未决状态且未被中断
      expect(reg2.signal.aborted).toBe(false);
      expect(coordinator.isPending(key)).toBe(true);
      expect(coordinator.getPendingCount()).toBe(1);
    });

    it('cancelDuplicate: false 时重复注册支持多实例并行追踪与精确注销', () => {
      const coordinator = createAbortCoordinator();
      const key = 'GET:/api/list';

      const reg1 = coordinator.register({ key, cancelDuplicate: false });
      const reg2 = coordinator.register({ key, cancelDuplicate: false });

      expect(reg1.signal.aborted).toBe(false);
      expect(reg2.signal.aborted).toBe(false);
      expect(coordinator.getPendingCount()).toBe(2);

      // 精确注销第 1 个请求
      coordinator.remove(key, reg1.controller);
      expect(coordinator.getPendingCount()).toBe(1);
      expect(coordinator.isPending(key)).toBe(true);

      // 注销第 2 个请求
      coordinator.remove(key, reg2.controller);
      expect(coordinator.getPendingCount()).toBe(0);
      expect(coordinator.isPending(key)).toBe(false);
    });
  });

  describe('4. 外部 AbortSignal 级联与清理防线', () => {
    it('外部传入的 signal 发生中断时应联动中断并自动移出未决集合', () => {
      const coordinator = createAbortCoordinator();
      const externalController = new AbortController();

      const reg = coordinator.register({
        key: 'GET:/api/scoped-data',
        signal: externalController.signal,
      });

      expect(reg.signal.aborted).toBe(false);
      expect(coordinator.isPending('GET:/api/scoped-data')).toBe(true);

      // 外部触发中断（如组件 onUnmounted）
      externalController.abort('Component unmounted');

      expect(reg.signal.aborted).toBe(true);
      expect(coordinator.isPending('GET:/api/scoped-data')).toBe(false);
      expect(coordinator.getPendingCount()).toBe(0);
    });

    it('若传入已提前处于 aborted 状态的外部 signal，新控制器应直接处于 aborted 状态', () => {
      const coordinator = createAbortCoordinator();
      const externalController = new AbortController();
      externalController.abort('Pre-aborted');

      const reg = coordinator.register({
        key: 'GET:/api/pre-canceled',
        signal: externalController.signal,
      });

      expect(reg.signal.aborted).toBe(true);
    });

    it('remove 请求时应确定性清理外部 signal 监听，防止内存泄漏', () => {
      const coordinator = createAbortCoordinator();
      const externalController = new AbortController();

      coordinator.register({
        key: 'GET:/api/leak-check',
        signal: externalController.signal,
      });

      coordinator.remove('GET:/api/leak-check');

      // 移除后再触发外部 abort，不应报错且无影响
      expect(() => externalController.abort()).not.toThrow();
    });
  });

  describe('5. isAbortError 异常类型判定', () => {
    it('能正确识别各类标准的取消异常', () => {
      const abortError = new DOMException('The user aborted a request.', 'AbortError');
      expect(isAbortError(abortError)).toBe(true);

      const customCanceled = { name: 'CanceledError', message: 'canceled' };
      expect(isAbortError(customCanceled)).toBe(true);

      const axiosCanceled = { code: 'ERR_CANCELED', message: 'canceled' };
      expect(isAbortError(axiosCanceled)).toBe(true);

      const normalError = new Error('Network Error');
      expect(isAbortError(normalError)).toBe(false);

      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  describe('6. 异步并发与时序倒挂仿真 (Race Condition Simulation)', () => {
    it('连续发送慢请求与快请求时，前序慢请求被中断，彻底杜绝数据时序倒挂', async () => {
      const coordinator = createAbortCoordinator();

      // 模拟异步请求执行器
      const executeAsyncQuery = (keyword: string, delayMs: number) => {
        const key = 'GET:/api/suggest';
        const registration = coordinator.register({
          key,
          cancelDuplicate: true,
        });

        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (registration.signal.aborted) {
              reject(new DOMException('Canceled duplicate request', 'AbortError'));
              return;
            }
            coordinator.remove(key);
            resolve(`Result for: ${keyword}`);
          }, delayMs);

          registration.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            coordinator.remove(key);
            reject(new DOMException('Canceled duplicate request', 'AbortError'));
          });
        });
      };

      // 1. 发起第 1 次搜索（慢请求，100ms）
      const query1 = executeAsyncQuery('vue', 100).catch(err => {
        if (isAbortError(err)) {
          return 'QUERY_1_ABORTED';
        }
        throw err;
      });

      // 2. 紧接着发起第 2 次搜索（快请求，20ms）
      const query2 = executeAsyncQuery('vue3', 20);

      // 3. 等待两个请求完成
      const [res1, res2] = await Promise.all([query1, query2]);

      expect(res1).toBe('QUERY_1_ABORTED');
      expect(res2).toBe('Result for: vue3');
      expect(coordinator.getPendingCount()).toBe(0);
    });
  });
});

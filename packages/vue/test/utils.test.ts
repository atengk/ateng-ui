/**
 * 响应式生命周期与时间调度微工具单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { tryOnScopeDispose, useEventListener, useDebounceFn, useThrottleFn } from '../src';

describe('utils: lifecycle & timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tryOnScopeDispose', () => {
    it('should register dispose callback when in an active effect scope', () => {
      const cleanup = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        const registered = tryOnScopeDispose(cleanup);
        expect(registered).toBe(true);
      });

      expect(cleanup).not.toHaveBeenCalled();
      scope.stop();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should return false when called outside of an active effect scope', () => {
      const cleanup = vi.fn();
      const registered = tryOnScopeDispose(cleanup);

      expect(registered).toBe(false);
      expect(cleanup).not.toHaveBeenCalled();
    });
  });

  describe('useEventListener', () => {
    it('should attach event listener to target and receive events', () => {
      const target = document.createElement('div');
      const listener = vi.fn();

      const stop = useEventListener(target, 'click', listener);

      target.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);

      stop();
      target.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should automatically remove listener when scope disposes', () => {
      const target = document.createElement('div');
      const listener = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        useEventListener(target, 'click', listener);
      });

      target.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);

      scope.stop();
      target.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support ref target and handle dynamic target changes', () => {
      const target1 = document.createElement('div');
      const target2 = document.createElement('div');
      const currentTarget = ref<HTMLElement | null>(target1);
      const listener = vi.fn();

      const scope = effectScope();
      scope.run(() => {
        useEventListener(currentTarget, 'click', listener);
      });

      target1.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);

      currentTarget.value = target2;
      target1.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(1);

      target2.dispatchEvent(new Event('click'));
      expect(listener).toHaveBeenCalledTimes(2);

      scope.stop();
    });
  });

  describe('useDebounceFn', () => {
    it('should debounce function execution until delay elapsed', () => {
      const fn = vi.fn((x: number) => x * 2);
      const debounced = useDebounceFn(fn, 200);

      debounced(1);
      debounced(2);
      debounced(3);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(199);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it('should cancel pending call via cancel method', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 200);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should automatically cancel pending execution when scope disposes', () => {
      const fn = vi.fn();
      let debounced!: ReturnType<typeof useDebounceFn<typeof fn>>;
      const scope = effectScope();

      scope.run(() => {
        debounced = useDebounceFn(fn, 200);
      });

      debounced();
      scope.stop();

      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('useThrottleFn', () => {
    it('should throttle function executions', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, 200);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should cancel pending throttle on cancel method', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, 200);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled.cancel();
      vi.advanceTimersByTime(200);
    });

    it('should automatically cancel on scope dispose', () => {
      const fn = vi.fn();
      let throttled!: ReturnType<typeof useThrottleFn<typeof fn>>;
      const scope = effectScope();

      scope.run(() => {
        throttled = useThrottleFn(fn, 200);
      });

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      scope.stop();
      vi.advanceTimersByTime(300);
    });
  });
});

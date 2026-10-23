/**
 * useAntiFlicker 工业级防闪烁时序状态机单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useAntiFlicker } from '../src';

describe('useAntiFlicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('防闪烁静默防御：耗时低于 delay 阈值 (默认 150ms) 时，isPending 始终保持 false (0ms 打扰)', () => {
    const scope = effectScope();
    const active = ref(false);

    scope.run(() => {
      const isPending = useAntiFlicker(active);
      expect(isReadonly(isPending)).toBe(true);
      expect(isPending.value).toBe(false);

      // 1. 发起请求
      active.value = true;
      // 推进 80ms (< 150ms 阈值)
      vi.advanceTimersByTime(80);
      expect(isPending.value).toBe(false);

      // 2. 接口极速响应返回
      active.value = false;
      // 继续推进 200ms，指示器从未露头
      vi.advanceTimersByTime(200);
      expect(isPending.value).toBe(false);
    });

    scope.stop();
  });

  it('最小持续时间保护：耗时突破 150ms 激活后，至少保证展示 300ms 最小周期', () => {
    const scope = effectScope();
    const active = ref(false);

    scope.run(() => {
      const isPending = useAntiFlicker(active);

      // 1. 触发 loading
      active.value = true;
      expect(isPending.value).toBe(false);

      // 推进 150ms，突破阈值，激活展示
      vi.advanceTimersByTime(150);
      expect(isPending.value).toBe(true);

      // 2. 再过 50ms (此时已展示 50ms) 接口返回完成
      vi.advanceTimersByTime(50);
      active.value = false;

      // 此时必须依然保持展示态 (受 300ms 最短保护期约束)
      expect(isPending.value).toBe(true);

      // 推进 200ms (累计展示 250ms < 300ms)，依然展示
      vi.advanceTimersByTime(200);
      expect(isPending.value).toBe(true);

      // 再推进 50ms (累计展示 300ms)，保护期满，平稳关闭
      vi.advanceTimersByTime(50);
      expect(isPending.value).toBe(false);
    });

    scope.stop();
  });

  it('自然长耗时场景：耗时超过 minDuration (300ms) 时，active 变为 false 立即解除', () => {
    const scope = effectScope();
    const active = ref(false);

    scope.run(() => {
      const isPending = useAntiFlicker(active);

      active.value = true;
      // 突破 150ms 激活
      vi.advanceTimersByTime(150);
      expect(isPending.value).toBe(true);

      // 持续加载 400ms (> 300ms 最小展示期)
      vi.advanceTimersByTime(400);
      expect(isPending.value).toBe(true);

      // 接口返回，已超过最小展示期，立即关闭
      active.value = false;
      expect(isPending.value).toBe(false);
    });

    scope.stop();
  });

  it('支持自定义 delay 与 minDuration 配置，以及 Getter 箭头函数响应式解构', () => {
    const scope = effectScope();
    const state = ref({ loading: false });

    scope.run(() => {
      const isPending = useAntiFlicker(() => state.value.loading, {
        delay: 80,
        minDuration: 200,
      });

      state.value.loading = true;
      vi.advanceTimersByTime(50);
      expect(isPending.value).toBe(false);

      vi.advanceTimersByTime(30); // 累计 80ms
      expect(isPending.value).toBe(true);

      state.value.loading = false;
      vi.advanceTimersByTime(150);
      expect(isPending.value).toBe(true);

      vi.advanceTimersByTime(50); // 累计展示 200ms
      expect(isPending.value).toBe(false);
    });

    scope.stop();
  });

  it('确定性生命周期清理：Scope 销毁 (onScopeDispose) 时清空活跃定时器，杜绝内存泄漏', () => {
    const scope = effectScope();
    const active = ref(false);
    let isPending!: ReturnType<typeof useAntiFlicker>;

    scope.run(() => {
      isPending = useAntiFlicker(active);
      active.value = true;
      vi.advanceTimersByTime(50); // 处于 150ms 等待期间
    });

    // 销毁 scope
    scope.stop();

    // 推进时间到原本应当触发的时刻
    vi.advanceTimersByTime(200);

    // 定时器已被销毁，isPending 不会被异步翻转
    expect(isPending.value).toBe(false);
  });
});

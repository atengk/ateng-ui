/**
 * AtengLoadingBar 顶栏纳米科技流光线单例门面单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtengLoadingBar, installLoadingBar } from '../src';

describe('AtengLoadingBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    AtengLoadingBar.reset();
  });

  afterEach(() => {
    AtengLoadingBar.reset();
    // 清理全局 DOM 节点，恪守 Hermetic 单测铁律
    document.querySelectorAll('.at-loading-bar').forEach(el => el.remove());
    vi.restoreAllMocks();
  });

  it('基础生命周期：start -> inc -> finish 状态流转与 DOM 节点挂载', () => {
    // 1. 启动
    AtengLoadingBar.start();

    const barEl = document.querySelector<HTMLElement>('.at-loading-bar');
    expect(barEl).not.toBeNull();
    expect(barEl?.classList.contains('is-active')).toBe(true);

    const trackEl = barEl?.querySelector<HTMLElement>('.at-loading-bar__track');
    expect(trackEl).not.toBeNull();
    // 默认初始进度在 20%~30% 之间
    expect(parseFloat(trackEl?.style.width || '0')).toBeGreaterThan(0);

    // 2. 手动推进一步
    const prevWidth = parseFloat(trackEl?.style.width || '0');
    AtengLoadingBar.inc(15);
    const newWidth = parseFloat(trackEl?.style.width || '0');
    expect(newWidth).toBeGreaterThan(prevWidth);

    // 3. 完成
    AtengLoadingBar.finish();
    expect(trackEl?.style.width).toBe('100%');

    // 推进淡出动画定时器
    vi.advanceTimersByTime(250);
    expect(barEl?.classList.contains('is-active')).toBe(false);

    // 推进重置定时器
    vi.advanceTimersByTime(250);
    expect(trackEl?.style.width).toBe('0%');
  });

  it('异常反馈：error 状态下呈现 is-error 红光并在延迟后重置', () => {
    AtengLoadingBar.start();
    const barEl = document.querySelector<HTMLElement>('.at-loading-bar');
    const trackEl = barEl?.querySelector<HTMLElement>('.at-loading-bar__track');

    AtengLoadingBar.error();
    expect(barEl?.classList.contains('is-error')).toBe(true);
    expect(trackEl?.style.width).toBe('100%');

    // 错误状态停留稍长时间供人眼识别
    vi.advanceTimersByTime(300);
    expect(barEl?.classList.contains('is-active')).toBe(false);

    vi.advanceTimersByTime(500);
    expect(barEl?.classList.contains('is-error')).toBe(false);
    expect(trackEl?.style.width).toBe('0%');
  });

  it('单例与幂等性：连续多次 start() 仅保留单物理节点，且进度递增平滑防抖不倒退', () => {
    AtengLoadingBar.start();
    AtengLoadingBar.inc(40); // 进度推进至 65%

    const barEl = document.querySelector<HTMLElement>('.at-loading-bar');
    const trackEl = barEl?.querySelector<HTMLElement>('.at-loading-bar__track');
    const currentProgress = parseFloat(trackEl?.style.width || '0');
    expect(currentProgress).toBe(65);

    // 再次调用 start()，断言不跳水倒退回 25%
    AtengLoadingBar.start();
    const afterProgress = parseFloat(trackEl?.style.width || '0');
    expect(afterProgress).toBe(65);

    const bars = document.querySelectorAll('.at-loading-bar');
    expect(bars.length).toBe(1);
  });

  it('对称语义与资源释放：destroy() 彻底卸载全局 DOM 节点并清空状态', () => {
    AtengLoadingBar.start();
    expect(document.querySelector('.at-loading-bar')).not.toBeNull();

    AtengLoadingBar.destroy();
    expect(document.querySelector('.at-loading-bar')).toBeNull();
  });

  it('全自动路由接管：installLoadingBar 幂等注册与 uninstall 对称解绑', () => {
    let beforeEachCb: (() => void) | null = null;
    let afterEachCb: (() => void) | null = null;
    let onErrorCb: (() => void) | null = null;

    const unbindBefore = vi.fn();
    const unbindAfter = vi.fn();
    const unbindError = vi.fn();

    const mockRouter = {
      beforeEach: vi.fn((cb: () => void) => {
        beforeEachCb = cb;
        return unbindBefore;
      }),
      afterEach: vi.fn((cb: () => void) => {
        afterEachCb = cb;
        return unbindAfter;
      }),
      onError: vi.fn((cb: () => void) => {
        onErrorCb = cb;
        return unbindError;
      }),
    };

    // 首次注册
    const uninstall1 = installLoadingBar(
      mockRouter as unknown as Parameters<typeof installLoadingBar>[0],
    );
    // 重复注册（验证幂等）
    const uninstall2 = installLoadingBar(
      mockRouter as unknown as Parameters<typeof installLoadingBar>[0],
    );

    expect(uninstall1).toBe(uninstall2);
    expect(mockRouter.beforeEach).toHaveBeenCalledTimes(1);
    expect(mockRouter.afterEach).toHaveBeenCalledTimes(1);
    expect(mockRouter.onError).toHaveBeenCalledTimes(1);

    // 模拟导航开始
    beforeEachCb!();
    const barEl = document.querySelector<HTMLElement>('.at-loading-bar');
    expect(barEl?.classList.contains('is-active')).toBe(true);

    // 模拟导航结束
    afterEachCb!();
    const trackEl = barEl?.querySelector<HTMLElement>('.at-loading-bar__track');
    expect(trackEl?.style.width).toBe('100%');

    // 模拟路由错误
    onErrorCb!();
    expect(barEl?.classList.contains('is-error')).toBe(true);

    // 执行对称解绑
    uninstall1();
    expect(unbindBefore).toHaveBeenCalledTimes(1);
    expect(unbindAfter).toHaveBeenCalledTimes(1);
    expect(unbindError).toHaveBeenCalledTimes(1);
  });
});

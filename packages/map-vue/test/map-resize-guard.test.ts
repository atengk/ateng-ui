/**
 * MapResizeGuard 视口几何自愈守卫单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapResizeGuard } from '../src';

describe('MapResizeGuard 视口几何自愈守卫', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('初始处于 0x0 隐藏几何时应当被正确标记为挂起', () => {
    // 默认 getBoundingClientRect 返回 0x0
    const onResize = vi.fn();
    const guard = new MapResizeGuard(element, onResize);

    expect(guard.suspended).toBe(true);
    guard.disconnect();
  });

  it('调用 checkNow 或尺寸恢复有效值时应当触发自愈重绘回调', async () => {
    const onResize = vi.fn();
    const guard = new MapResizeGuard(element, onResize);

    // 模拟容器恢复有效尺寸
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    guard.checkNow();

    // 等待 rAF 或 setTimeout
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(guard.suspended).toBe(false);
    expect(onResize).toHaveBeenCalled();

    guard.disconnect();
  });

  it('disconnect 应当断开所有观察器与取消调度', () => {
    const onResize = vi.fn();
    const guard = new MapResizeGuard(element, onResize);

    guard.disconnect();
    expect(guard['observer']).toBeNull();
    expect(guard['element']).toBeNull();
  });
});

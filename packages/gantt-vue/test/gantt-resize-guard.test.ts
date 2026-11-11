/**
 * 甘特图视口几何自愈守卫 (GanttResizeGuard) 单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GanttResizeGuard } from '../src';

describe('GanttResizeGuard', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('初始处于 0x0 几何时应当标记为挂起状态', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const onResize = vi.fn();
    const guard = new GanttResizeGuard(element, onResize);

    expect(guard.suspended).toBe(true);
    expect(onResize).not.toHaveBeenCalled();

    guard.disconnect();
  });

  it('初始具有有效尺寸时不应处于挂起状态', () => {
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

    const onResize = vi.fn();
    const guard = new GanttResizeGuard(element, onResize);

    expect(guard.suspended).toBe(false);

    guard.disconnect();
  });

  it('手动 checkNow 应当触发自愈检查并在尺寸恢复后调用回调', async () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const onResize = vi.fn();
    const guard = new GanttResizeGuard(element, onResize);
    expect(guard.suspended).toBe(true);

    // 模拟容器展开恢复尺寸
    rectSpy.mockReturnValue({
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      bottom: 768,
      right: 1024,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    guard.checkNow();

    await new Promise(resolve => setTimeout(resolve, 30));

    expect(guard.suspended).toBe(false);
    expect(onResize).toHaveBeenCalled();

    guard.disconnect();
  });

  it('disconnect 应当注销 ResizeObserver 并在后续更新中保持静默', () => {
    const onResize = vi.fn();
    const guard = new GanttResizeGuard(element, onResize);

    guard.disconnect();
    guard.checkNow();

    expect(onResize).not.toHaveBeenCalled();
  });
});

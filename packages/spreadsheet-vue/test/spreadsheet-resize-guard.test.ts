/**
 * SpreadsheetResizeGuard 几何自愈守卫单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpreadsheetResizeGuard } from '../src/guards/spreadsheet-resize-guard';

describe('SpreadsheetResizeGuard', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  it('初始处于 0x0 视口时应当标记为挂起状态并静默不触发 resize 回调', () => {
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
    const guard = new SpreadsheetResizeGuard(element, onResize);

    expect(guard.suspended).toBe(true);
    expect(onResize).not.toHaveBeenCalled();

    guard.disconnect();
  });

  it('当容器从 0x0 恢复为有效尺寸时应当触发 onResize 回调并解除挂起', async () => {
    let mockWidth = 0;
    let mockHeight = 0;

    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({
      width: mockWidth,
      height: mockHeight,
      top: 0,
      left: 0,
      bottom: mockHeight,
      right: mockWidth,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    const onResize = vi.fn();
    const guard = new SpreadsheetResizeGuard(element, onResize);
    expect(guard.suspended).toBe(true);

    // 模拟容器展开为有效尺寸
    mockWidth = 800;
    mockHeight = 600;
    guard.checkNow();

    await new Promise(resolve => setTimeout(resolve, 30));

    expect(guard.suspended).toBe(false);
    expect(onResize).toHaveBeenCalledTimes(1);

    guard.disconnect();
  });

  it('disconnect 应当安全释放并阻止后续触发', () => {
    const onResize = vi.fn();
    const guard = new SpreadsheetResizeGuard(element, onResize);

    guard.disconnect();
    guard.checkNow();

    expect(onResize).not.toHaveBeenCalled();
  });
});

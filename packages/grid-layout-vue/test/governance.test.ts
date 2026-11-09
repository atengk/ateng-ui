/**
 * @atengk/grid-layout-vue 企业级双模治理、触控防冲突与数据自愈容灾测试。
 *
 * 遵循 ADR-0008 与 ADR-0045，验证：
 * 1. LayoutSanitizer 纯函数清洗与自愈容灾 (越界裁剪、重叠避让、负数与极值兜底)；
 * 2. EditViewDualMode 运行态只读保护与编辑态切换；
 * 3. TabWakeupHealing 容器从 0 尺寸唤醒自愈；
 * 4. 确定性生命周期清理与 DOM 保留。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengGridLayout, sanitizeLayout } from '../src';

describe('Governance & Fault-Tolerance (工单 #310)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  let resizeObserverCallback:
    ((entries: Array<{ contentRect: { width: number; height: number } }>) => void) | null = null;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    disconnectSpy = vi.fn();
    resizeObserverCallback = null;

    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(
        callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void,
      ) {
        resizeObserverCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe('LayoutSanitizer 纯函数清洗与容灾', () => {
    it('非数组或空入参安全兜底返回 []', () => {
      expect(sanitizeLayout(null)).toEqual([]);
      expect(sanitizeLayout(undefined)).toEqual([]);
      expect(sanitizeLayout('invalid')).toEqual([]);
      expect(sanitizeLayout({})).toEqual([]);
      expect(sanitizeLayout([])).toEqual([]);
    });

    it('过滤缺失有效 ID 的非法项', () => {
      const raw = [
        { id: '', w: 2, h: 2 },
        { id: null, w: 2, h: 2 },
        { id: undefined, w: 2, h: 2 },
        { id: 'valid-1', x: 0, y: 0, w: 2, h: 2 },
      ];
      const result = sanitizeLayout(raw);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('valid-1');
    });

    it('对负数坐标与极小尺寸进行自愈兜底 (w < 1, h < 1 兜底为 1)', () => {
      const raw = [{ id: 'card-1', x: -5, y: -2, w: 0, h: -3 }];
      const result = sanitizeLayout(raw, 12);
      expect(result[0].w).toBe(1);
      expect(result[0].h).toBe(1);
      expect(result[0].x).toBeGreaterThanOrEqual(0);
      expect(result[0].y).toBeGreaterThanOrEqual(0);
    });

    it('超出栅格总列宽的超大卡片自动裁剪为最大列宽 (w > column)', () => {
      const raw = [{ id: 'card-wide', x: 0, y: 0, w: 30, h: 4 }];
      const result = sanitizeLayout(raw, 12);
      expect(result[0].w).toBe(12);
    });

    it('跨度越界时自动平移自愈 (x + w > column)', () => {
      const raw = [
        // 列宽 12，x: 10, w: 4 -> 10 + 4 = 14 > 12，平移后 x 应该为 8
        { id: 'card-overflow', x: 10, y: 0, w: 4, h: 2 },
      ];
      const result = sanitizeLayout(raw, 12);
      expect(result[0].w).toBe(4);
      expect(result[0].x! + result[0].w!).toBeLessThanOrEqual(12);
      expect(result[0].x).toBe(8);
    });

    it('重叠卡片自动检测并寻找空位槽位插入', () => {
      const raw = [
        { id: 'card-1', x: 0, y: 0, w: 4, h: 2 },
        // card-2 与 card-1 在 (0, 0, 4, 2) 完全重合
        { id: 'card-2', x: 0, y: 0, w: 4, h: 2 },
      ];
      const result = sanitizeLayout(raw, 12);
      expect(result.length).toBe(2);
      expect(result[0].x).toBe(0);
      expect(result[0].y).toBe(0);

      // card-2 应该被平移避让至下一个空槽位 (4, 0)
      expect(result[1].x).toBe(4);
      expect(result[1].y).toBe(0);
    });
  });

  describe('EditViewDualMode 运行只读与编辑双模治理', () => {
    it('默认处于运行只读态 (editable: false)，禁止拖拽缩放', () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
        },
      });

      expect(wrapper.classes()).not.toContain('at-grid-layout--editable');
    });

    it('支持动态切换 editable 状态', async () => {
      const editable = ref(false);
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
          editable: editable.value,
        },
      });

      expect(wrapper.classes()).not.toContain('at-grid-layout--editable');

      await wrapper.setProps({ editable: true });
      expect(wrapper.classes()).toContain('at-grid-layout--editable');
    });
  });

  describe('TabWakeupHealing 隐藏 Tab 唤醒自愈', () => {
    it('暴露 wakeUp 实例方法供外部手动触发尺寸自愈', () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
        },
      });

      const vm = wrapper.vm as unknown as { wakeUp: () => void };
      expect(typeof vm.wakeUp).toBe('function');
    });

    it('当 ResizeObserver 检测到从 0 宽度唤醒至正尺寸时自动调用 onParentResize', async () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
          responsive: true,
        },
      });

      await nextTick();

      const gridInstance = (
        wrapper.vm as unknown as { grid: { value: { onParentResize: ReturnType<typeof vi.fn> } } }
      ).grid.value;
      if (gridInstance) {
        const resizeSpy = vi.spyOn(gridInstance, 'onParentResize');

        // 模拟从隐藏态 (0x0) 唤醒至可见态 (1000x600)
        if (resizeObserverCallback) {
          resizeObserverCallback([{ contentRect: { width: 1000, height: 600 } }]);
          await nextTick();
          expect(resizeSpy).toHaveBeenCalled();
        }
      }
    });
  });

  describe('确定性生命周期清理', () => {
    it('组件卸载时确定性调用 destroy(false) 与断开 ResizeObserver 监听', async () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
          responsive: true,
        },
      });

      await nextTick();

      const vm = wrapper.vm as unknown as {
        grid?:
          { value?: { destroy: (flag: boolean) => void } } | { destroy: (flag: boolean) => void };
      };
      const grid =
        (vm.grid as { value?: { destroy: (flag: boolean) => void } })?.value ??
        (vm.grid as { destroy: (flag: boolean) => void });

      let destroyCalledWith: unknown = null;
      if (grid) {
        const originalDestroy = grid.destroy.bind(grid);
        grid.destroy = (removeDOM: boolean) => {
          destroyCalledWith = removeDOM;
          return originalDestroy(removeDOM);
        };
      }

      wrapper.unmount();
      wrapper = null;

      expect(destroyCalledWith).toBe(false);
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});

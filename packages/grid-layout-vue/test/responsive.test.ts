/**
 * @atengk/grid-layout-vue 响应式容器断点、辅助参考线与 CSS Tokens 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengGridLayout, resolveResponsiveColumns, DEFAULT_RESPONSIVE_COLUMNS } from '../src';

describe('Responsive Breakpoints & Helper Lines', () => {
  let resizeObserverCallback:
    ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    disconnectSpy = vi.fn();
    resizeObserverCallback = null;

    // 模拟全局 ResizeObserver
    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
        resizeObserverCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveResponsiveColumns', () => {
    it('正确映射默认断点列数', () => {
      // xs (< 576)
      expect(resolveResponsiveColumns(400)).toBe(DEFAULT_RESPONSIVE_COLUMNS.xs);
      expect(resolveResponsiveColumns(575)).toBe(DEFAULT_RESPONSIVE_COLUMNS.xs);

      // sm (576 <= width < 768)
      expect(resolveResponsiveColumns(576)).toBe(DEFAULT_RESPONSIVE_COLUMNS.sm);
      expect(resolveResponsiveColumns(700)).toBe(DEFAULT_RESPONSIVE_COLUMNS.sm);

      // md (768 <= width < 992)
      expect(resolveResponsiveColumns(768)).toBe(DEFAULT_RESPONSIVE_COLUMNS.md);
      expect(resolveResponsiveColumns(900)).toBe(DEFAULT_RESPONSIVE_COLUMNS.md);

      // lg (>= 992)
      expect(resolveResponsiveColumns(992)).toBe(DEFAULT_RESPONSIVE_COLUMNS.lg);
      expect(resolveResponsiveColumns(1400)).toBe(DEFAULT_RESPONSIVE_COLUMNS.lg);
    });

    it('支持自定义列数映射配置', () => {
      const customBreakpoints = { xs: 2, sm: 4, md: 8, lg: 16 };
      expect(resolveResponsiveColumns(400, customBreakpoints)).toBe(2);
      expect(resolveResponsiveColumns(600, customBreakpoints)).toBe(4);
      expect(resolveResponsiveColumns(800, customBreakpoints)).toBe(8);
      expect(resolveResponsiveColumns(1200, customBreakpoints)).toBe(16);
    });

    it('零或负宽度防御保底返回默认列数', () => {
      expect(resolveResponsiveColumns(0, undefined, 12)).toBe(12);
      expect(resolveResponsiveColumns(-100, undefined, 10)).toBe(10);
    });
  });

  describe('<AtengGridLayout> 响应式与辅助线集成', () => {
    it('开启 responsive 时正确挂载 ResizeObserver 并于卸载时安全销毁', () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          responsive: true,
        },
      });

      expect(resizeObserverCallback).not.toBeNull();

      wrapper.unmount();
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('容器尺寸变化时自动更新列数并触发 breakpointChange 事件', async () => {
      const onBreakpointChange = vi.fn();
      const wrapper = mount(AtengGridLayout, {
        props: {
          responsive: true,
          column: 12,
          onBreakpointChange,
        },
      });

      expect(resizeObserverCallback).not.toBeNull();

      // 模拟容器宽度突变到 600px (对应 sm: 2 列)
      resizeObserverCallback!([{ contentRect: { width: 600 } }]);
      await nextTick();

      const vm = wrapper.vm as unknown as { currentColumn: number };
      expect(vm.currentColumn).toBe(2);
      expect(onBreakpointChange).toHaveBeenCalledWith({ width: 600, column: 2 });

      // 模拟容器宽度再次突变到 400px (对应 xs: 1 列)
      resizeObserverCallback!([{ contentRect: { width: 400 } }]);
      await nextTick();

      expect(vm.currentColumn).toBe(1);
      expect(onBreakpointChange).toHaveBeenCalledWith({ width: 400, column: 1 });

      wrapper.unmount();
    });

    it('showGridLines 为 true 时渲染网格样式类，并正确计算 CSS 变量', async () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          showGridLines: true,
          column: 6,
          cellHeight: '100px',
        },
      });

      expect(wrapper.classes()).toContain('at-grid-layout--grid-lines');

      const styleAttr = wrapper.attributes('style');
      expect(styleAttr).toContain('--at-grid-columns: 6');
      expect(styleAttr).toContain('--at-grid-cell-height: 100px');

      // 动态关闭参考线
      await wrapper.setProps({ showGridLines: false });
      expect(wrapper.classes()).not.toContain('at-grid-layout--grid-lines');

      wrapper.unmount();
    });

    it('cellHeight 热更新时同步底层实例并刷新 CSS 变量', async () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          cellHeight: 80,
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { cellHeight: ReturnType<typeof vi.fn> };
        setCellHeight: (h: number | string) => void;
      };

      const cellHeightSpy = vi.spyOn(vm.grid, 'cellHeight');

      await wrapper.setProps({ cellHeight: '120px' });
      await nextTick();

      expect(cellHeightSpy).toHaveBeenCalledWith('120px');
      expect(wrapper.attributes('style')).toContain('--at-grid-cell-height: 120px');

      // 编程式方法调用测试
      vm.setCellHeight(95);
      await nextTick();
      expect(cellHeightSpy).toHaveBeenCalledWith(95);

      wrapper.unmount();
    });

    it('setColumn 编程式方法能够动态更新栅格列数与样式变量', async () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          column: 12,
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { column: ReturnType<typeof vi.fn> };
        currentColumn: number;
        setColumn: (col: number) => void;
      };

      const columnSpy = vi.spyOn(vm.grid, 'column');

      vm.setColumn(8);
      await nextTick();

      expect(vm.currentColumn).toBe(8);
      expect(columnSpy).toHaveBeenCalledWith(8);
      expect(wrapper.attributes('style')).toContain('--at-grid-columns: 8');

      wrapper.unmount();
    });
  });
});

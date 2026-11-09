/**
 * @atengk/grid-layout-vue 外部物料库拖拽、自动寻空与拖拽手柄隔离测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  AtengGridLayout,
  AtengGridPaletteItem,
  vGridDragIn,
  findFirstAvailableSlot,
  useGridLayout,
} from '../src';
import type { GridLayoutItem } from '../src';

describe('Palette Drag-In, AutoPosition & Handle Isolation', () => {
  describe('findFirstAvailableSlot 算法', () => {
    it('空布局默认返回原点 (0, 0)', () => {
      const slot = findFirstAvailableSlot([], 4, 2, 12);
      expect(slot).toEqual({ x: 0, y: 0 });
    });

    it('已有半屏卡片时优先并入同一行剩余空间', () => {
      const layout: GridLayoutItem[] = [{ id: 1, x: 0, y: 0, w: 6, h: 3 }];
      // 插入 6x3 卡片，应该直接放到同一行 x: 6, y: 0
      const slot = findFirstAvailableSlot(layout, 6, 3, 12);
      expect(slot).toEqual({ x: 6, y: 0 });
    });

    it('当前行空间不足时自动换行至下一行空位', () => {
      const layout: GridLayoutItem[] = [{ id: 1, x: 0, y: 0, w: 8, h: 2 }];
      // 第一行仅剩 4 列，试图插入 6x2 卡片，必须换行到 y: 2
      const slot = findFirstAvailableSlot(layout, 6, 2, 12);
      expect(slot).toEqual({ x: 0, y: 2 });
    });

    it('优先填补中间空隙 (Gap Filling)', () => {
      const layout: GridLayoutItem[] = [
        { id: 1, x: 0, y: 0, w: 4, h: 2 },
        { id: 2, x: 8, y: 0, w: 4, h: 2 },
      ];
      // 中间 x: 4..7 为 4 列空槽，插入 4x2 卡片应该直接填补
      const slot = findFirstAvailableSlot(layout, 4, 2, 12);
      expect(slot).toEqual({ x: 4, y: 0 });
    });

    it('超过总列宽时自动截断安全保护', () => {
      const slot = findFirstAvailableSlot([], 20, 2, 12);
      expect(slot).toEqual({ x: 0, y: 0 });
    });
  });

  describe('useGridLayout.addItem 自动寻空集成', () => {
    it('添加缺少 x, y 坐标的卡片时自动计算并填充有效坐标', () => {
      const controller = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 6, h: 2 }],
        column: 12,
      });

      controller.addItem({
        id: 'card-2',
        w: 6,
        h: 2,
      });

      expect(controller.layout.value).toHaveLength(2);
      expect(controller.layout.value[1].x).toBe(6);
      expect(controller.layout.value[1].y).toBe(0);
    });

    it('添加声明 autoPosition: true 的卡片时完成寻空并重置标记', () => {
      const controller = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 12, h: 3 }],
        column: 12,
      });

      controller.addItem({
        id: 'card-auto',
        w: 4,
        h: 2,
        autoPosition: true,
      });

      expect(controller.layout.value[1].x).toBe(0);
      expect(controller.layout.value[1].y).toBe(3);
      expect(controller.layout.value[1].autoPosition).toBe(false);
    });
  });

  describe('<AtengGridPaletteItem> 组件', () => {
    it('正确渲染物料图元 DOM 属性与数据载荷序列化', () => {
      const wrapper = mount(AtengGridPaletteItem, {
        props: {
          item: {
            w: 4,
            h: 3,
            minW: 2,
            minH: 2,
            data: { title: '测试物料', type: 'chart' },
          },
        },
        slots: {
          default: '<span class="palette-slot-content">图元标题</span>',
        },
      });

      expect(wrapper.classes()).toContain('grid-stack-item');
      expect(wrapper.classes()).toContain('at-grid-palette-item');
      expect(wrapper.attributes('gs-w')).toBe('4');
      expect(wrapper.attributes('gs-h')).toBe('3');
      expect(wrapper.attributes('gs-min-w')).toBe('2');
      expect(wrapper.attributes('gs-min-h')).toBe('2');

      const payload = wrapper.attributes('data-payload');
      expect(payload).toBeDefined();
      expect(JSON.parse(payload!)).toEqual({ title: '测试物料', type: 'chart' });
      expect(wrapper.find('.palette-slot-content').text()).toBe('图元标题');
    });
  });

  describe('vGridDragIn 指令', () => {
    it('为目标元素附加 GridStack 拖拽所需属性与样式类', () => {
      const Component = {
        template: '<div v-grid-drag-in="itemOptions">自定义拖拽物料</div>',
        directives: {
          gridDragIn: vGridDragIn,
        },
        data() {
          return {
            itemOptions: {
              w: 3,
              h: 2,
              minW: 1,
              data: { name: '指令图元' },
            },
          };
        },
      };

      const wrapper = mount(Component);
      const el = wrapper.element;

      expect(el.classList.contains('grid-stack-item')).toBe(true);
      expect(el.classList.contains('at-grid-drag-in-source')).toBe(true);
      expect(el.getAttribute('data-drag-in')).toBe('true');
      expect(el.getAttribute('gs-w')).toBe('3');
      expect(el.getAttribute('gs-h')).toBe('2');
      expect(el.getAttribute('gs-min-w')).toBe('1');

      const payload = el.getAttribute('data-payload');
      expect(payload).toBeDefined();
      expect(JSON.parse(payload!)).toEqual({ name: '指令图元' });
    });
  });

  describe('<AtengGridLayout> 拖拽手柄安全防线与物料拖入', () => {
    it('默认配置下约束手柄选择器，保护内容区域', () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          handle: '.at-grid-drag-handle',
          draggableEntireItem: false,
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { opts: { handle?: string } };
      };

      expect(vm.grid.opts.handle).toBe('.at-grid-drag-handle');
      wrapper.unmount();
    });

    it('开启 draggableEntireItem 时释放整张卡片拖拽', () => {
      const wrapper = mount(AtengGridLayout, {
        props: {
          draggableEntireItem: true,
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { opts: { handle?: string } };
      };

      expect(vm.grid.opts.handle).toBe('.grid-stack-item-content');
      wrapper.unmount();
    });

    it('网格响应 dropped 事件时正确解析数据载荷并触发 update:layout 与 dropItem', async () => {
      const onDropItem = vi.fn();
      const onUpdateLayout = vi.fn();

      const wrapper = mount(AtengGridLayout, {
        props: {
          layout: [],
          onDropItem,
          'onUpdate:layout': onUpdateLayout,
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: {
          removeWidget: ReturnType<typeof vi.fn>;
          _gsEventHandler?: Record<string, (...args: unknown[]) => void>;
        };
      };

      // 模拟 dropped 事件触发
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-payload', JSON.stringify({ widgetType: 'gauge' }));

      const removeWidgetSpy = vi.spyOn(vm.grid, 'removeWidget');

      // 从 gridstack 实例中的 _gsEventHandler 触发 dropped 事件监听器
      const droppedHandler = vm.grid._gsEventHandler?.['dropped'];
      expect(droppedHandler).toBeDefined();

      droppedHandler!(new Event('dropped'), null, {
        id: 'dropped-widget-1',
        x: 4,
        y: 2,
        w: 4,
        h: 3,
        el: mockElement,
      });

      await nextTick();

      expect(removeWidgetSpy).toHaveBeenCalledWith(mockElement, true, false);
      expect(onDropItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dropped-widget-1',
          x: 4,
          y: 2,
          w: 4,
          h: 3,
          data: { widgetType: 'gauge' },
        }),
      );
      expect(onUpdateLayout).toHaveBeenCalled();

      wrapper.unmount();
    });
  });
});

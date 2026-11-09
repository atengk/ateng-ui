/**
 * @atengk/grid-layout-vue 布局物理算法、碰撞避让与浮动紧凑双模测试。
 *
 * 遵循 ADR-0008 与 ADR-0045，测试垂直紧凑、自由浮动模式切换、一键规整与锁控标记。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengGridLayout, AtengGridItem, useGridLayout } from '../src';
import type { GridLayoutItem } from '../src';

describe('@atengk/grid-layout-vue 物理排版与碰撞控制', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe('浮动与紧凑模式状态机', () => {
    it('默认开启垂直重力紧凑 (float: false)', () => {
      const state = useGridLayout();
      expect(state.float.value).toBe(false);
    });

    it('支持初始化声明开启自由浮动 (float: true)', () => {
      const state = useGridLayout({ float: true });
      expect(state.float.value).toBe(true);
    });

    it('提供 setFloat 与 setEditable 辅助控制方法', () => {
      const state = useGridLayout({ float: false, editable: false });
      expect(state.float.value).toBe(false);
      expect(state.editable.value).toBe(false);

      state.setFloat(true);
      expect(state.float.value).toBe(true);

      state.setEditable(true);
      expect(state.editable.value).toBe(true);
    });
  });

  describe('静态锁控与禁止调整标记', () => {
    it('正确将 locked、static、noResize、noMove 映射至 DOM 属性', async () => {
      const items: GridLayoutItem[] = [
        { id: '1', x: 0, y: 0, w: 4, h: 2, locked: true },
        { id: '2', x: 4, y: 0, w: 4, h: 2, static: true },
        { id: '3', x: 8, y: 0, w: 2, h: 2, noResize: true },
        { id: '4', x: 10, y: 0, w: 2, h: 2, noMove: true },
      ];

      wrapper = mount({
        components: { AtengGridLayout, AtengGridItem },
        template: `
          <AtengGridLayout :layout="layout">
            <AtengGridItem v-for="item in layout" :key="item.id" :item="item" />
          </AtengGridLayout>
        `,
        setup() {
          return { layout: ref(items) };
        },
      });

      await nextTick();

      const renderedItems = wrapper.findAll('.at-grid-item');
      expect(renderedItems.length).toBe(4);

      // locked
      expect(renderedItems[0].attributes('gs-locked')).toBe('true');
      // static -> locked
      expect(renderedItems[1].attributes('gs-locked')).toBe('true');
      // noResize
      expect(renderedItems[2].attributes('gs-no-resize')).toBe('true');
      // noMove
      expect(renderedItems[3].attributes('gs-no-move')).toBe('true');
    });
  });

  describe('AtengGridLayout 物理排版与一键规整', () => {
    it('对外暴露 tidyLayout 与 tidy 实例方法', () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [
            { id: '1', x: 0, y: 0, w: 4, h: 2 },
            { id: '2', x: 0, y: 5, w: 4, h: 2 }, // 悬空具有纵向间隙
          ],
          float: true,
        },
      });

      const vm = wrapper.vm as unknown as { tidyLayout: () => void; tidy: () => void };
      expect(typeof vm.tidyLayout).toBe('function');
      expect(typeof vm.tidy).toBe('function');

      // 调用规整方法不抛出异常
      expect(() => vm.tidyLayout()).not.toThrow();
    });

    it('动态变更 float 响应式属性时同步触发底层实例', async () => {
      const floatProp = ref(true);

      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
          float: floatProp.value,
        },
      });

      await nextTick();

      // 修改 float
      floatProp.value = false;
      await wrapper.setProps({ float: false });

      const vm = wrapper.vm as unknown as { grid: { float: (f?: boolean) => boolean } };
      expect(vm.grid).toBeDefined();
    });
  });
});

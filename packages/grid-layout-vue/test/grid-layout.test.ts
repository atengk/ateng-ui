/**
 * @atengk/grid-layout-vue 核心网格布局单元测试。
 *
 * 遵循 ADR-0008 与 ADR-0045，测试外部公共行为契约、空数组安全与生命周期清理。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengGridLayout, AtengGridItem, useGridLayout } from '../src';
import type { GridLayoutItem } from '../src';

describe('@atengk/grid-layout-vue 基础网格契约', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe('useGridLayout 无头状态机', () => {
    it('在缺省初始布局时，统一安全保底为空数组 []', () => {
      const state = useGridLayout();
      expect(Array.isArray(state.layout.value)).toBe(true);
      expect(state.layout.value).toEqual([]);
    });

    it('正确增删改布局项数据', () => {
      const state = useGridLayout({
        initialLayout: [{ id: '1', x: 0, y: 0, w: 2, h: 2 }],
      });

      expect(state.layout.value.length).toBe(1);

      // 添加新项
      state.addItem({ id: '2', x: 2, y: 0, w: 4, h: 2 });
      expect(state.layout.value.length).toBe(2);

      // 重复添加同 ID 项被拦截
      state.addItem({ id: '2', x: 6, y: 0, w: 2, h: 2 });
      expect(state.layout.value.length).toBe(2);

      // 更新项
      state.updateItem('2', { w: 6 });
      const item2 = state.layout.value.find(i => i.id === '2');
      expect(item2?.w).toBe(6);

      // 移除项
      state.removeItem('1');
      expect(state.layout.value.length).toBe(1);
      expect(state.layout.value[0].id).toBe('2');
    });

    it('批量重设布局 setLayout 具备空安全防御', () => {
      const state = useGridLayout();
      state.setLayout([
        { id: 'a', x: 0, y: 0, w: 3, h: 3 },
        { id: 'b', x: 3, y: 0, w: 3, h: 3 },
      ]);
      expect(state.layout.value.length).toBe(2);

      // 传入非数组时保底置空
      // @ts-expect-error 故意传入非法数据测试防御
      state.setLayout(null);
      expect(state.layout.value).toEqual([]);
    });
  });

  describe('AtengGridLayout 与 AtengGridItem 组件渲染', () => {
    it('空数据下正常挂载并渲染网格容器，不抛出异常', () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [],
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.classes()).toContain('grid-stack');
      expect(wrapper.classes()).toContain('at-grid-layout');
    });

    it('正确渲染子级 AtengGridItem 并设置 gs-* 属性', async () => {
      const layoutData: GridLayoutItem[] = [
        { id: 'card-1', x: 0, y: 0, w: 4, h: 2, locked: true },
        { id: 'card-2', x: 4, y: 0, w: 8, h: 4 },
      ];

      wrapper = mount({
        components: { AtengGridLayout, AtengGridItem },
        template: `
          <AtengGridLayout :layout="layout">
            <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
              <template #default="{ item: current }">
                <div class="card-content">Card {{ current.id }}</div>
              </template>
            </AtengGridItem>
          </AtengGridLayout>
        `,
        setup() {
          return { layout: ref(layoutData) };
        },
      });

      await nextTick();

      const items = wrapper.findAll('.at-grid-item');
      expect(items.length).toBe(2);

      // 验证第一个锁定项的属性
      const firstItem = items[0];
      expect(firstItem.attributes('gs-id')).toBe('card-1');
      expect(firstItem.attributes('gs-w')).toBe('4');
      expect(firstItem.attributes('gs-h')).toBe('2');
      expect(firstItem.attributes('gs-locked')).toBe('true');

      // 验证内容插槽渲染
      expect(wrapper.text()).toContain('Card card-1');
      expect(wrapper.text()).toContain('Card card-2');
    });

    it('卸载组件时调用 destroy(false) 确定性释放资源且不报错', () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: 'item-1', x: 0, y: 0, w: 2, h: 2 }],
        },
      });

      expect(() => {
        wrapper?.unmount();
        wrapper = null;
      }).not.toThrow();
    });
  });
});

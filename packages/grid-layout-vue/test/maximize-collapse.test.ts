/**
 * @atengk/grid-layout-vue 单卡片全视口聚焦与手风琴高度折叠测试。
 *
 * 遵循 ADR-0008 与 ADR-0045，验证：
 * 1. 单卡片聚焦最大化与无损还原快照状态机 (maximize / restore / toggleMaximize)；
 * 2. 手风琴高度折叠与展开状态机 (collapse / expand / toggleCollapse)；
 * 3. <AtengGridItem> 插槽参数与 useGridItem() 上下文状态透出；
 * 4. 边界防御与销毁清理。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { AtengGridLayout, AtengGridItem, useGridLayout, useGridItem } from '../src';
import type { GridItemContext, GridLayoutItem } from '../src';

describe('CardMaximize & CardCollapse (工单 #309)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    globalThis.ResizeObserver = class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe('useGridLayout 无头状态机纯逻辑层', () => {
    it('初始化时具有空状态与判定函数', () => {
      const state = useGridLayout({
        initialLayout: [
          { id: 'card-1', x: 0, y: 0, w: 4, h: 3 },
          { id: 'card-2', x: 4, y: 0, w: 8, h: 3 },
        ],
      });

      expect(state.maximizedId.value).toBeNull();
      expect(state.collapsedIds.value.size).toBe(0);
      expect(state.isMaximized('card-1')).toBe(false);
      expect(state.isCollapsed('card-1')).toBe(false);
    });

    it('maximize(id) 正确保存原始几何快照并将卡片提升至全网格宽度与扩展高度', () => {
      const state = useGridLayout({
        column: 12,
        initialLayout: [
          { id: 'card-1', x: 2, y: 1, w: 4, h: 3 },
          { id: 'card-2', x: 6, y: 1, w: 6, h: 3 },
        ],
      });

      state.maximize('card-1');

      expect(state.maximizedId.value).toBe('card-1');
      expect(state.isMaximized('card-1')).toBe(true);

      const target = state.layout.value.find(item => item.id === 'card-1');
      expect(target).toBeDefined();
      expect(target!.x).toBe(0);
      expect(target!.y).toBe(0);
      expect(target!.w).toBe(12);
      expect(target!.h).toBeGreaterThanOrEqual(6);
    });

    it('restore(id) 能够 100% 无损还原原始坐标与尺寸快照', () => {
      const state = useGridLayout({
        column: 12,
        initialLayout: [{ id: 'card-1', x: 2, y: 3, w: 4, h: 3 }],
      });

      state.maximize('card-1');
      expect(state.isMaximized('card-1')).toBe(true);

      state.restore('card-1');
      expect(state.maximizedId.value).toBeNull();
      expect(state.isMaximized('card-1')).toBe(false);

      const target = state.layout.value.find(item => item.id === 'card-1');
      expect(target!.x).toBe(2);
      expect(target!.y).toBe(3);
      expect(target!.w).toBe(4);
      expect(target!.h).toBe(3);
    });

    it('toggleMaximize(id) 支持在最大化与还原之间往返切换', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2 }],
      });

      state.toggleMaximize('card-1');
      expect(state.isMaximized('card-1')).toBe(true);

      state.toggleMaximize('card-1');
      expect(state.isMaximized('card-1')).toBe(false);
    });

    it('最大化新卡片时自动先行还原先前最大化的卡片', () => {
      const state = useGridLayout({
        initialLayout: [
          { id: 'card-1', x: 0, y: 0, w: 4, h: 3 },
          { id: 'card-2', x: 4, y: 0, w: 4, h: 2 },
        ],
      });

      state.maximize('card-1');
      expect(state.maximizedId.value).toBe('card-1');

      state.maximize('card-2');
      expect(state.maximizedId.value).toBe('card-2');
      expect(state.isMaximized('card-1')).toBe(false);

      const card1 = state.layout.value.find(item => item.id === 'card-1');
      expect(card1!.x).toBe(0);
      expect(card1!.w).toBe(4);
      expect(card1!.h).toBe(3);
    });

    it('collapse(id) 将高度收缩为 1 并锁定 noResize: true，expand(id) 还原', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 6, h: 4, noResize: false }],
      });

      // 1. 折叠
      state.collapse('card-1');
      expect(state.isCollapsed('card-1')).toBe(true);

      let card = state.layout.value.find(item => item.id === 'card-1');
      expect(card!.h).toBe(1);
      expect(card!.noResize).toBe(true);

      // 2. 展开
      state.expand('card-1');
      expect(state.isCollapsed('card-1')).toBe(false);

      card = state.layout.value.find(item => item.id === 'card-1');
      expect(card!.h).toBe(4);
      expect(card!.noResize).toBe(false);
    });

    it('toggleCollapse(id) 支持往返切换手风琴折叠状态', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 6, h: 5 }],
      });

      state.toggleCollapse('card-1');
      expect(state.isCollapsed('card-1')).toBe(true);
      expect(state.layout.value[0].h).toBe(1);

      state.toggleCollapse('card-1');
      expect(state.isCollapsed('card-1')).toBe(false);
      expect(state.layout.value[0].h).toBe(5);
    });

    it('removeItem 触发时自动清理对应的最大化与折叠快照', () => {
      const state = useGridLayout({
        initialLayout: [
          { id: 'card-1', x: 0, y: 0, w: 4, h: 2 },
          { id: 'card-2', x: 4, y: 0, w: 4, h: 2 },
        ],
      });

      state.maximize('card-1');
      state.collapse('card-2');
      expect(state.maximizedId.value).toBe('card-1');
      expect(state.isCollapsed('card-2')).toBe(true);

      state.removeItem('card-1');
      expect(state.maximizedId.value).toBeNull();

      state.removeItem('card-2');
      expect(state.isCollapsed('card-2')).toBe(false);
    });
  });

  describe('组件插槽与 GridItemContext 消费端集成', () => {
    it('<AtengGridItem> 默认插槽正确透出 isMaximized, isCollapsed, toggleMaximize, toggleCollapse', async () => {
      const layoutData = ref<GridLayoutItem[]>([{ id: 'card-1', x: 0, y: 0, w: 6, h: 4 }]);

      wrapper = mount({
        components: { AtengGridLayout, AtengGridItem },
        template: `
          <AtengGridLayout v-model:layout="layout">
            <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
              <template #default="slotProps">
                <div class="card-inner">
                  <span class="max-status">{{ String(slotProps.isMaximized) }}</span>
                  <span class="col-status">{{ String(slotProps.isCollapsed) }}</span>
                  <button class="btn-max" @click="slotProps.toggleMaximize">Max</button>
                  <button class="btn-col" @click="slotProps.toggleCollapse">Col</button>
                </div>
              </template>
            </AtengGridItem>
          </AtengGridLayout>
        `,
        setup() {
          return { layout: layoutData };
        },
      });

      await nextTick();

      const itemEl = wrapper.find('.at-grid-item');
      expect(itemEl.exists()).toBe(true);
      expect(wrapper.find('.max-status').text()).toBe('false');
      expect(wrapper.find('.col-status').text()).toBe('false');

      // 触发最大化
      await wrapper.find('.btn-max').trigger('click');
      await nextTick();

      expect(wrapper.find('.max-status').text()).toBe('true');
      expect(itemEl.classes()).toContain('at-grid-item--maximized');

      // 还原
      await wrapper.find('.btn-max').trigger('click');
      await nextTick();
      expect(wrapper.find('.max-status').text()).toBe('false');
      expect(itemEl.classes()).not.toContain('at-grid-item--maximized');

      // 触发折叠
      await wrapper.find('.btn-col').trigger('click');
      await nextTick();
      expect(wrapper.find('.col-status').text()).toBe('true');
      expect(itemEl.classes()).toContain('at-grid-item--collapsed');

      // 展开
      await wrapper.find('.btn-col').trigger('click');
      await nextTick();
      expect(wrapper.find('.col-status').text()).toBe('false');
      expect(itemEl.classes()).not.toContain('at-grid-item--collapsed');
    });

    it('useGridItem() 依赖注入能够消费 isMaximized 与 isCollapsed 并保持响应式', async () => {
      let capturedContext: GridItemContext | null = null;

      const ConsumerComponent = defineComponent({
        setup() {
          capturedContext = useGridItem();
          return () =>
            h('div', [
              h('span', { class: 'ctx-max' }, String(capturedContext?.isMaximized.value)),
              h('span', { class: 'ctx-col' }, String(capturedContext?.isCollapsed.value)),
            ]);
        },
      });

      const layoutData = ref<GridLayoutItem[]>([{ id: 'card-sub', x: 0, y: 0, w: 4, h: 3 }]);

      wrapper = mount({
        components: { AtengGridLayout, AtengGridItem, ConsumerComponent },
        template: `
          <AtengGridLayout ref="gridRef" v-model:layout="layout">
            <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
              <ConsumerComponent />
            </AtengGridItem>
          </AtengGridLayout>
        `,
        setup() {
          const gridRef = ref<InstanceType<typeof AtengGridLayout> | null>(null);
          return { layout: layoutData, gridRef };
        },
      });

      await nextTick();

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.isMaximized.value).toBe(false);
      expect(capturedContext!.isCollapsed.value).toBe(false);

      capturedContext!.toggleMaximize();
      await nextTick();
      expect(capturedContext!.isMaximized.value).toBe(true);

      capturedContext!.toggleMaximize();
      await nextTick();
      expect(capturedContext!.isMaximized.value).toBe(false);

      capturedContext!.toggleCollapse();
      await nextTick();
      expect(capturedContext!.isCollapsed.value).toBe(true);
    });
  });
});

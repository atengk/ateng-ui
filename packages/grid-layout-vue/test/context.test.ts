/**
 * @atengk/grid-layout-vue 尺寸感知依赖注入总线与引擎协同单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { AtengGridLayout, AtengGridItem, useGridItem } from '../src';
import type { GridItemContext } from '../src';

describe('GridItemContext & Dimension Bus', () => {
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
    vi.restoreAllMocks();
  });

  describe('useGridItem() 消费端', () => {
    it('在网格项外部调用时安全兜底返回 null', () => {
      let capturedContext: unknown = undefined;
      const TestComponent = defineComponent({
        setup() {
          capturedContext = useGridItem();
          return () => h('div', '外部独立组件');
        },
      });

      mount(TestComponent);
      expect(capturedContext).toBeNull();
    });

    it('在 <AtengGridItem> 内部调用时注入完整上下文并保持响应性', async () => {
      let capturedContext: GridItemContext | null = null;

      const ConsumerComponent = defineComponent({
        setup() {
          capturedContext = useGridItem();
          return () => h('div', { class: 'consumer' }, `W:${capturedContext?.pixelWidth.value}`);
        },
      });

      const wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2, locked: true }],
        },
        slots: {
          default: () =>
            h(
              AtengGridItem,
              { item: { id: 'card-1', x: 0, y: 0, w: 4, h: 2, locked: true } },
              { default: () => h(ConsumerComponent) },
            ),
        },
      });

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.item.value.id).toBe('card-1');
      expect(capturedContext!.isLocked.value).toBe(true);
      expect(capturedContext!.isDragging.value).toBe(false);
      expect(capturedContext!.isResizing.value).toBe(false);
      expect(typeof capturedContext!.onResize).toBe('function');

      wrapper.unmount();
    });
  });

  describe('尺寸感知与 onResize 广播总线', () => {
    it('ResizeObserver 驱动 pixelWidth 与 pixelHeight 更新并广播回调', async () => {
      let capturedContext: GridItemContext | null = null;
      const resizeSpy = vi.fn();

      const ConsumerComponent = defineComponent({
        setup() {
          capturedContext = useGridItem();
          if (capturedContext?.onResize) {
            capturedContext.onResize(resizeSpy);
          }
          return () => h('div', '下游图表消费者');
        },
      });

      const wrapper = mount(AtengGridLayout, {
        slots: {
          default: () =>
            h(
              AtengGridItem,
              { item: { id: 'card-test', x: 0, y: 0, w: 6, h: 3 } },
              { default: () => h(ConsumerComponent) },
            ),
        },
      });

      expect(resizeObserverCallback).not.toBeNull();

      // 模拟尺寸发生变动 (宽度 450px，高度 240px)
      resizeObserverCallback!([{ contentRect: { width: 450, height: 240 } }]);
      await nextTick();

      expect(capturedContext!.pixelWidth.value).toBe(450);
      expect(capturedContext!.pixelHeight.value).toBe(240);
      expect(resizeSpy).toHaveBeenCalledWith({ width: 450, height: 240 });

      wrapper.unmount();
    });

    it('onResize 返回注销函数，注销后停止后续广播', async () => {
      let unsubscribe: (() => void) | null = null;
      const callbackSpy = vi.fn();

      const ConsumerComponent = defineComponent({
        setup() {
          const ctx = useGridItem();
          if (ctx?.onResize) {
            unsubscribe = ctx.onResize(callbackSpy);
          }
          return () => h('div', '消费者');
        },
      });

      const wrapper = mount(AtengGridLayout, {
        slots: {
          default: () =>
            h(
              AtengGridItem,
              { item: { id: 'card-unsub', x: 0, y: 0, w: 4, h: 2 } },
              { default: () => h(ConsumerComponent) },
            ),
        },
      });

      resizeObserverCallback!([{ contentRect: { width: 300, height: 200 } }]);
      await nextTick();
      expect(callbackSpy).toHaveBeenCalledTimes(1);

      // 执行注销
      expect(unsubscribe).not.toBeNull();
      unsubscribe!();

      // 再次触发尺寸变动
      resizeObserverCallback!([{ contentRect: { width: 500, height: 350 } }]);
      await nextTick();

      // 调用次数应当依然为 1
      expect(callbackSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });
  });

  describe('活跃态 isDragging 与 isResizing 联动', () => {
    it('当网格触发 dragstart/dragstop 时精准更新目标卡片 isDragging 状态', async () => {
      let ctx1: GridItemContext | null = null;
      let ctx2: GridItemContext | null = null;

      const Consumer1 = defineComponent({
        setup() {
          ctx1 = useGridItem();
          return () => h('div', '卡片1');
        },
      });

      const Consumer2 = defineComponent({
        setup() {
          ctx2 = useGridItem();
          return () => h('div', '卡片2');
        },
      });

      const wrapper = mount(AtengGridLayout, {
        slots: {
          default: () => [
            h(
              AtengGridItem,
              { item: { id: 'c1', x: 0, y: 0, w: 4, h: 2 } },
              { default: () => h(Consumer1) },
            ),
            h(
              AtengGridItem,
              { item: { id: 'c2', x: 4, y: 0, w: 4, h: 2 } },
              { default: () => h(Consumer2) },
            ),
          ],
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { _gsEventHandler?: Record<string, (...args: unknown[]) => void> };
      };

      const dragstartHandler = vm.grid._gsEventHandler?.['dragstart'];
      const dragstopHandler = vm.grid._gsEventHandler?.['dragstop'];

      expect(dragstartHandler).toBeDefined();

      // 模拟卡片 c1 开始拖拽
      const c1Element = document.createElement('div');
      c1Element.setAttribute('gs-id', 'c1');

      dragstartHandler!(new Event('dragstart'), c1Element);
      await nextTick();

      expect(ctx1!.isDragging.value).toBe(true);
      expect(ctx2!.isDragging.value).toBe(false);

      // 模拟卡片 c1 拖拽结束
      dragstopHandler!(new Event('dragstop'), c1Element);
      await nextTick();

      expect(ctx1!.isDragging.value).toBe(false);
      expect(ctx2!.isDragging.value).toBe(false);

      wrapper.unmount();
    });

    it('当网格触发 resizestart/resizestop 时精准更新目标卡片 isResizing 状态', async () => {
      let ctx: GridItemContext | null = null;

      const Consumer = defineComponent({
        setup() {
          ctx = useGridItem();
          return () => h('div', '缩放测试');
        },
      });

      const wrapper = mount(AtengGridLayout, {
        slots: {
          default: () =>
            h(
              AtengGridItem,
              { item: { id: 'resize-card', x: 0, y: 0, w: 6, h: 3 } },
              { default: () => h(Consumer) },
            ),
        },
      });

      const vm = wrapper.vm as unknown as {
        grid: { _gsEventHandler?: Record<string, (...args: unknown[]) => void> };
      };

      const resizestartHandler = vm.grid._gsEventHandler?.['resizestart'];
      const resizestopHandler = vm.grid._gsEventHandler?.['resizestop'];

      const cardEl = document.createElement('div');
      cardEl.setAttribute('gs-id', 'resize-card');

      resizestartHandler!(new Event('resizestart'), cardEl);
      await nextTick();

      expect(ctx!.isResizing.value).toBe(true);

      resizestopHandler!(new Event('resizestop'), cardEl);
      await nextTick();

      expect(ctx!.isResizing.value).toBe(false);

      wrapper.unmount();
    });
  });
});

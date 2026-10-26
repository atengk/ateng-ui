/**
 * @atengk/video-player-vue 多路分屏协同矩阵单元测试：
 * 1. 布局模式与容量推导 (1/4/9/16 对称宫格及 1+5/1+7 广播级主从分屏)
 * 2. 聚焦选路与激活高亮边框 (Channel Selection & Active Border)
 * 3. 双击独占放大全屏与 ESC 键平滑恢复 (Maximize & Restore)
 * 4. 主次码流动态自适应切换 (Main-Stream vs Sub-Stream)
 * 5. 多路音频互斥不变量 (Audio Exclusive Invariant)
 * 6. 自动轮巡调度器 (Touring Scheduler)
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengVideoGrid } from '../src/components';
import { getLayoutCapacity, useVideoGrid } from '../src/composables';
import type { VideoGridChannel } from '../src/types';

describe('工单 #146 多路分屏协同矩阵测试套件', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  const mockChannels: VideoGridChannel[] = [
    {
      id: 'cam-1',
      title: '东门全景',
      url: 'https://example.com/stream-1-main.mp4',
      subUrl: 'https://example.com/stream-1-sub.mp4',
    },
    {
      id: 'cam-2',
      title: '西门车道',
      url: 'https://example.com/stream-2-main.mp4',
      subUrl: 'https://example.com/stream-2-sub.mp4',
    },
    {
      id: 'cam-3',
      title: '南区周界',
      url: 'https://example.com/stream-3-main.mp4',
      subUrl: 'https://example.com/stream-3-sub.mp4',
    },
    {
      id: 'cam-4',
      title: '北区大厅',
      url: 'https://example.com/stream-4-main.mp4',
      subUrl: 'https://example.com/stream-4-sub.mp4',
    },
    {
      id: 'cam-5',
      title: '地库入口',
      url: 'https://example.com/stream-5-main.mp4',
      subUrl: 'https://example.com/stream-5-sub.mp4',
    },
    {
      id: 'cam-6',
      title: '机房走廊',
      url: 'https://example.com/stream-6-main.mp4',
      subUrl: 'https://example.com/stream-6-sub.mp4',
    },
  ];

  beforeEach(() => {
    // 1. 模拟 HTMLMediaElement 在 happy-dom 下的能力
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // 2. 拦截 happy-dom 针对 src 赋值时错误同步触发 canplay
    originalSrcDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      'src',
    );
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      set(val: string) {
        this.setAttribute('src', val);
        setTimeout(() => {
          this.dispatchEvent(new Event('canplay'));
        }, 0);
      },
      get() {
        return this.getAttribute('src') || '';
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalSrcDescriptor) {
      Object.defineProperty(window.HTMLMediaElement.prototype, 'src', originalSrcDescriptor);
    }
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('1. 布局容量推导与网格结构渲染', () => {
    it('getLayoutCapacity 应准确计算各布局容量', () => {
      expect(getLayoutCapacity('1x1')).toBe(1);
      expect(getLayoutCapacity('2x2')).toBe(4);
      expect(getLayoutCapacity('3x3')).toBe(9);
      expect(getLayoutCapacity('4x4')).toBe(16);
      expect(getLayoutCapacity('1+5')).toBe(6);
      expect(getLayoutCapacity('1+7')).toBe(8);
    });

    it('AtengVideoGrid 应正确根据 layout 挂载对应的网格样式类', async () => {
      wrapper = mount(AtengVideoGrid, {
        props: {
          channels: mockChannels,
          layout: '2x2',
        },
      });

      await nextTick();
      const grid = wrapper.find('.at-video-grid');
      expect(grid.classes()).toContain('at-video-grid--2x2');

      const cells = wrapper.findAll('[data-testid="at-video-grid-cell"]');
      expect(cells.length).toBe(4); // 2x2 展示前 4 路
    });

    it('1+5 广播级主从分屏布局应给第 1 路赋予大屏样式类', async () => {
      wrapper = mount(AtengVideoGrid, {
        props: {
          channels: mockChannels,
          layout: '1+5',
        },
      });

      await nextTick();
      const grid = wrapper.find('.at-video-grid');
      expect(grid.classes()).toContain('at-video-grid--1-5');

      const cells = wrapper.findAll('[data-testid="at-video-grid-cell"]');
      expect(cells.length).toBe(6);
      expect(cells[0].classes()).toContain('at-video-grid__cell--master-1-5');
    });
  });

  describe('2. 选路聚焦与高亮边框交互', () => {
    it('点击通道单元格应聚焦激活并派发 channel-select 事件', async () => {
      wrapper = mount(AtengVideoGrid, {
        props: {
          channels: mockChannels,
          layout: '2x2',
        },
      });

      await nextTick();
      const cells = wrapper.findAll('[data-testid="at-video-grid-cell"]');

      // 点击第 2 路
      await cells[1].trigger('click');

      expect(cells[1].classes()).toContain('at-video-grid__cell--active');
      expect(wrapper.emitted('channel-select')).toBeTruthy();
      expect(wrapper.emitted('channel-select')?.[0]?.[0]).toMatchObject({ id: 'cam-2' });
      expect(wrapper.emitted('channelSelect')).toBeTruthy();
    });
  });

  describe('3. 双击独占放大与 ESC 键恢复', () => {
    it('双击单元格平滑放大为单路，再双击或按 ESC 恢复', async () => {
      wrapper = mount(AtengVideoGrid, {
        props: {
          channels: mockChannels,
          layout: '2x2',
        },
        attachTo: document.body,
      });

      await nextTick();
      const cells = wrapper.findAll('[data-testid="at-video-grid-cell"]');

      // 1. 双击第 3 路独占放大
      await cells[2].trigger('dblclick');
      await nextTick();

      expect(wrapper.find('.at-video-grid').classes()).toContain('at-video-grid--maximized');
      const maximizedCells = wrapper.findAll('[data-testid="at-video-grid-cell"]');
      expect(maximizedCells.length).toBe(1);
      expect(wrapper.emitted('channel-maximize')).toBeTruthy();
      expect(wrapper.emitted('channel-maximize')?.[0]?.[0]).toMatchObject({ id: 'cam-3' });

      // 2. 按 ESC 键平滑恢复宫格
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();

      expect(wrapper.find('.at-video-grid').classes()).toContain('at-video-grid--2x2');
      expect(wrapper.findAll('[data-testid="at-video-grid-cell"]').length).toBe(4);
      expect(wrapper.emitted('channel-restore')).toBeTruthy();
    });
  });

  describe('4. 主次码流动态自适应切换与多路音频互斥', () => {
    it('宫格模式加载次码流 subUrl，独占放大秒切高清主流 url', async () => {
      const state = useVideoGrid({
        channels: mockChannels,
        layout: '2x2',
        autoSubStream: true,
      });

      // 1. 2x2 宫格模式：拉取低清 subUrl 节约带宽
      const items = state.displayedChannels.value;
      expect(items.length).toBe(4);
      expect(items[0].effectiveUrl).toBe('https://example.com/stream-1-sub.mp4');
      expect(items[1].effectiveUrl).toBe('https://example.com/stream-2-sub.mp4');

      // 2. 独占放大第 2 路：平滑切至高清主流 url
      state.toggleMaximize('cam-2');
      const maxItems = state.displayedChannels.value;
      expect(maxItems.length).toBe(1);
      expect(maxItems[0].id).toBe('cam-2');
      expect(maxItems[0].effectiveUrl).toBe('https://example.com/stream-2-main.mp4');

      // 3. 恢复宫格：自动切回 subUrl
      state.restoreGrid();
      expect(state.displayedChannels.value[1].effectiveUrl).toBe(
        'https://example.com/stream-2-sub.mp4',
      );
    });

    it('多路音频互斥不变量：仅当前聚焦激活的通道出声，其余强制静音', async () => {
      const state = useVideoGrid({
        channels: mockChannels,
        layout: '2x2',
        activeId: 'cam-1',
        audioExclusive: true,
      });

      // 当前激活 cam-1
      let items = state.displayedChannels.value;
      expect(items.find(c => c.id === 'cam-1')?.isMuted).toBe(false);
      expect(items.find(c => c.id === 'cam-2')?.isMuted).toBe(true);
      expect(items.find(c => c.id === 'cam-3')?.isMuted).toBe(true);

      // 切换聚焦到 cam-3
      state.selectChannel('cam-3');
      items = state.displayedChannels.value;
      expect(items.find(c => c.id === 'cam-1')?.isMuted).toBe(true); // 原激活路被强制静音
      expect(items.find(c => c.id === 'cam-3')?.isMuted).toBe(false); // 新路出声
    });
  });

  describe('5. 自动轮巡调度器 (Touring Scheduler)', () => {
    it('开启 startTour 应按步进定时切换通道页码', async () => {
      vi.useFakeTimers();

      const state = useVideoGrid({
        channels: mockChannels, // 共 6 路
        layout: '2x2', // 每页 4 路
      });

      expect(state.tourPageIndex.value).toBe(0);
      expect(state.displayedChannels.value[0].id).toBe('cam-1');

      // 启动 1000ms 轮巡
      state.startTour({ interval: 1000 });
      expect(state.isTouring.value).toBe(true);

      // 前进 1000ms
      vi.advanceTimersByTime(1000);
      expect(state.tourPageIndex.value).toBe(1);

      // 验证第 2 页展示后 2 路及循环补齐
      expect(state.displayedChannels.value[0].id).toBe('cam-5');

      // 停止轮巡
      state.stopTour();
      expect(state.isTouring.value).toBe(false);

      vi.useRealTimers();
    });
  });
});

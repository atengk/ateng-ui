/**
 * WhiteScreenPlugin 3×3 视口点阵白屏感知插件单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWhiteScreenPlugin,
  sampleViewport,
  matchesAnySelector,
} from '../src/plugins/whiteScreen';
import { MonitorKernel } from '../src/core/MonitorKernel';
import type { MonitorEvent, WhiteScreenPayload } from '../src/types/event';

describe('WhiteScreenPlugin', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();

    // 模拟标准视口尺寸
    window.innerWidth = 1200;
    window.innerHeight = 800;

    // 清理并设置基础根节点
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('matchesAnySelector', () => {
    it('能够准确匹配自身或祖先节点中的选择器', () => {
      const parent = document.createElement('div');
      parent.className = 'main-container';
      const child = document.createElement('span');
      child.className = 'title';
      parent.appendChild(child);
      container.appendChild(parent);

      expect(matchesAnySelector(parent, ['.main-container'])).toBe(true);
      expect(matchesAnySelector(child, ['.main-container'])).toBe(true);
      expect(matchesAnySelector(child, ['.non-existent'])).toBe(false);
    });
  });

  describe('sampleViewport 点阵采样算法', () => {
    it('采样点命中全部为 #app 根容器时判定怀疑白屏', () => {
      // 模拟 elementsFromPoint 均命中 #app 容器
      document.elementsFromPoint = vi
        .fn()
        .mockImplementation(() => [container, document.body, document.documentElement]);

      const result = sampleViewport();
      expect(result.points.length).toBe(9);
      expect(result.isSuspected).toBe(true);
      expect(result.viewport.width).toBe(1200);
      expect(result.viewport.height).toBe(800);

      // 验证 9 个采样点的坐标分布符合网格分割
      expect(result.points[0].x).toBe(200); // 1200 * (1/6)
      expect(result.points[0].y).toBe(133); // 800 * (1/6)
      expect(result.points[4].x).toBe(600); // 1200 * (1/2) 中心点
      expect(result.points[4].y).toBe(400); // 800 * (1/2) 中心点
    });

    it('当命中骨架屏或 Loading 遮罩白名单时判定为过渡态，决不判定白屏', () => {
      const skeletonEl = document.createElement('div');
      skeletonEl.className = 'at-skeleton loading-box';
      container.appendChild(skeletonEl);

      document.elementsFromPoint = vi
        .fn()
        .mockImplementation(() => [skeletonEl, container, document.body]);

      const result = sampleViewport();
      expect(result.isSuspected).toBe(false);
      expect(result.points.some(p => p.isWhitelisted)).toBe(true);
    });

    it('当命中常规业务内容 DOM 节点时不判定白屏', () => {
      const header = document.createElement('h1');
      header.className = 'user-welcome';
      header.textContent = 'Dashboard';
      container.appendChild(header);

      document.elementsFromPoint = vi
        .fn()
        .mockImplementation(() => [header, container, document.body]);

      const result = sampleViewport();
      expect(result.isSuspected).toBe(false);
      expect(result.points[0].isRoot).toBe(false);
    });
  });

  describe('插件两阶段复验与自动检测', () => {
    it('两阶段均判定为白屏时，应当派发致命白屏告警事件', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createWhiteScreenPlugin({
        initialDelay: 1000,
        recheckDelay: 500,
        autoCheckOnLoad: false, // 手动调用更易于精准时间测试
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      // 模拟整个页面处于完全空白的根节点状态
      document.elementsFromPoint = vi.fn().mockImplementation(() => [container, document.body]);

      const checkPromise = plugin.check();

      // 推进时间穿过 T2 (500ms)
      await vi.advanceTimersByTimeAsync(600);

      const isWhite = await checkPromise;
      expect(isWhite).toBe(true);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const event: MonitorEvent<WhiteScreenPayload> = reporterSpy.mock.calls[0][0][0];

      expect(event.type).toBe('white_screen');
      expect(event.level).toBe('fatal');
      expect(event.payload.name).toBe('WHITE_SCREEN_ERROR');
      expect(event.payload.isWhiteScreen).toBe(true);
      expect(event.payload.samplePoints.length).toBe(9);
      expect(event.payload.hitSelectors).toBeDefined();
      expect(event.payload.viewport.width).toBe(1200);

      await kernel.destroy();
    });

    it('两阶段复验自愈：初检怀疑白屏但在 T2 内异步组件完成渲染，应当自动消除假阳性误报', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createWhiteScreenPlugin({
        recheckDelay: 1000,
        autoCheckOnLoad: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      // 阶段 1：初检命中空根容器（怀疑白屏）
      let currentMockTarget: Element = container;
      document.elementsFromPoint = vi
        .fn()
        .mockImplementation(() => [currentMockTarget, document.body]);

      const checkPromise = plugin.check();

      // 阶段 1 和阶段 2 之间：模拟 Vue 路由异步组件完成加载并挂载了内容
      const card = document.createElement('div');
      card.className = 'business-card';
      container.appendChild(card);
      currentMockTarget = card;

      // 推进时间完成 T2 二次复验
      await vi.advanceTimersByTimeAsync(1100);

      const isWhite = await checkPromise;
      expect(isWhite).toBe(false);

      // 验证未误报任何事件
      expect(reporterSpy).not.toHaveBeenCalled();

      await kernel.destroy();
    });

    it('teardown 应当确定性清理所有定时器', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createWhiteScreenPlugin({
        initialDelay: 3000,
        recheckDelay: 1500,
        autoCheckOnLoad: true,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });

      document.elementsFromPoint = vi.fn().mockImplementation(() => [container]);

      // 模拟页面已加载完成
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        configurable: true,
      });

      kernel.init();

      // 在 T1 尚未到期前销毁内核
      await vi.advanceTimersByTimeAsync(1000);
      await kernel.destroy();

      // 推进时间到 5000ms
      await vi.advanceTimersByTimeAsync(4000);

      // 验证销毁后绝不触发告警
      expect(reporterSpy).not.toHaveBeenCalled();
    });

    it('连续并发调用 check 时应当取消前序未决轮次并防抖', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createWhiteScreenPlugin({
        recheckDelay: 1000,
        autoCheckOnLoad: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      document.elementsFromPoint = vi.fn().mockImplementation(() => [container, document.body]);

      // 连续调用两次 check
      const check1 = plugin.check();
      const check2 = plugin.check();

      await vi.advanceTimersByTimeAsync(1200);

      const res1 = await check1;
      const res2 = await check2;

      // 前序调用被废弃返回 false，仅最新轮次判定有效
      expect(res1).toBe(false);
      expect(res2).toBe(true);
      expect(reporterSpy).toHaveBeenCalledTimes(1);

      await kernel.destroy();
    });
  });
});

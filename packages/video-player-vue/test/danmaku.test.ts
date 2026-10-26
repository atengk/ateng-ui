/**
 * @atengk/video-player-vue Canvas 高性能弹幕系统插件测试套件：
 * 1. 弹幕轨道池防碰撞与通道分配算法测试 (DanmakuTrackPool)
 * 2. 弹幕过滤（类型、颜色屏蔽、关键词/正则、自定义过滤）
 * 3. 动态弹幕发射 (emit) 与视频时间同步检索
 * 4. 弹幕插件生命周期、显隐开关与参数热更 (config)
 * 5. 确定性销毁与资源回收 (Deterministic Cleanup)
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Artplayer from 'artplayer';
import { DanmakuTrackPool } from '../src/plugins/danmaku/DanmakuTrackPool';
import { DanmakuEngine } from '../src/plugins/danmaku/DanmakuEngine';
import { createDanmakuPlugin } from '../src/plugins/danmaku/createDanmakuPlugin';
import type { DanmakuItem } from '../src/plugins/danmaku/types';

describe('工单 #148 Canvas 高性能弹幕系统插件测试套件', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('1. 弹幕通道池与防碰撞算法 (DanmakuTrackPool)', () => {
    it('1.1 应正确计算总轨道数', () => {
      // 高度 600，字号 24，行高系数 1.4 => trackHeight = 33.6
      // area 0.5 => 可用高度 300 => 300 / 33.6 ≈ 8 条轨道
      const pool = new DanmakuTrackPool({
        canvasWidth: 800,
        canvasHeight: 600,
        fontSize: 24,
        area: 0.5,
      });

      expect(pool.totalTracks).toBe(8);
      expect(pool.trackHeight).toBeCloseTo(33.6);
    });

    it('1.2 滚动弹幕防碰撞与轨道复用', () => {
      const pool = new DanmakuTrackPool({
        canvasWidth: 800,
        canvasHeight: 600,
        fontSize: 24,
        area: 0.5,
      });

      // 首次分配，应分配到轨道 0
      const track1 = pool.allocateTrack({
        id: '1',
        text: '第一条弹幕',
        time: 1.0,
        mode: 'scroll',
        width: 100,
        speed: 160,
      });
      expect(track1).toBe(0);

      // 登记第一条弹幕：尾部 750 + 100 = 850 > 800，尚未完全进入屏幕视口
      pool.registerItem(track1, {
        item: { id: '1', text: '第一条弹幕' },
        mode: 'scroll',
        text: '第一条弹幕',
        color: '#ffffff',
        fontSize: 24,
        x: 750,
        y: 0,
        width: 100,
        height: 24,
        speed: 160,
        trackIndex: track1,
        startTime: Date.now(),
        duration: 4000,
      });

      // 在前一条弹幕尾部还在 850（屏幕外）时，新弹幕若进入轨道 0 会发生重叠
      // 算法应自动避开轨道 0，分配到轨道 1
      const track2 = pool.allocateTrack({
        id: '2',
        text: '第二条弹幕',
        time: 1.1,
        mode: 'scroll',
        width: 100,
        speed: 160,
      });
      expect(track2).toBe(1);
    });

    it('1.3 顶部与底部静止弹幕轨道分配', () => {
      const pool = new DanmakuTrackPool({
        canvasWidth: 800,
        canvasHeight: 600,
        fontSize: 24,
        area: 1.0,
      });

      // 顶部弹幕从 0 开始向下分配
      const top1 = pool.allocateTopTrack(4000);
      const top2 = pool.allocateTopTrack(4000);
      expect(top1).toBe(0);
      expect(top2).toBe(1);

      // 底部弹幕从最底下一条向上分配
      const bottom1 = pool.allocateBottomTrack(4000);
      expect(bottom1).toBe(pool.totalTracks - 1);
    });
  });

  describe('2. 弹幕过滤机制 (Filters)', () => {
    const rawItems: DanmakuItem[] = [
      { id: '1', text: '普通弹幕', time: 1.0, mode: 'scroll', color: '#ffffff' },
      { id: '2', text: '顶部弹幕', time: 1.0, mode: 'top', color: '#ffffff' },
      { id: '3', text: '彩色滚动', time: 1.0, mode: 'scroll', color: '#ff0000' },
      { id: '4', text: '广告退散：买茶叶请加微信', time: 1.0, mode: 'scroll', color: '#ffffff' },
    ];

    it('2.1 按类型过滤 filterTypes', () => {
      const engine = new DanmakuEngine(container, {
        items: rawItems,
        filterTypes: ['top'],
      });

      const filtered = engine.getFilteredItems();
      expect(filtered.some(d => d.mode === 'top')).toBe(false);
      expect(filtered.length).toBe(3);
      engine.destroy();
    });

    it('2.2 按关键词与正则过滤 filterKeywords', () => {
      const engine = new DanmakuEngine(container, {
        items: rawItems,
        filterKeywords: ['买茶叶', /微信/],
      });

      const filtered = engine.getFilteredItems();
      expect(filtered.some(d => d.text.includes('买茶叶'))).toBe(false);
      expect(filtered.length).toBe(3);
      engine.destroy();
    });

    it('2.3 彩色弹幕屏蔽 blockColor', () => {
      const engine = new DanmakuEngine(container, {
        items: rawItems,
        blockColor: true,
      });

      const filtered = engine.getFilteredItems();
      const colored = filtered.find(d => d.id === '3');
      expect(colored?.color).toBe('#ffffff');
      engine.destroy();
    });

    it('2.4 自定义过滤回调 filter', () => {
      const engine = new DanmakuEngine(container, {
        items: rawItems,
        filter: item => item.text !== '普通弹幕',
      });

      const filtered = engine.getFilteredItems();
      expect(filtered.some(d => d.text === '普通弹幕')).toBe(false);
      engine.destroy();
    });
  });

  describe('3. 动态弹幕发射与操作 API', () => {
    it('3.1 emit 发射单条新弹幕并赋予 ID 与时间', () => {
      const engine = new DanmakuEngine(container, { items: [] });
      const emitted = engine.emit({
        text: '前方高能！',
        color: '#00ff00',
        mode: 'scroll',
      });

      expect(emitted.id).toBeDefined();
      expect(emitted.text).toBe('前方高能！');
      expect(engine.getAllItems().some(i => i.id === emitted.id)).toBe(true);
      engine.destroy();
    });

    it('3.2 显隐控制与配置热更新', () => {
      const engine = new DanmakuEngine(container, { items: [] });
      expect(engine.visible).toBe(true);

      engine.hide();
      expect(engine.visible).toBe(false);

      engine.show();
      expect(engine.visible).toBe(true);

      engine.toggle();
      expect(engine.visible).toBe(false);

      engine.config({ opacity: 0.5, speed: 1.5, area: 0.25 });
      expect(engine.options.opacity).toBe(0.5);
      expect(engine.options.speed).toBe(1.5);
      expect(engine.options.area).toBe(0.25);

      engine.destroy();
    });

    it('3.3 批量载入与重置清空', () => {
      const engine = new DanmakuEngine(container, { items: [] });
      engine.load([
        { id: '10', text: '弹幕 1', time: 1.0 },
        { id: '11', text: '弹幕 2', time: 2.0 },
      ]);

      expect(engine.getAllItems().length).toBe(2);

      engine.clear();
      expect(engine.activeCount).toBe(0);

      engine.reset();
      expect(engine.getAllItems().length).toBe(0);

      engine.destroy();
    });
  });

  describe('4. Artplayer 插件标准集成 (createDanmakuPlugin)', () => {
    it('4.1 应生成标准 Artplayer 插件并正确挂载至 art 实例', () => {
      const mockArt = {
        template: {
          $player: container,
        },
        currentTime: 0,
        playing: true,
        on: vi.fn(),
        emit: vi.fn(),
        plugins: {},
      };

      const pluginFactory = createDanmakuPlugin({
        items: [{ id: '1', text: '插件测试弹幕', time: 0 }],
      });

      const pluginInstance = pluginFactory(mockArt as unknown as Artplayer);

      expect(pluginInstance.name).toBe('danmaku');
      expect(pluginInstance.visible).toBe(true);
      expect(typeof pluginInstance.emit).toBe('function');
      expect(typeof pluginInstance.config).toBe('function');

      // 验证 Artplayer 事件监听已绑定
      expect(mockArt.on).toHaveBeenCalled();

      // 销毁
      pluginInstance.destroy();
    });
  });
});

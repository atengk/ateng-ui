/**
 * @atengk/video-player-vue Canvas 高性能弹幕系统 Artplayer 插件工厂。
 *
 * 封装标准 Artplayer 插件生命周期绑定，支持弹幕实时发射、显隐切换、热更配置与自动销毁。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type Artplayer from 'artplayer';
import { DanmakuEngine } from './DanmakuEngine';
import type {
  DanmakuArtplayerPlugin,
  DanmakuItem,
  DanmakuOptions,
  DanmakuPluginInstance,
} from './types';

/**
 * 创建高性能 Canvas 弹幕系统插件。
 *
 * @param options 弹幕初始配置与预载弹幕列表
 * @returns 符合 Artplayer 插件规范的高阶函数
 */
export function createDanmakuPlugin(options: DanmakuOptions = {}): DanmakuArtplayerPlugin {
  return (art: Artplayer): DanmakuPluginInstance => {
    // 确定注入挂载的目标 DOM 容器
    const container =
      (art.template?.$player as HTMLElement | undefined) ||
      (art.template?.$video?.parentElement as HTMLElement | undefined) ||
      ((art as unknown as { container?: HTMLElement }).container as HTMLElement);

    const engine = new DanmakuEngine(container, options);

    // 绑定 Artplayer 播放器内核生命周期与时钟事件
    art.on('video:timeupdate', () => {
      engine.syncVideoTime(art.currentTime, art.playing);
    });

    art.on('play', () => {
      engine.syncVideoTime(art.currentTime, true);
    });

    art.on('pause', () => {
      engine.syncVideoTime(art.currentTime, false);
    });

    art.on('seek', (targetTime: number) => {
      engine.handleSeek(targetTime);
    });

    art.on('destroy', () => {
      engine.destroy();
    });

    const pluginInstance: DanmakuPluginInstance = {
      name: 'danmaku',
      get visible(): boolean {
        return engine.visible;
      },
      get activeCount(): number {
        return engine.activeCount;
      },
      emit: (danmu: Omit<DanmakuItem, 'id'> | DanmakuItem): DanmakuItem => {
        const itemWithTime = {
          ...danmu,
          time: typeof danmu.time === 'number' ? danmu.time : art.currentTime,
        };
        return engine.emit(itemWithTime);
      },
      show: () => engine.show(),
      hide: () => engine.hide(),
      toggle: () => engine.toggle(),
      config: (opts: Partial<DanmakuOptions>) => engine.config(opts),
      clear: () => engine.clear(),
      reset: () => engine.reset(),
      load: (items: DanmakuItem[]) => engine.load(items),
      destroy: () => engine.destroy(),
    };

    // 挂载至 Artplayer 实例扩展属性，方便在外部直接通过 art.plugins.danmaku 或 art.danmaku 访问
    if (art.plugins) {
      (art.plugins as Record<string, unknown>).danmaku = pluginInstance;
    }
    (art as unknown as Record<string, unknown>).danmaku = pluginInstance;

    return pluginInstance;
  };
}

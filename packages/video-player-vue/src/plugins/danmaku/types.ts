/**
 * @atengk/video-player-vue Canvas 高性能弹幕系统插件强类型契约。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type Artplayer from 'artplayer';

/**
 * 弹幕展示类型模式：
 * - 'scroll': 滚动弹幕（从右向左匀速飘过）
 * - 'top': 顶部居中静止弹幕
 * - 'bottom': 底部居中静止弹幕
 */
export type DanmakuMode = 'scroll' | 'top' | 'bottom';

/**
 * 弹幕单条数据契约。
 */
export interface DanmakuItem {
  /**
   * 弹幕唯一 ID。
   */
  id: string | number;
  /**
   * 弹幕文字内容。
   */
  text: string;
  /**
   * 弹幕发射或出现的视频相对时间戳（秒）。若未传或为 0 默认随视频当前进度。
   */
  time?: number;
  /**
   * 弹幕呈现模式。默认 'scroll'。
   */
  mode?: DanmakuMode;
  /**
   * 弹幕文字颜色十六进制或 CSS 格式（如 '#ffffff'）。默认 '#ffffff'。
   */
  color?: string;
  /**
   * 弹幕字号大小（像素）。默认 24。
   */
  fontSize?: number;
  /**
   * 是否绘制边框或边框颜色（主要用于本人高亮弹幕）。
   */
  border?: boolean | string;
  /**
   * 是否为当前客户端用户本人发射的弹幕。
   */
  isMe?: boolean;
  /**
   * 扩展样式或元数据。
   */
  style?: Record<string, string>;
}

/**
 * 弹幕系统初始化与全局运行时配置选项。
 */
export interface DanmakuOptions {
  /**
   * 初始静态或预加载的弹幕列表。
   */
  items?: DanmakuItem[];
  /**
   * 弹幕整体滚动速度系数（0.5 ~ 2.0，默认 1.0）。基准穿屏时长约为 5 秒。
   */
  speed?: number;
  /**
   * 弹幕图层透明度（0.1 ~ 1.0，默认 1.0）。
   */
  opacity?: number;
  /**
   * 默认基准字号大小（像素，默认 24）。
   */
  fontSize?: number;
  /**
   * 弹幕垂直展示区域占比（0.25 1/4屏 | 0.5 半屏 | 0.75 3/4屏 | 1.0 全屏，默认 0.75）。
   */
  area?: number;
  /**
   * 同屏最大允许活跃弹幕数量，防爆屏保护（默认 100）。
   */
  maxCount?: number;
  /**
   * 自定义过滤回调函数，返回 false 则不予渲染。
   */
  filter?: (item: DanmakuItem) => boolean;
  /**
   * 要屏蔽过滤的弹幕类型模式（如 ['top', 'bottom'] 屏蔽静止弹幕）。
   */
  filterTypes?: DanmakuMode[];
  /**
   * 关键词或正则表达式屏蔽列表（命中任一则过滤）。
   */
  filterKeywords?: (string | RegExp)[];
  /**
   * 是否屏蔽彩色弹幕（将所有非白弹幕强制统一为白色 '#ffffff'）。
   */
  blockColor?: boolean;
  /**
   * 是否开启随视频进度严格同步与时间检索。默认 true。
   */
  synchronizeVideo?: boolean;
}

/**
 * 内部渲染活跃弹幕状态对象。
 */
export interface DanmakuRenderObject {
  item: DanmakuItem;
  mode: DanmakuMode;
  text: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  trackIndex: number;
  startTime: number;
  duration: number;
  border?: boolean | string;
  isMe?: boolean;
}

/**
 * 弹幕插件对外暴露的控制门面实例契约。
 */
export interface DanmakuPluginInstance {
  /**
   * 插件唯一具名标识。
   */
  readonly name: 'danmaku';
  /**
   * 当前弹幕图层是否处于可见显示状态。
   */
  readonly visible: boolean;
  /**
   * 当前正在屏幕上活跃绘制的弹幕数量。
   */
  readonly activeCount: number;
  /**
   * 发射一条新弹幕。
   *
   * @param danmu 待发射的弹幕对象（可省略 id 与 time，系统自动补充）
   * @returns 赋予完备 ID 与时标后的弹幕条目
   */
  emit: (danmu: Omit<DanmakuItem, 'id'> | DanmakuItem) => DanmakuItem;
  /**
   * 显示弹幕。
   */
  show: () => void;
  /**
   * 隐藏弹幕。
   */
  hide: () => void;
  /**
   * 切换弹幕显隐。
   */
  toggle: () => void;
  /**
   * 动态热更新弹幕运行配置（如调节速度、透明度、区域、过滤规则）。
   *
   * @param options 部分配置项
   */
  config: (options: Partial<DanmakuOptions>) => void;
  /**
   * 清空当前屏幕上的所有活跃弹幕。
   */
  clear: () => void;
  /**
   * 重置清空所有弹幕数据（包含预加载库与活跃队列）。
   */
  reset: () => void;
  /**
   * 批量追加或载入弹幕数据。
   *
   * @param items 弹幕列表
   */
  load: (items: DanmakuItem[]) => void;
  /**
   * 销毁弹幕插件并确定性回收底层 Canvas 与定时器句柄。
   */
  destroy: () => void;
}

/**
 * Artplayer 插件标准函数定义。
 */
export type DanmakuArtplayerPlugin = (art: Artplayer) => DanmakuPluginInstance;

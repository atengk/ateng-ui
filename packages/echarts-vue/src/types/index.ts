/**
 * ECharts 5 响应式套件通用类型定义。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { ShallowRef, Ref, MaybeRefOrGetter } from 'vue';
import type * as echarts from 'echarts';

export type EChartsInstance = echarts.ECharts;
export type EChartsOption = echarts.EChartsOption;
export type EChartsInitOpts = echarts.EChartsInitOpts;
export type SetOptionOpts = echarts.SetOptionOpts;

/**
 * useECharts 配置选项契约。
 */
export interface UseEChartsOptions {
  /**
   * 图表主题，支持 'auto'（自动侦测亮暗）、内置主题名称或注册的主题配置对象。
   * @default 'auto'
   */
  theme?: MaybeRefOrGetter<string | object | undefined>;

  /**
   * ECharts 初始化选项（如渲染器 renderer: 'canvas' | 'svg'、devicePixelRatio 等）。
   */
  initOptions?: MaybeRefOrGetter<EChartsInitOpts | undefined>;

  /**
   * 是否自动监听容器尺寸变化并重排重绘。
   * @default true
   */
  autoResize?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 尺寸调整防抖延迟时间（毫秒）。
   * @default 150
   */
  resizeDebounce?: number;

  /**
   * 主题变化回调钩子。
   */
  onThemeChange?: (theme: string) => void;

  /**
   * 是否禁用自动销毁。默认在组件卸载时自动调用 dispose()。
   * @default false
   */
  manualDispose?: boolean;
}

/**
 * useECharts 无头 Hook 返回对象契约。
 */
export interface UseEChartsReturn {
  /**
   * 底层 ECharts 实例引用，严格通过 ShallowRef 托管，防止 Vue 深度响应式破坏原型链与内存泄露。
   */
  instance: ShallowRef<EChartsInstance | null>;

  /**
   * 标识当前容器是否处于零尺寸挂起状态（如处于隐藏 Tab 或未完成展开动画的弹窗中）。
   */
  isZeroDimension: Readonly<Ref<boolean>>;

  /**
   * 当前生效的主题名称或标识（如 'ateng-light' / 'ateng-dark'）。
   */
  currentTheme: Readonly<Ref<string>>;

  /**
   * 初始化或复用 ECharts 实例。
   */
  init: () => EChartsInstance | null;

  /**
   * 彻底安全销毁 ECharts 实例并解绑监听器。
   */
  dispose: () => void;

  /**
   * 设置图表配置项，支持 options 快捷合并控制。
   */
  setOption: (
    option: EChartsOption,
    notMergeOrOpts?: boolean | SetOptionOpts,
    lazyUpdate?: boolean,
  ) => void;

  /**
   * 触发图表尺寸自适应重绘。
   */
  resize: (opts?: echarts.ResizeOpts) => void;

  /**
   * 显示加载动画。
   */
  showLoading: (opts?: object) => void;

  /**
   * 隐藏加载动画。
   */
  hideLoading: () => void;

  /**
   * 清空图表画布并重置配置。
   */
  clear: () => void;

  /**
   * 触发图表内部行为指令（如高亮、选中、提示框等）。
   */
  dispatchAction: (payload: unknown) => void;

  /**
   * 导出图表当前绘制画面的 Base64 图片地址。
   */
  getDataURL: (opts?: {
    type?: 'png' | 'jpeg' | 'svg';
    pixelRatio?: number;
    backgroundColor?: string;
    excludeComponents?: string[];
  }) => string;
}

/**
 * AtengECharts 通用表现容器组件属性契约。
 */
export interface AtengEChartsProps {
  /**
   * ECharts 配置项。
   */
  option: EChartsOption;

  /**
   * 图表主题，支持 'auto'（自动跟随系统/Element Plus 亮暗）、主题名称或自定义对象。
   * @default 'auto'
   */
  theme?: string | object;

  /**
   * 初始化选项。
   */
  initOptions?: EChartsInitOpts;

  /**
   * 容器宽度。
   * @default '100%'
   */
  width?: string;

  /**
   * 容器保底高度，杜绝容器塌陷。
   * @default '350px'
   */
  height?: string;

  /**
   * 是否自动监听容器尺寸变化并自适应调整大小。
   * @default true
   */
  autoResize?: boolean;

  /**
   * 是否在更新 option 时不与旧配置合并（对齐 Vue 声明式直觉，彻底杜绝 series 脏残留）。
   * @default true
   */
  notMerge?: boolean;

  /**
   * 是否启用帧合并惰性更新，防止高频触发重排。
   * @default true
   */
  lazyUpdate?: boolean;

  /**
   * 是否处于加载状态。
   * @default false
   */
  loading?: boolean;
}

/**
 * AtengECharts 通用表现容器组件事件契约。
 */
export interface AtengEChartsEmits {
  /**
   * 图表渲染完成事件。
   */
  (e: 'rendered', instance: EChartsInstance): void;

  /**
   * 动画过渡完成事件。
   */
  (e: 'finished'): void;

  /**
   * 图表点击事件。
   */
  (e: 'chart-click', params: unknown): void;

  /**
   * 容器尺寸变化自适应完成事件。
   */
  (e: 'resize'): void;

  /**
   * 主题热切换重绘事件。
   */
  (e: 'theme-change', theme: string): void;
}

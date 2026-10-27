/**
 * ECharts 5 响应式无头状态机 Hook。
 *
 * 严格锁定浅响应式引用 (shallowRef) 托管 ECharts 实例，彻底杜绝 Vue 深度代理破坏原型链与内存泄露；
 * 内置 ResizeObserver 物理容器几何感知（带 150ms 防抖调度）；
 * 搭载零尺寸（0x0）挂起防假死与正向尺寸毫秒自愈状态机；
 * 遵循确定性生命周期清理契约，在作用域销毁时安全释放实例与物理监听器。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import {
  ref,
  shallowRef,
  toValue,
  onMounted,
  onScopeDispose,
  readonly,
  type MaybeRefOrGetter,
} from 'vue';
import * as echarts from 'echarts';
import type {
  EChartsInstance,
  EChartsOption,
  SetOptionOpts,
  UseEChartsOptions,
  UseEChartsReturn,
} from '../types';

export function useECharts(
  elRef: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseEChartsOptions,
): UseEChartsReturn {
  // 1. 严格使用 shallowRef 托管实例，防止 Vue Proxy 深度侵入 ECharts 原型链
  const instance = shallowRef<EChartsInstance | null>(null);

  // 2. 零尺寸挂起状态机与待决 Option 缓存
  const isZeroDimension = ref(false);
  const pendingOption = shallowRef<EChartsOption | null>(null);

  let resizeObserver: ResizeObserver | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  const debounceMs = options?.resizeDebounce ?? 150;

  /**
   * 探测容器是否处于零尺寸不可见状态（如处于折叠 Tab 或未渲染弹窗中）。
   */
  const checkZeroDimension = (el: HTMLElement): boolean => {
    return el.clientWidth === 0 || el.clientHeight === 0;
  };

  /**
   * 初始化或复用 ECharts 实例。
   */
  const init = (): EChartsInstance | null => {
    const el = toValue(elRef);
    if (!el) {
      return null;
    }

    // 零尺寸防假死：当容器尺寸为 0 时挂起初始化，避免生成 100px 默认变形画布或除零异常
    if (checkZeroDimension(el)) {
      isZeroDimension.value = true;
      return null;
    }

    isZeroDimension.value = false;

    // 避免重复 init
    const existing = echarts.getInstanceByDom(el);
    if (existing) {
      instance.value = existing;
      return existing;
    }

    const theme = toValue(options?.theme);
    const initOpts = toValue(options?.initOptions);

    const chart = echarts.init(el, theme, initOpts);
    instance.value = chart;

    // 若此前存在零尺寸期间传入的待决 Option，自愈后立即补偿应用
    if (pendingOption.value) {
      chart.setOption(pendingOption.value);
    }

    return chart;
  };

  /**
   * 彻底安全销毁图表实例并回收监听器。
   */
  const dispose = (): void => {
    // 清理 Resize 调度定时器
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    // 断开物理 ResizeObserver
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    // 释放 ECharts 实例
    if (instance.value) {
      if (!instance.value.isDisposed()) {
        instance.value.dispose();
      }
      instance.value = null;
    }

    isZeroDimension.value = false;
    pendingOption.value = null;
  };

  /**
   * 设置图表配置项。
   */
  const setOption = (
    option: EChartsOption,
    notMergeOrOpts?: boolean | SetOptionOpts,
    lazyUpdate?: boolean,
  ): void => {
    pendingOption.value = option;

    const el = toValue(elRef);
    if (el && checkZeroDimension(el)) {
      // 容器当前无有效尺寸，挂起实际绘制，待尺寸恢复后自动自愈应用
      isZeroDimension.value = true;
      return;
    }

    if (!instance.value) {
      init();
    }

    if (instance.value && !instance.value.isDisposed()) {
      if (typeof notMergeOrOpts === 'boolean') {
        instance.value.setOption(option, notMergeOrOpts, lazyUpdate);
      } else if (notMergeOrOpts) {
        instance.value.setOption(option, notMergeOrOpts);
      } else {
        instance.value.setOption(option);
      }
    }
  };

  /**
   * 触发图表重新计算尺寸。
   */
  const resize = (opts?: echarts.ResizeOpts): void => {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.resize(opts);
    }
  };

  /**
   * 容器几何变化监听回调（集成零尺寸自愈与防抖调度）。
   */
  const handleResize = (): void => {
    const el = toValue(elRef);
    if (!el) {
      return;
    }

    // 1. 若当前进入零尺寸状态（如 Tab 隐藏），标记挂起
    if (checkZeroDimension(el)) {
      isZeroDimension.value = true;
      return;
    }

    // 2. 若从零尺寸恢复为正向有效尺寸，执行毫秒级自愈
    if (isZeroDimension.value) {
      isZeroDimension.value = false;
      if (!instance.value) {
        init();
      } else if (!instance.value.isDisposed()) {
        instance.value.resize();
        if (pendingOption.value) {
          instance.value.setOption(pendingOption.value);
        }
      }
      return;
    }

    // 3. 常规尺寸微变防抖重排
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
      if (instance.value && !instance.value.isDisposed()) {
        instance.value.resize();
      }
    }, debounceMs);
  };

  /**
   * 显示加载中。
   */
  const showLoading = (opts?: object): void => {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.showLoading(opts);
    }
  };

  /**
   * 隐藏加载中。
   */
  const hideLoading = (): void => {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.hideLoading();
    }
  };

  /**
   * 清空图表画布。
   */
  const clear = (): void => {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.clear();
    }
  };

  /**
   * 派发图表内部行为。
   */
  const dispatchAction = (payload: unknown): void => {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.dispatchAction(payload as echarts.Payload);
    }
  };

  /**
   * 导出图表 Base64 图片地址。
   */
  const getDataURL = (opts?: {
    type?: 'png' | 'jpeg' | 'svg';
    pixelRatio?: number;
    backgroundColor?: string;
    excludeComponents?: string[];
  }): string => {
    if (instance.value && !instance.value.isDisposed()) {
      return instance.value.getDataURL(opts);
    }
    return '';
  };

  // 3. 挂载时尝试自动初始化与注册 ResizeObserver
  onMounted(() => {
    const el = toValue(elRef);
    if (el) {
      const autoResize = toValue(options?.autoResize) ?? true;
      if (autoResize && typeof window !== 'undefined' && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(el);
      }

      init();
    }
  });

  // 4. 确定性销毁防线：在作用域注销时 100% 销毁实例与解绑监听器
  if (!options?.manualDispose) {
    onScopeDispose(() => {
      dispose();
    });
  }

  return {
    instance,
    isZeroDimension: readonly(isZeroDimension),
    init,
    dispose,
    setOption,
    resize,
    showLoading,
    hideLoading,
    clear,
    dispatchAction,
    getDataURL,
  };
}

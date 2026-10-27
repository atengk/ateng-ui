/**
 * ECharts 5 响应式无头状态机 Hook。
 *
 * 严格锁定浅响应式引用 (shallowRef) 托管 ECharts 实例，彻底杜绝 Vue 深度代理破坏原型链与内存泄露；
 * 遵循确定性生命周期清理契约，在作用域销毁时安全释放实例。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { shallowRef, toValue, onMounted, onScopeDispose, type MaybeRefOrGetter } from 'vue';
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

  /**
   * 初始化或复用 ECharts 实例。
   */
  const init = (): EChartsInstance | null => {
    const el = toValue(elRef);
    if (!el) {
      return null;
    }

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
    return chart;
  };

  /**
   * 彻底安全销毁图表实例。
   */
  const dispose = (): void => {
    if (instance.value) {
      if (!instance.value.isDisposed()) {
        instance.value.dispose();
      }
      instance.value = null;
    }
  };

  /**
   * 设置图表配置项。
   */
  const setOption = (
    option: EChartsOption,
    notMergeOrOpts?: boolean | SetOptionOpts,
    lazyUpdate?: boolean,
  ): void => {
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

  // 2. 挂载时尝试自动初始化
  onMounted(() => {
    init();
  });

  // 3. 确定性销毁防线：在作用域注销时 100% 销毁实例
  if (!options?.manualDispose) {
    onScopeDispose(() => {
      dispose();
    });
  }

  return {
    instance,
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

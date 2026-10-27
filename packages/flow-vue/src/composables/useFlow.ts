/**
 * useFlow 无头响应式状态机。
 *
 * 封装 LogicFlow 核心实例全生命周期、视口导航与历史撤销重做状态。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import LogicFlow from '@logicflow/core';
import type { Options } from '@logicflow/core';
import {
  ref,
  shallowRef,
  onScopeDispose,
  onUnmounted,
  getCurrentScope,
  getCurrentInstance,
} from 'vue';
import type { FlowGraph, FlowOptions, UseFlowOptions, UseFlowReturn } from '../types';

export function useFlow(useOptions: UseFlowOptions = {}): UseFlowReturn {
  const { options = {}, initialGraph, autoResize = true, resizeDebounceMs = 100 } = useOptions;

  const lf = shallowRef<LogicFlow | null>(null);
  const containerRef = ref<HTMLElement | null>(null);
  const canUndo = ref<boolean>(false);
  const canRedo = ref<boolean>(false);

  let resizeObserver: ResizeObserver | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 初始化 LogicFlow 画布实例。
   */
  const init = (container?: HTMLElement, customOptions?: FlowOptions): LogicFlow => {
    const targetContainer = container ?? containerRef.value;
    if (!targetContainer) {
      throw new Error('[@atengk/flow-vue]: 初始化画布失败，未提供有效的容器 DOM 元素。');
    }

    // 1. 若已存在旧实例，安全销毁
    if (lf.value) {
      destroy();
    }

    containerRef.value = targetContainer;

    // 2. 合并配置项
    const mergedOptions: Options.Definition = {
      container: targetContainer,
      grid: true,
      stopMoveGraph: false,
      isSilentMode: false,
      keyboard: {
        enabled: true,
      },
      ...options,
      ...customOptions,
    };

    const instance = new LogicFlow(mergedOptions);
    lf.value = instance;

    // 注册增强桌面级快捷键（Delete 键删除选中元素，Ctrl+Shift+Z 重做）
    if (instance.keyboard) {
      instance.keyboard.on(['delete'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        const elements = instance.graphModel.getSelectElements(true);
        instance.clearSelectElements();
        elements.edges.forEach(edge => edge.id && instance.deleteEdge(edge.id));
        elements.nodes.forEach(node => node.id && instance.deleteNode(node.id));
        return false;
      });

      instance.keyboard.on(['ctrl + shift + z', 'cmd + shift + z'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        instance.redo();
        return false;
      });
    }

    // 3. 订阅历史栈状态变化
    instance.on('history:change', (eventData: unknown) => {
      const data = (eventData as { data?: { undoAble?: boolean; redoAble?: boolean } })?.data;
      if (data) {
        canUndo.value = Boolean(data.undoAble);
        canRedo.value = Boolean(data.redoAble);
      }
    });

    // 4. 若传入初始图数据，立即渲染
    if (initialGraph && (initialGraph.nodes.length > 0 || initialGraph.edges.length > 0)) {
      instance.render(initialGraph as LogicFlow.GraphConfigData);
    }

    // 5. 绑定 ResizeObserver 几何自适应
    if (autoResize && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          resize();
        }, resizeDebounceMs);
      });
      resizeObserver.observe(targetContainer);
    }

    return instance;
  };

  /**
   * 渲染图数据。
   */
  const render = (graphData?: FlowGraph): void => {
    if (!lf.value) {
      return;
    }
    const data = graphData ?? { nodes: [], edges: [] };
    lf.value.render(data as LogicFlow.GraphConfigData);
  };

  /**
   * 获取当前画布全景数据。
   */
  const getGraphData = (): FlowGraph => {
    if (!lf.value) {
      return { nodes: [], edges: [] };
    }
    const raw = lf.value.getGraphRawData() as unknown as FlowGraph;
    return {
      nodes: raw?.nodes ?? [],
      edges: raw?.edges ?? [],
    };
  };

  /**
   * 清空画布全部图元。
   */
  const clear = (): void => {
    if (!lf.value) {
      return;
    }
    lf.value.clearData();
    canUndo.value = false;
    canRedo.value = false;
  };

  /**
   * 视口放大。
   */
  const zoomIn = (): void => {
    lf.value?.zoom(true);
  };

  /**
   * 视口缩小。
   */
  const zoomOut = (): void => {
    lf.value?.zoom(false);
  };

  /**
   * 重置视口缩放比例至 1:1。
   */
  const resetZoom = (): void => {
    lf.value?.resetZoom();
  };

  /**
   * 适应并居中画布内容。
   */
  const fitView = (verticalOffset = 20, horizontalOffset = 20): void => {
    lf.value?.fitView(verticalOffset, horizontalOffset);
  };

  /**
   * 撤销操作。
   */
  const undo = (): void => {
    lf.value?.undo();
  };

  /**
   * 重做操作。
   */
  const redo = (): void => {
    lf.value?.redo();
  };

  /**
   * 触发布局尺寸重算自愈。
   */
  const resize = (): void => {
    if (!lf.value || !containerRef.value) {
      return;
    }
    const { clientWidth, clientHeight } = containerRef.value;
    if (clientWidth > 0 && clientHeight > 0) {
      lf.value.resize(clientWidth, clientHeight);
    }
  };

  /**
   * 确定性销毁与资源清理。
   */
  const destroy = (): void => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (lf.value) {
      lf.value.destroy();
      lf.value = null;
    }
    canUndo.value = false;
    canRedo.value = false;
  };

  // 确定性生命周期注销守卫
  if (getCurrentScope()) {
    onScopeDispose(destroy);
  } else if (getCurrentInstance()) {
    onUnmounted(destroy);
  }

  return {
    lf,
    containerRef,
    canUndo,
    canRedo,
    init,
    render,
    getGraphData,
    clear,
    zoomIn,
    zoomOut,
    resetZoom,
    fitView,
    undo,
    redo,
    resize,
    destroy,
  };
}

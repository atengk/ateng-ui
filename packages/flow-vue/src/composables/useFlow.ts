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
import { MiniMap } from '@logicflow/extension';
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
  const cleanups: Array<() => void> = [];

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

    // 2. 合并配置项，默认载入 MiniMap 插件
    const initialPlugins = customOptions?.plugins ?? options?.plugins;
    const plugins: LogicFlow.ExtensionType[] = Array.isArray(initialPlugins)
      ? [...initialPlugins]
      : [];
    if (!plugins.includes(MiniMap as unknown as LogicFlow.ExtensionType)) {
      plugins.push(MiniMap as unknown as LogicFlow.ExtensionType);
    }

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
      plugins,
    };

    const instance = new LogicFlow(mergedOptions);
    lf.value = instance;

    // 注册完整桌面级快捷键体系（撤销/重做、删除、复制/粘贴）
    if (instance.keyboard) {
      // 1. Delete / Backspace 删除选中图元
      instance.keyboard.on(['delete', 'backspace'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        const elements = instance.graphModel.getSelectElements(true);
        instance.clearSelectElements();
        elements.edges.forEach(edge => edge.id && instance.deleteEdge(edge.id));
        elements.nodes.forEach(node => node.id && instance.deleteNode(node.id));
        return false;
      });

      // 2. Ctrl+Z / Cmd+Z 撤销
      instance.keyboard.on(['ctrl + z', 'cmd + z'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        instance.undo();
        return false;
      });

      // 3. Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z 重做
      instance.keyboard.on(['ctrl + y', 'cmd + y', 'ctrl + shift + z', 'cmd + shift + z'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        instance.redo();
        return false;
      });

      // 4. Ctrl+C / Cmd+C 复制 & Ctrl+V / Cmd+V 粘贴
      let copiedElements: LogicFlow.GraphData | null = null;
      let pasteDistance = 40;

      instance.keyboard.on(['ctrl + c', 'cmd + c'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        const selected = instance.graphModel.getSelectElements(false);
        if (selected.nodes.length === 0 && selected.edges.length === 0) return true;
        copiedElements = selected;
        pasteDistance = 40;
        return false;
      });

      instance.keyboard.on(['ctrl + v', 'cmd + v'], () => {
        const kbOptions = instance.keyboard.options.keyboard;
        if (kbOptions?.enabled === false) return true;
        if (instance.graphModel.textEditElement) return true;
        if (
          copiedElements &&
          (copiedElements.nodes.length > 0 || copiedElements.edges.length > 0)
        ) {
          instance.clearSelectElements();
          const added = instance.addElements(
            copiedElements as unknown as LogicFlow.GraphConfigData,
            pasteDistance,
          );
          if (added) {
            added.nodes.forEach(node => instance.selectElementById(node.id, true));
            added.edges.forEach(edge => instance.selectElementById(edge.id, true));
            pasteDistance += 40;
          }
        }
        return false;
      });
    }

    // 5. Space + 拖拽画布平移机制
    let isSpaceDown = false;
    let isDraggingCanvas = false;

    const handleSpaceKeyDown = (e: KeyboardEvent) => {
      const kbOptions = instance.keyboard?.options?.keyboard;
      if (kbOptions?.enabled === false) return;
      if (e.code === 'Space' && !instance.graphModel.textEditElement) {
        e.preventDefault();
        if (!isSpaceDown) {
          isSpaceDown = true;
          targetContainer.style.cursor = 'grab';
        }
      }
    };

    const handleSpaceKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        isDraggingCanvas = false;
        targetContainer.style.cursor = '';
      }
    };

    const handleContainerMouseDown = (e: MouseEvent) => {
      if (isSpaceDown) {
        isDraggingCanvas = true;
        targetContainer.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isSpaceDown && isDraggingCanvas) {
        instance.translate(e.movementX, e.movementY);
      }
    };

    const handleWindowMouseUp = () => {
      if (isDraggingCanvas) {
        isDraggingCanvas = false;
        if (isSpaceDown) {
          targetContainer.style.cursor = 'grab';
        } else {
          targetContainer.style.cursor = '';
        }
      }
    };

    const handleWindowBlur = () => {
      isSpaceDown = false;
      isDraggingCanvas = false;
      targetContainer.style.cursor = '';
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleSpaceKeyDown);
      window.addEventListener('keyup', handleSpaceKeyUp);
      targetContainer.addEventListener('mousedown', handleContainerMouseDown);
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      window.addEventListener('blur', handleWindowBlur);

      cleanups.push(() => {
        window.removeEventListener('keydown', handleSpaceKeyDown);
        window.removeEventListener('keyup', handleSpaceKeyUp);
        targetContainer.removeEventListener('mousedown', handleContainerMouseDown);
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        window.removeEventListener('blur', handleWindowBlur);
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
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      cleanup?.();
    }
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

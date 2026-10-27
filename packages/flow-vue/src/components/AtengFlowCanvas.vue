<script setup lang="ts">
/**
 * AtengFlowCanvas 流程画布基础表现容器。
 *
 * 封装 LogicFlow 画布挂载、响应式数据双向同步与事件桥接。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed, watch, onMounted, type CSSProperties, type Component } from 'vue';
import { useFlow } from '../composables/useFlow';
import { BpmnAdapter, type BpmnExportOptions } from '../bpmn';
import { FlowSnapshot, type FlowSnapshotOptions } from '../snapshot';
import { registerVueNode, type VueNodeOptions } from '../registry';
import type {
  FlowNode,
  FlowEdge,
  AtengFlowCanvasProps,
  AtengFlowCanvasEmits,
  AtengFlowCanvasSlots,
  AtengFlowCanvasExpose,
} from '../types';

defineOptions({
  name: 'AtengFlowCanvas',
});

const props = withDefaults(defineProps<AtengFlowCanvasProps>(), {
  modelValue: () => ({ nodes: [], edges: [] }),
  options: () => ({}),
  width: '100%',
  height: '100%',
  autoResize: true,
  disabled: false,
});

const emit = defineEmits<AtengFlowCanvasEmits>();
defineSlots<AtengFlowCanvasSlots>();

const domRef = ref<HTMLDivElement | null>(null);

const {
  lf,
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
} = useFlow({
  options: {
    ...props.options,
    isSilentMode: props.disabled,
  },
  autoResize: props.autoResize,
});

const rootStyle = computed<CSSProperties>(() => {
  const toDim = (val: string | number): string => (typeof val === 'number' ? `${val}px` : val);
  return {
    width: toDim(props.width),
    height: toDim(props.height),
  };
});

onMounted(() => {
  if (!domRef.value) {
    return;
  }

  // 1. 初始化 LogicFlow 实例
  const instance = init(domRef.value, {
    ...props.options,
    isSilentMode: props.disabled,
  });

  // 2. 注册事件透传与双向数据流派发
  instance.on('node:click', (data: { data: FlowNode; e: MouseEvent }) => {
    emit('node:click', data.data, data.e);
  });

  instance.on('edge:click', (data: { data: FlowEdge; e: MouseEvent }) => {
    emit('edge:click', data.data, data.e);
  });

  instance.on('blank:click', (data: { e: MouseEvent }) => {
    emit('blank:click', data.e);
  });

  // 3. 监听历史变更与图元变动
  instance.on('history:change', () => {
    const current = getGraphData();
    emit('change', current);
    emit('update:modelValue', current);
  });

  // 4. 注册外部传入的自定义 Vue SFC 节点
  if (props.customVueNodes && props.customVueNodes.length > 0) {
    for (const item of props.customVueNodes) {
      registerVueNode(instance, item.type, item.component, item.options);
    }
  }

  // 5. 派发 ready，以便父组件与插件提前注册自定义节点/图元
  emit('ready', instance);

  // 6. 渲染初始传入的图数据
  if (
    props.modelValue &&
    (props.modelValue.nodes.length > 0 || props.modelValue.edges.length > 0)
  ) {
    render(props.modelValue);
  }
});

// 外部 modelValue 变更时进行按需刷新
watch(
  () => props.modelValue,
  newVal => {
    if (!lf.value || !newVal) {
      return;
    }
    const current = getGraphData();
    // 简易防抖比对，避免自身发出的 update:modelValue 导致循环全量重绘
    if (
      current.nodes.length !== newVal.nodes.length ||
      current.edges.length !== newVal.edges.length
    ) {
      render(newVal);
    }
  },
  { deep: true },
);

const toggleGrid = (visible?: boolean) => {
  if (!lf.value) return;
  const gridObj = lf.value.graphModel.grid as unknown as { visible?: boolean };
  const target = visible !== undefined ? visible : !(gridObj?.visible ?? true);
  lf.value.graphModel.updateGridOptions({ visible: target });
};

const toggleMiniMap = (visible?: boolean) => {
  if (!lf.value) return;
  const ext = lf.value.extension as unknown as Record<
    string,
    { isShow?: boolean; show: () => void; hide: () => void }
  >;
  const miniMap = ext?.miniMap;
  if (!miniMap) return;
  if (visible === true) {
    miniMap.show();
  } else if (visible === false) {
    miniMap.hide();
  } else {
    if (miniMap.isShow) {
      miniMap.hide();
    } else {
      miniMap.show();
    }
  }
};

const focusElement = (id: string) => {
  if (!lf.value || !id) return;
  try {
    lf.value.focusOn(id);
    lf.value.selectElementById(id);
  } catch {
    // 降级保护
  }
};

const highlightElements = (nodeIds: string[] = [], edgeIds: string[] = []) => {
  if (!lf.value) return;
  for (const nodeId of nodeIds) {
    lf.value.setProperties(nodeId, { __hasError: true });
  }
  for (const edgeId of edgeIds) {
    lf.value.setProperties(edgeId, { __hasError: true });
  }
};

const clearHighlight = () => {
  if (!lf.value) return;
  const current = getGraphData();
  for (const node of current.nodes) {
    if (node.properties?.__hasError) {
      lf.value.setProperties(node.id, { __hasError: false });
    }
  }
  for (const edge of current.edges) {
    if (edge.properties?.__hasError) {
      lf.value.setProperties(edge.id, { __hasError: false });
    }
  }
};

const exportBpmnXml = (options?: BpmnExportOptions): string => {
  const graph = getGraphData();
  return BpmnAdapter.toBpmnXml(graph, options);
};

const importBpmnXml = (xml: string) => {
  const graph = BpmnAdapter.fromBpmnXml(xml);
  render(graph);
  return graph;
};

const exportSnapshot = async (options?: FlowSnapshotOptions): Promise<string> => {
  if (!lf.value) {
    throw new Error('画布尚未初始化');
  }
  return FlowSnapshot.getSnapshot(lf.value, options);
};

const downloadSnapshot = async (options?: FlowSnapshotOptions): Promise<void> => {
  if (!lf.value) return;
  const format = options?.format ?? 'png';
  const filename = options?.filename ? `${options.filename}.${format}` : `flow-snapshot.${format}`;
  if (format === 'svg') {
    const svgStr = FlowSnapshot.getSvgString(lf.value, options);
    FlowSnapshot.download(svgStr, filename);
  } else {
    const dataUrl = await FlowSnapshot.getSnapshot(lf.value, options);
    FlowSnapshot.download(dataUrl, filename);
  }
};

const downloadBpmnXml = (filename = 'process.bpmn20.xml', options?: BpmnExportOptions): void => {
  const xml = exportBpmnXml(options);
  FlowSnapshot.download(xml, filename);
};

const handleRegisterVueNode = (type: string, component: Component, options?: VueNodeOptions) => {
  if (lf.value) {
    registerVueNode(lf.value, type, component, options);
  }
};

defineExpose<AtengFlowCanvasExpose>({
  getLf: () => lf.value,
  getContainer: () => domRef.value,
  getGraphData,
  render,
  clear,
  zoomIn,
  zoomOut,
  resetZoom,
  fitView,
  undo,
  redo,
  resize,
  canUndo: () => canUndo.value,
  canRedo: () => canRedo.value,
  toggleGrid,
  toggleMiniMap,
  focusElement,
  highlightElements,
  clearHighlight,
  exportBpmnXml,
  importBpmnXml,
  exportSnapshot,
  downloadSnapshot,
  downloadBpmnXml,
  registerVueNode: handleRegisterVueNode,
});
</script>

<template>
  <div class="at-flow-canvas" :style="rootStyle">
    <div ref="domRef" class="at-flow-canvas__viewport"></div>
    <slot :lf="lf" :can-undo="canUndo" :can-redo="canRedo" :get-graph-data="getGraphData" />
  </div>
</template>

<style scoped>
.at-flow-canvas {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--at-flow-bg, #ffffff);
  border: 1px solid var(--at-flow-border, #e2e8f0);
}

.at-flow-canvas__viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

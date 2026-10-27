<script setup lang="ts">
/**
 * AtengFlowCanvas 流程画布基础表现容器。
 *
 * 封装 LogicFlow 画布挂载、响应式数据双向同步与事件桥接。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed, watch, onMounted, type CSSProperties } from 'vue';
import { useFlow } from '../composables/useFlow';
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

  // 4. 先派发 ready，以便父组件与插件提前注册自定义节点/图元
  emit('ready', instance);

  // 5. 渲染初始传入的图数据
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

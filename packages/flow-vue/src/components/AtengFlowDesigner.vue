<script setup lang="ts">
/**
 * AtengFlowDesigner 流程编排设计器核心容器。
 *
 * 组装物料面板（Stencil）、流程画布（Canvas）、工具栏与属性抽屉插槽，提供端到端可视化设计体验。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, shallowRef, computed, type CSSProperties } from 'vue';
import type LogicFlow from '@logicflow/core';
import AtengFlowCanvas from './AtengFlowCanvas.vue';
import AtengFlowStencil from './AtengFlowStencil.vue';
import { registerPresetNodes, type StencilItem } from '../presets';
import type {
  FlowGraph,
  FlowOptions,
  AtengFlowCanvasExpose,
  AtengFlowDesignerProps,
  AtengFlowDesignerEmits,
  AtengFlowDesignerSlots,
  AtengFlowDesignerExpose,
} from '../types';

defineOptions({
  name: 'AtengFlowDesigner',
});

const props = withDefaults(defineProps<AtengFlowDesignerProps>(), {
  modelValue: () => ({ nodes: [], edges: [] }),
  options: () => ({}),
  stencilGroups: undefined,
  beforeConnect: undefined,
  width: '100%',
  height: '100%',
  disabled: false,
});

const emit = defineEmits<AtengFlowDesignerEmits>();
defineSlots<AtengFlowDesignerSlots>();

const canvasRef = ref<AtengFlowCanvasExpose | null>(null);
const internalLf = shallowRef<LogicFlow | null>(null);

const mergedCanvasOptions = computed<FlowOptions>(() => {
  return {
    snapline: true,
    edgeType: 'polyline',
    ...props.options,
  };
});

const designerStyle = computed<CSSProperties>(() => {
  const toDim = (val: string | number): string => (typeof val === 'number' ? `${val}px` : val);
  return {
    width: toDim(props.width),
    height: toDim(props.height),
  };
});

const handleCanvasReady = (lfInstance: LogicFlow) => {
  internalLf.value = lfInstance;

  // 1. 注册核心预设节点与拓扑防呆规则
  registerPresetNodes(lfInstance, props.beforeConnect);

  // 2. 监听连线阻断事件向外派发
  lfInstance.on('connection:not-allowed', (data: unknown) => {
    emit('connection:not-allowed', data);
  });

  emit('ready', lfInstance);
};

const handleStartDrag = (item: StencilItem) => {
  if (internalLf.value) {
    const textVal = typeof item.nodeConfig?.text === 'string' ? item.nodeConfig.text : item.label;
    internalLf.value.dnd.startDrag({
      type: item.type,
      text: textVal,
      properties: item.nodeConfig?.properties,
    });
  }
};

const getLf = () => canvasRef.value?.getLf() ?? null;
const getGraphData = () => canvasRef.value?.getGraphData() ?? { nodes: [], edges: [] };
const render = (graph?: FlowGraph) => canvasRef.value?.render(graph);
const clear = () => canvasRef.value?.clear();
const zoomIn = () => canvasRef.value?.zoomIn();
const zoomOut = () => canvasRef.value?.zoomOut();
const resetZoom = () => canvasRef.value?.resetZoom();
const fitView = () => canvasRef.value?.fitView();
const undo = () => canvasRef.value?.undo();
const redo = () => canvasRef.value?.redo();

defineExpose<AtengFlowDesignerExpose>({
  getLf,
  getGraphData,
  render,
  clear,
  zoomIn,
  zoomOut,
  resetZoom,
  fitView,
  undo,
  redo,
  startDrag: handleStartDrag,
});
</script>

<template>
  <div class="at-flow-designer" :style="designerStyle">
    <!-- 顶部工具栏插槽 -->
    <header v-if="$slots.toolbar" class="at-flow-designer__toolbar">
      <slot
        name="toolbar"
        :lf="internalLf"
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        :fit-view="fitView"
        :undo="undo"
        :redo="redo"
        :clear="clear"
        :get-graph-data="getGraphData"
      />
    </header>

    <!-- 中间主交互区域 -->
    <div class="at-flow-designer__body">
      <!-- 左侧物料面板 -->
      <slot name="stencil" :lf="internalLf" :groups="stencilGroups" :start-drag="handleStartDrag">
        <AtengFlowStencil :lf="internalLf" :groups="stencilGroups" />
      </slot>

      <!-- 画布视口区域 -->
      <main class="at-flow-designer__canvas">
        <AtengFlowCanvas
          ref="canvasRef"
          :model-value="modelValue"
          :options="mergedCanvasOptions"
          :disabled="disabled"
          width="100%"
          height="100%"
          @ready="handleCanvasReady"
          @update:model-value="emit('update:modelValue', $event)"
          @change="emit('change', $event)"
          @node:click="(node, e) => emit('node:click', node, e)"
          @edge:click="(edge, e) => emit('edge:click', edge, e)"
          @blank:click="e => emit('blank:click', e)"
        />
      </main>

      <!-- 右侧属性配置抽屉插槽 -->
      <slot v-if="$slots.panel" name="panel" :lf="internalLf" :get-graph-data="getGraphData" />
    </div>
  </div>
</template>

<style scoped>
.at-flow-designer {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--at-flow-border, #e2e8f0);
  background-color: var(--at-flow-bg, #ffffff);
  font-family: var(--at-flow-font-family, sans-serif);
}

.at-flow-designer__toolbar {
  border-bottom: 1px solid var(--at-flow-border, #e2e8f0);
  background-color: #ffffff;
  z-index: 10;
}

.at-flow-designer__body {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.at-flow-designer__canvas {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>

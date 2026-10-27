<script setup lang="ts">
/**
 * AtengFlowDesigner 流程编排设计器核心容器。
 *
 * 组装物料面板（Stencil）、流程画布（Canvas）、工具栏（Toolbar）与属性配置抽屉（PropertyPanel），
 * 提供端到端可视化设计、DAG 自动分层排版与双向响应式属性回写体验。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, shallowRef, computed, type CSSProperties } from 'vue';
import type LogicFlow from '@logicflow/core';
import AtengFlowCanvas from './AtengFlowCanvas.vue';
import AtengFlowStencil from './AtengFlowStencil.vue';
import AtengFlowToolbar from './AtengFlowToolbar.vue';
import AtengFlowPropertyPanel from './AtengFlowPropertyPanel.vue';
import { registerPresetNodes, type StencilItem } from '../presets';
import { AutoLayoutEngine } from '../layout';
import { FlowValidator, type FlowValidationError, type FlowValidationResult } from '../validator';
import type {
  FlowGraph,
  FlowNode,
  FlowEdge,
  FlowOptions,
  FlowElementData,
  LayoutDirection,
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
  showToolbar: true,
  enableKeyboard: true,
  showPanel: true,
  panelWidth: '320px',
});

const emit = defineEmits<AtengFlowDesignerEmits>();
defineSlots<AtengFlowDesignerSlots>();

const canvasRef = ref<AtengFlowCanvasExpose | null>(null);
const internalLf = shallowRef<LogicFlow | null>(null);
const selectedElement = ref<FlowElementData | null>(null);
const canUndo = ref<boolean>(false);
const canRedo = ref<boolean>(false);

const mergedCanvasOptions = computed<FlowOptions>(() => {
  return {
    snapline: true,
    edgeType: 'polyline',
    keyboard: {
      enabled: props.enableKeyboard,
    },
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

const panelWidthCss = computed<string>(() => {
  return typeof props.panelWidth === 'number' ? `${props.panelWidth}px` : props.panelWidth;
});

const handleCanvasReady = (lfInstance: LogicFlow) => {
  internalLf.value = lfInstance;

  // 1. 注册核心预设节点与拓扑防呆规则
  registerPresetNodes(lfInstance, props.beforeConnect);

  // 2. 监听连线阻断事件向外派发
  lfInstance.on('connection:not-allowed', (data: unknown) => {
    emit('connection:not-allowed', data);
  });

  // 3. 监听历史栈可撤销/重做状态
  lfInstance.on('history:change', (eventData: unknown) => {
    const data = (eventData as { data?: { undoAble?: boolean; redoAble?: boolean } })?.data;
    if (data) {
      canUndo.value = Boolean(data.undoAble);
      canRedo.value = Boolean(data.redoAble);
    }
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

const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
  const name =
    typeof node.text === 'string'
      ? node.text
      : (node.text?.value ?? (node.properties?.name as string) ?? '');

  selectedElement.value = {
    id: node.id,
    elementType: 'node',
    type: node.type,
    name,
    text: node.text,
    properties: { ...(node.properties ?? {}) },
    raw: node,
  };

  emit('node:click', node, event);
  emit('selection:change', selectedElement.value);
};

const handleEdgeClick = (edge: FlowEdge, event: MouseEvent) => {
  const name =
    typeof edge.text === 'string'
      ? edge.text
      : (edge.text?.value ?? (edge.properties?.name as string) ?? '');

  selectedElement.value = {
    id: edge.id,
    elementType: 'edge',
    type: edge.type,
    name,
    text: edge.text,
    properties: { ...(edge.properties ?? {}) },
    raw: edge,
  };

  emit('edge:click', edge, event);
  emit('selection:change', selectedElement.value);
};

const handleBlankClick = (event: MouseEvent) => {
  selectedElement.value = null;
  emit('blank:click', event);
  emit('selection:change', null);
};

const handleClosePanel = () => {
  selectedElement.value = null;
  internalLf.value?.clearSelectElements();
  emit('selection:change', null);
};

const updateProperty = (key: string, value: unknown) => {
  if (!selectedElement.value || !internalLf.value) return;
  const { id } = selectedElement.value;

  // 1. 若更新名称/文本标签，同步刷新画布文本
  if (key === 'name' || key === 'label' || key === 'text') {
    const strVal = String(value ?? '');
    internalLf.value.updateText(id, strVal);
    selectedElement.value.name = strVal;
    if (typeof selectedElement.value.text === 'object' && selectedElement.value.text !== null) {
      selectedElement.value.text = { ...selectedElement.value.text, value: strVal };
    } else {
      selectedElement.value.text = strVal;
    }
  }

  // 2. 回写 LogicFlow 元素属性字典（纳入历史撤销重做）
  internalLf.value.setProperties(id, { [key]: value });

  // 3. 同步内存响应式状态
  selectedElement.value.properties = {
    ...selectedElement.value.properties,
    [key]: value,
  };

  // 4. 触发全局数据双向流同步与事件派发
  const current = getGraphData();
  emit('change', current);
  emit('update:modelValue', current);
  emit('element:update', selectedElement.value);
};

const updateProperties = (patch: Record<string, unknown>) => {
  if (!selectedElement.value || !internalLf.value) return;
  const { id } = selectedElement.value;

  // 1. 检查是否涉及文本标签变更
  if ('name' in patch || 'label' in patch || 'text' in patch) {
    const labelVal = patch.name ?? patch.label ?? patch.text;
    if (labelVal !== undefined) {
      const strVal = String(labelVal ?? '');
      internalLf.value.updateText(id, strVal);
      selectedElement.value.name = strVal;
      if (typeof selectedElement.value.text === 'object' && selectedElement.value.text !== null) {
        selectedElement.value.text = { ...selectedElement.value.text, value: strVal };
      } else {
        selectedElement.value.text = strVal;
      }
    }
  }

  // 2. 批量回写属性至底层模型
  internalLf.value.setProperties(id, patch);

  // 3. 内存聚合实体响应式更新
  selectedElement.value.properties = {
    ...selectedElement.value.properties,
    ...patch,
  };

  // 4. 触发全局数据流同步
  const current = getGraphData();
  emit('change', current);
  emit('update:modelValue', current);
  emit('element:update', selectedElement.value);
};

const handleAutoLayout = (direction: LayoutDirection = 'LR') => {
  const current = getGraphData();
  const newGraph = AutoLayoutEngine.layout(current, { direction });
  render(newGraph);
  fitView();
  emit('change', newGraph);
  emit('update:modelValue', newGraph);
  emit('layout:complete', { direction, graph: newGraph });
};

const handleToggleGrid = (visible?: boolean) => {
  canvasRef.value?.toggleGrid(visible);
};

const handleToggleMiniMap = (visible?: boolean) => {
  canvasRef.value?.toggleMiniMap(visible);
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

const clearValidationHighlight = () => {
  canvasRef.value?.clearHighlight();
};

const highlightErrors = (errors: FlowValidationError[]) => {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  for (const err of errors) {
    err.nodeIds?.forEach(id => nodeIds.add(id));
    err.edgeIds?.forEach(id => edgeIds.add(id));
  }
  canvasRef.value?.highlightElements(Array.from(nodeIds), Array.from(edgeIds));
};

const validate = (): FlowValidationResult => {
  const current = getGraphData();
  const result = FlowValidator.validate(current);

  clearValidationHighlight();

  if (!result.valid) {
    const errorNodeIds = new Set<string>();
    const errorEdgeIds = new Set<string>();

    for (const err of result.errors) {
      if (err.level === 'error') {
        err.nodeIds?.forEach(id => errorNodeIds.add(id));
        err.edgeIds?.forEach(id => errorEdgeIds.add(id));
      }
    }

    canvasRef.value?.highlightElements(Array.from(errorNodeIds), Array.from(errorEdgeIds));
  }

  emit('validate', result);
  return result;
};

const focusElement = (id: string) => {
  if (!internalLf.value || !id) return;
  canvasRef.value?.focusElement(id);

  const nodeModel = internalLf.value.getNodeModelById(id);
  if (nodeModel) {
    const data = nodeModel.getData() as FlowNode;
    handleNodeClick(data, new MouseEvent('click'));
    return;
  }
  const edgeModel = internalLf.value.getEdgeModelById(id);
  if (edgeModel) {
    const data = edgeModel.getData() as FlowEdge;
    handleEdgeClick(data, new MouseEvent('click'));
  }
};

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
  getSelectedElement: () => selectedElement.value,
  closePanel: handleClosePanel,
  updateProperty,
  updateProperties,
  autoLayout: handleAutoLayout,
  toggleGrid: handleToggleGrid,
  toggleMiniMap: handleToggleMiniMap,
  validate,
  clearValidationHighlight,
  highlightErrors,
  focusElement,
});
</script>

<template>
  <div class="at-flow-designer" :style="designerStyle">
    <!-- 顶部操作控制栏 -->
    <header v-if="showToolbar" class="at-flow-designer__toolbar">
      <slot
        name="toolbar"
        :lf="internalLf"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        :reset-zoom="resetZoom"
        :fit-view="fitView"
        :undo="undo"
        :redo="redo"
        :clear="clear"
        :auto-layout="handleAutoLayout"
        :toggle-grid="handleToggleGrid"
        :toggle-mini-map="handleToggleMiniMap"
        :get-graph-data="getGraphData"
        :validate="validate"
        :clear-validation-highlight="clearValidationHighlight"
        :focus-element="focusElement"
      >
        <AtengFlowToolbar
          :lf="internalLf"
          :disabled="disabled"
          :can-undo="canUndo"
          :can-redo="canRedo"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @reset-zoom="resetZoom"
          @fit-view="fitView"
          @undo="undo"
          @redo="redo"
          @clear="clear"
          @layout="handleAutoLayout"
          @toggle-grid="handleToggleGrid"
          @toggle-minimap="handleToggleMiniMap"
          @validate="validate"
        />
      </slot>
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
          @node:click="handleNodeClick"
          @edge:click="handleEdgeClick"
          @blank:click="handleBlankClick"
        />
      </main>

      <!-- 右侧属性配置抽屉/面板 -->
      <Transition name="at-flow-panel-slide">
        <aside
          v-if="showPanel && selectedElement"
          class="at-flow-designer__panel"
          :style="{ width: panelWidthCss }"
        >
          <slot
            name="panel"
            :element="selectedElement"
            :lf="internalLf"
            :update-property="updateProperty"
            :update-properties="updateProperties"
            :close="handleClosePanel"
            :get-graph-data="getGraphData"
          >
            <AtengFlowPropertyPanel
              :element="selectedElement"
              :disabled="disabled"
              @update:property="updateProperty"
              @update:properties="updateProperties"
              @close="handleClosePanel"
            />
          </slot>
        </aside>
      </Transition>
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

.at-flow-designer__panel {
  height: 100%;
  position: relative;
  z-index: 20;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
  flex-shrink: 0;
}

/* 抽屉平滑滑入滑出动画 */
.at-flow-panel-slide-enter-active,
.at-flow-panel-slide-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}

.at-flow-panel-slide-enter-from,
.at-flow-panel-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

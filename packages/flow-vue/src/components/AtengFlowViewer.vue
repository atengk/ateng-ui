<script setup lang="ts">
/**
 * AtengFlowViewer 流程运行态流转追踪器容器组件。
 *
 * 依据 ADR-0033 与工单 #169，提供专用于业务详情与审批工单的只读流转追踪器：
 * 1. 严格只读模式：锁定图元编辑、连线、删除与文字篡改，仅允许画布平移与缩放；
 * 2. 五态状态映射：支持 completed、processing、rejected、pending、terminated 状态渲染与流动虚线呼吸光效；
 * 3. 悬停审计浮层：鼠标悬停节点展示审批历史与处理意见，支持 #audit-popover 插槽解构接管；
 * 4. 滚轮防冲突守卫 (WheelZoomGuard)：普通滚轮平滑穿透页面，需按 Ctrl + 滚轮缩放画布；
 * 5. 智能待办聚焦 (SmartFocus)：自动识别首个 processing 待办节点并平滑居中聚焦；
 * 6. 微型视口控制条 (Mini Toolbar)：悬浮提供放大、缩小、居中自适应与聚焦待办能力。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed, watch, onUnmounted, nextTick, type CSSProperties } from 'vue';
import type LogicFlow from '@logicflow/core';
import AtengFlowCanvas from './AtengFlowCanvas.vue';
import AtengFlowAuditPopover from './AtengFlowAuditPopover.vue';
import AtengFlowMiniControls from './AtengFlowMiniControls.vue';
import { useViewerAudit } from '../composables/useViewerAudit';
import { registerPresetNodes } from '../presets';
import type { FlowSnapshotOptions } from '../snapshot';
import type {
  FlowNode,
  FlowEdge,
  FlowOptions,
  FlowStatusMap,
  ExecutionStatus,
  AtengFlowViewerProps,
  AtengFlowViewerEmits,
  AtengFlowViewerSlots,
  AtengFlowViewerExpose,
  AtengFlowCanvasExpose,
} from '../types';

defineOptions({
  name: 'AtengFlowViewer',
});

const props = withDefaults(defineProps<AtengFlowViewerProps>(), {
  modelValue: () => ({ nodes: [], edges: [] }),
  statusMap: () => ({}),
  focusActiveNode: false,
  wheelZoomGuard: true,
  showMiniToolbar: true,
  width: '100%',
  height: '100%',
  options: () => ({}),
});

const emit = defineEmits<AtengFlowViewerEmits>();
defineSlots<AtengFlowViewerSlots>();

const viewerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<AtengFlowCanvasExpose | null>(null);

// 滚轮守卫提示状态
const showWheelHint = ref(false);
let wheelHintTimer: ReturnType<typeof setTimeout> | null = null;

// 悬停审计卡片组合式状态机
const {
  isPopoverVisible,
  hoverNode,
  hoverStatus,
  hoverAuditList,
  popoverX,
  popoverY,
  showPopover,
  closePopover,
  scheduleClosePopover,
  cancelClosePopover,
  disposeAudit,
} = useViewerAudit({
  containerRef: viewerRef,
  getStatusMap: () => props.statusMap,
  onNodeHover: (node, auditList, event) => {
    emit('node:hover', node, auditList, event);
  },
});

const VIEWER_DEFAULT_OPTIONS: Partial<FlowOptions> = {
  isSilentMode: true,
  stopMoveGraph: false,
  stopScrollGraph: true,
  stopZoomGraph: true,
  adjustNodePosition: false,
  adjustEdge: false,
  adjustEdgeMiddle: false,
  adjustEdgeStartAndEnd: false,
  nodeTextEdit: false,
  edgeTextEdit: false,
  textEdit: false,
  hideAnchors: true,
  hoverOutline: false,
};

const mergedCanvasOptions = computed<FlowOptions>(() => ({
  ...props.options,
  ...VIEWER_DEFAULT_OPTIONS,
}));

const rootStyle = computed<CSSProperties>(() => {
  const toDim = (val: string | number): string => (typeof val === 'number' ? `${val}px` : val);
  return {
    width: toDim(props.width),
    height: toDim(props.height),
    position: 'relative',
    overflow: 'hidden',
  };
});

/**
 * 将 statusMap 的状态与审计元数据深度同步至 LogicFlow 节点与连线模型属性中。
 */
const applyStatusMap = (statusMap: FlowStatusMap): void => {
  const lf = canvasRef.value?.getLf();
  if (!lf) return;

  for (const [id, item] of Object.entries(statusMap)) {
    const status: ExecutionStatus = typeof item === 'string' ? item : item.status;
    const audit = typeof item === 'object' ? item.audit : undefined;
    const extra = typeof item === 'object' ? item.extra : undefined;

    const elementModel = lf.getNodeModelById(id) ?? lf.getEdgeModelById(id);
    if (elementModel) {
      lf.setProperties(id, {
        ...elementModel.getProperties(),
        status,
        executionStatus: status,
        audit,
        ...extra,
      });
    }
  }

  emit('status:change', statusMap);
};

/**
 * 聚焦指定节点并平滑居中。
 */
const focusNode = (nodeId: string): void => {
  const lf = canvasRef.value?.getLf();
  if (!lf) return;
  const nodeModel = lf.getNodeModelById(nodeId);
  if (nodeModel) {
    lf.focusOn({ id: nodeId });
  }
};

/**
 * 触发智能待办聚焦 SmartFocus。
 */
const focusActiveNode = (): void => {
  const lf = canvasRef.value?.getLf();
  if (!lf) return;

  if (props.focusNodeId) {
    focusNode(props.focusNodeId);
    return;
  }

  const nodes = props.modelValue?.nodes || [];
  for (const n of nodes) {
    const item = props.statusMap?.[n.id];
    const s = typeof item === 'string' ? item : item?.status;
    const status = s || (n.properties?.status as ExecutionStatus | undefined);
    if (status === 'processing') {
      focusNode(n.id);
      return;
    }
  }
};

const fitView = (vPad?: number, hPad?: number): void => canvasRef.value?.fitView(vPad, hPad);
const zoomIn = (): void => canvasRef.value?.zoomIn();
const zoomOut = (): void => canvasRef.value?.zoomOut();
const resetZoom = (): void => canvasRef.value?.resetZoom();

/**
 * 触发滚轮提示气泡。
 */
const triggerWheelHint = (): void => {
  showWheelHint.value = true;
  if (wheelHintTimer) clearTimeout(wheelHintTimer);
  wheelHintTimer = setTimeout(() => {
    showWheelHint.value = false;
    wheelHintTimer = null;
  }, 1500);
};

const handleWheel = (e: WheelEvent): void => {
  if (!props.wheelZoomGuard) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else if (e.deltaY > 0) zoomOut();
  } else {
    triggerWheelHint();
  }
};

/**
 * 响应式同步状态映射与智能待办聚焦。
 */
const syncStatusAndFocus = (): void => {
  nextTick(() => {
    if (props.statusMap && Object.keys(props.statusMap).length > 0) {
      applyStatusMap(props.statusMap);
    }
    if (props.focusActiveNode || props.focusNodeId) {
      focusActiveNode();
    }
  });
};

const handleNodeMouseEnter = (data: { data: FlowNode; e: MouseEvent }): void => {
  showPopover(data.data, data.e);
};

const handleNodeMouseLeave = (): void => {
  scheduleClosePopover();
};

/**
 * 底层 LogicFlow 画布就绪回调。
 */
const handleCanvasReady = (lf: LogicFlow): void => {
  // 1. 注册核心预设节点与防呆规则
  registerPresetNodes(lf);

  // 2. 注册节点鼠标悬停与离开事件
  lf.on('node:mouseenter', handleNodeMouseEnter);
  lf.on('node:mouseleave', handleNodeMouseLeave);

  // 3. 画布数据渲染完成后应用状态字典与智能待办聚焦
  syncStatusAndFocus();

  emit('ready', lf);
};

const handleNodeClick = (node: FlowNode, event: MouseEvent): void =>
  emit('node:click', node, event);
const handleEdgeClick = (edge: FlowEdge, event: MouseEvent): void =>
  emit('edge:click', edge, event);
const handleBlankClick = (event: MouseEvent): void => {
  closePopover();
  emit('blank:click', event);
};

watch(
  () => props.statusMap,
  newMap => {
    if (newMap) applyStatusMap(newMap);
  },
  { deep: true },
);
watch(
  () => props.modelValue,
  () => {
    syncStatusAndFocus();
  },
  { deep: true },
);

onUnmounted(() => {
  disposeAudit();
  if (wheelHintTimer) {
    clearTimeout(wheelHintTimer);
    wheelHintTimer = null;
  }
  // 对称注销 LogicFlow 节点悬停物理监听事件，杜绝闭包引用泄漏
  const lf = canvasRef.value?.getLf();
  if (lf) {
    lf.off('node:mouseenter', handleNodeMouseEnter);
    lf.off('node:mouseleave', handleNodeMouseLeave);
  }
});

defineExpose<AtengFlowViewerExpose>({
  getLf: () => canvasRef.value?.getLf() ?? null,
  getContainer: () => viewerRef.value,
  fitView,
  focusNode,
  focusActiveNode,
  zoomIn,
  zoomOut,
  resetZoom,
  setStatusMap: applyStatusMap,
  exportSnapshot: (options?: FlowSnapshotOptions) =>
    canvasRef.value?.exportSnapshot(options) ?? Promise.resolve(''),
  downloadSnapshot: (options?: FlowSnapshotOptions) =>
    canvasRef.value?.downloadSnapshot(options) ?? Promise.resolve(),
});
</script>

<template>
  <div ref="viewerRef" class="at-flow-viewer" :style="rootStyle" @wheel="handleWheel">
    <!-- 基础画布层 -->
    <AtengFlowCanvas
      ref="canvasRef"
      :model-value="modelValue"
      :options="mergedCanvasOptions"
      :custom-vue-nodes="customVueNodes"
      :disabled="true"
      width="100%"
      height="100%"
      @ready="handleCanvasReady"
      @node:click="handleNodeClick"
      @edge:click="handleEdgeClick"
      @blank:click="handleBlankClick"
    />

    <!-- 滚轮防冲突守卫浮动提示条 -->
    <Transition name="at-flow-fade">
      <div v-if="showWheelHint" class="at-flow-wheel-hint">
        <span class="at-flow-wheel-hint__key">Ctrl</span>
        <span>+ 滚轮以缩放画布</span>
      </div>
    </Transition>

    <!-- 悬停审批审计浮层子组件 -->
    <AtengFlowAuditPopover
      :visible="isPopoverVisible"
      :node="hoverNode"
      :status="hoverStatus"
      :audit-list="hoverAuditList"
      :x="popoverX"
      :y="popoverY"
      @mouseenter="cancelClosePopover"
      @mouseleave="scheduleClosePopover"
      @close="closePopover"
    >
      <template #default="slotScope">
        <slot name="audit-popover" v-bind="slotScope" />
      </template>
    </AtengFlowAuditPopover>

    <!-- 微型视口控制浮动工具条 -->
    <slot
      v-if="showMiniToolbar"
      name="mini-toolbar"
      :zoom-in="zoomIn"
      :zoom-out="zoomOut"
      :fit-view="fitView"
      :reset-zoom="resetZoom"
      :focus-active="focusActiveNode"
    >
      <AtengFlowMiniControls
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @fit-view="() => fitView()"
        @reset-zoom="resetZoom"
        @focus-active="() => focusActiveNode()"
      />
    </slot>
  </div>
</template>

<style scoped>
.at-flow-viewer {
  background-color: var(--at-flow-viewer-bg, #f8fafc);
  border: 1px solid var(--at-flow-viewer-border, #e2e8f0);
  border-radius: 8px;
  user-select: none;
}

/* 滚轮防冲突守卫提示条 */
.at-flow-wheel-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  pointer-events: none;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.at-flow-wheel-hint__key {
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
}

/* 淡入淡出过渡动画 */
.at-flow-fade-enter-active,
.at-flow-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.at-flow-fade-enter-from,
.at-flow-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>

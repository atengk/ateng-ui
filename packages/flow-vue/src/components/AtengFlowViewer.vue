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
import { registerPresetNodes } from '../presets';
import type { FlowSnapshotOptions } from '../snapshot';
import type {
  FlowNode,
  FlowEdge,
  FlowOptions,
  FlowStatusMap,
  ExecutionStatus,
  AuditRecord,
  AtengFlowViewerProps,
  AtengFlowViewerEmits,
  AtengFlowViewerSlots,
  AtengFlowViewerExpose,
  AtengFlowCanvasExpose,
} from '../types';
import { STATUS_TEXT_MAP, STATUS_BADGE_CLASS_MAP } from '../types';

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

// 悬停审计浮层响应式状态
const isPopoverVisible = ref(false);
const hoverNode = ref<FlowNode | null>(null);
const hoverStatus = ref<ExecutionStatus | undefined>(undefined);
const hoverAuditList = ref<AuditRecord[]>([]);
const popoverX = ref(0);
const popoverY = ref(0);
let popoverHideTimer: ReturnType<typeof setTimeout> | null = null;

// 滚轮守卫提示状态
const showWheelHint = ref(false);
let wheelHintTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 合并只读只看模式的 LogicFlow 配置项。
 */
const mergedCanvasOptions = computed<FlowOptions>(() => {
  return {
    ...props.options,
    isSilentMode: true,
    stopMoveGraph: false, // 允许拖动画布平移
    stopScrollGraph: true, // 阻止滚轮直接触发画布平移
    stopZoomGraph: true, // 缩放由 WheelZoomGuard 或微型工具栏受控触发
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
});

/**
 * 根容器样式。
 */
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

    // 尝试更新节点模型
    const nodeModel = lf.getNodeModelById(id);
    if (nodeModel) {
      lf.setProperties(id, {
        ...nodeModel.getProperties(),
        status,
        executionStatus: status,
        audit,
        ...extra,
      });
      continue;
    }

    // 尝试更新边模型
    const edgeModel = lf.getEdgeModelById(id);
    if (edgeModel) {
      lf.setProperties(id, {
        ...edgeModel.getProperties(),
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
 * 触发智能待办聚焦 SmartFocus。
 */
const focusActiveNode = (): void => {
  const lf = canvasRef.value?.getLf();
  if (!lf) return;

  // 1. 若显式指定了 focusNodeId，优先聚焦该节点
  if (props.focusNodeId) {
    focusNode(props.focusNodeId);
    return;
  }

  // 2. 否则自动寻找首个 processing 状态节点（优先 statusMap，回退图元自身 properties.status）
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
 * 视口自适应居中。
 */
const fitView = (verticalPadding?: number, horizontalPadding?: number): void => {
  canvasRef.value?.fitView(verticalPadding, horizontalPadding);
};

/**
 * 放大画布。
 */
const zoomIn = (): void => {
  canvasRef.value?.zoomIn();
};

/**
 * 缩小画布。
 */
const zoomOut = (): void => {
  canvasRef.value?.zoomOut();
};

/**
 * 还原视口缩放为 1:1。
 */
const resetZoom = (): void => {
  canvasRef.value?.resetZoom();
};

/**
 * 触发滚轮提示气泡。
 */
const triggerWheelHint = (): void => {
  showWheelHint.value = true;
  if (wheelHintTimer) {
    clearTimeout(wheelHintTimer);
  }
  wheelHintTimer = setTimeout(() => {
    showWheelHint.value = false;
    wheelHintTimer = null;
  }, 1500);
};

/**
 * 滚轮事件监听与 WheelZoomGuard 守卫。
 */
const handleWheel = (e: WheelEvent): void => {
  if (!props.wheelZoomGuard) return;

  // 按住 Ctrl (或 macOS 的 Command) 缩放画布
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else if (e.deltaY > 0) {
      zoomOut();
    }
  } else {
    // 未按 Ctrl 时，展示友好提示胶囊，允许外部正常滚动
    triggerWheelHint();
  }
};

/**
 * 悬停浮层显示逻辑。
 */
const showPopover = (node: FlowNode, e: MouseEvent): void => {
  const item = props.statusMap?.[node.id];
  const s = typeof item === 'string' ? item : item?.status;
  const status = s || (node.properties?.status as ExecutionStatus | undefined);

  const rawAudit =
    typeof item === 'object' && item?.audit
      ? item.audit
      : (node.properties?.audit as AuditRecord[] | undefined);
  const auditList = rawAudit ?? [];

  // 严格依据工单规约：仅当节点处于已办/待办等流转状态或拥有历史审计记录时弹出浮层
  if (!status && auditList.length === 0) {
    return;
  }

  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = null;
  }

  hoverNode.value = node;
  hoverStatus.value = status;
  hoverAuditList.value = auditList;

  // 计算相对外层容器的浮层坐标
  if (viewerRef.value) {
    const rect = viewerRef.value.getBoundingClientRect();
    popoverX.value = Math.max(10, Math.min(rect.width - 290, e.clientX - rect.left - 130));
    popoverY.value = Math.max(10, e.clientY - rect.top - 120);
  }

  isPopoverVisible.value = true;
  emit('node:hover', node, hoverAuditList.value, e);
};

/**
 * 悬停浮层关闭逻辑。
 */
const closePopover = (): void => {
  isPopoverVisible.value = false;
  hoverNode.value = null;
  hoverStatus.value = undefined;
  hoverAuditList.value = [];
  emit('node:hover', null, undefined);
};

/**
 * 延迟关闭浮层（允许鼠标移动到浮层卡片上）。
 */
const scheduleClosePopover = (): void => {
  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer);
  }
  popoverHideTimer = setTimeout(() => {
    closePopover();
    popoverHideTimer = null;
  }, 160);
};

/**
 * 鼠标移入浮层时取消防抖延时关闭定时器。
 */
const cancelClosePopover = (): void => {
  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = null;
  }
};

/**
 * 状态文案格式化（复用强类型常量映射表）。
 */
const formatStatusText = (status?: ExecutionStatus): string => {
  return status ? (STATUS_TEXT_MAP[status] ?? '待处理') : '待处理';
};

/**
 * 状态胶囊类名（复用强类型常量映射表）。
 */
const getStatusBadgeClass = (status?: ExecutionStatus): string => {
  return status ? (STATUS_BADGE_CLASS_MAP[status] ?? '') : '';
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

/**
 * 底层 LogicFlow 画布就绪回调。
 */
const handleCanvasReady = (lf: LogicFlow): void => {
  // 1. 注册核心预设节点与防呆规则
  registerPresetNodes(lf);

  // 2. 注册节点鼠标悬停与离开事件
  lf.on('node:mouseenter', (data: { data: FlowNode; e: MouseEvent }) => {
    showPopover(data.data, data.e);
  });

  lf.on('node:mouseleave', () => {
    scheduleClosePopover();
  });

  // 3. 画布数据渲染完成后应用状态字典与智能待办聚焦
  syncStatusAndFocus();

  emit('ready', lf);
};

const handleNodeClick = (node: FlowNode, event: MouseEvent): void => {
  emit('node:click', node, event);
};

const handleEdgeClick = (edge: FlowEdge, event: MouseEvent): void => {
  emit('edge:click', edge, event);
};

const handleBlankClick = (event: MouseEvent): void => {
  closePopover();
  emit('blank:click', event);
};

/**
 * 监听 statusMap 属性变化动态重刷状态。
 */
watch(
  () => props.statusMap,
  newMap => {
    if (newMap) {
      applyStatusMap(newMap);
    }
  },
  { deep: true },
);

/**
 * 监听数据模型变动重新应用状态。
 */
watch(
  () => props.modelValue,
  () => {
    syncStatusAndFocus();
  },
  { deep: true },
);

onUnmounted(() => {
  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = null;
  }
  if (wheelHintTimer) {
    clearTimeout(wheelHintTimer);
    wheelHintTimer = null;
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

    <!-- 鼠标悬停审计卡片浮层 -->
    <Transition name="at-flow-popover">
      <div
        v-if="isPopoverVisible && hoverNode"
        class="at-flow-audit-popover"
        :style="{ left: `${popoverX}px`, top: `${popoverY}px` }"
        @mouseenter="cancelClosePopover"
        @mouseleave="scheduleClosePopover"
      >
        <slot
          name="audit-popover"
          :node="hoverNode"
          :status="hoverStatus"
          :audit-list="hoverAuditList"
          :close="closePopover"
        >
          <!-- 默认高颜值审批审计记录卡片 -->
          <div class="at-flow-audit-card">
            <div class="at-flow-audit-card__header">
              <div class="at-flow-audit-card__title">{{ hoverNode.text || hoverNode.id }}</div>
              <span
                v-if="hoverStatus"
                class="at-flow-audit-badge"
                :class="getStatusBadgeClass(hoverStatus)"
              >
                {{ formatStatusText(hoverStatus) }}
              </span>
            </div>

            <!-- 审计历史列表 -->
            <div
              v-if="hoverAuditList && hoverAuditList.length > 0"
              class="at-flow-audit-card__list"
            >
              <div
                v-for="(audit, idx) in hoverAuditList"
                :key="audit.id || idx"
                class="at-flow-audit-item"
              >
                <div class="at-flow-audit-item__top">
                  <span class="at-flow-audit-item__operator">
                    <span class="at-flow-audit-avatar">{{
                      audit.avatar || audit.operator.slice(0, 1)
                    }}</span>
                    {{ audit.operator }}
                  </span>
                  <span v-if="audit.time" class="at-flow-audit-item__time">{{ audit.time }}</span>
                </div>
                <div v-if="audit.comment" class="at-flow-audit-item__comment">
                  “{{ audit.comment }}”
                </div>
                <div v-if="audit.duration" class="at-flow-audit-item__duration">
                  停留耗时: {{ audit.duration }}
                </div>
              </div>
            </div>

            <div v-else class="at-flow-audit-card__empty">暂无历史审批意见记录</div>
          </div>
        </slot>
      </div>
    </Transition>

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
      <div class="at-flow-mini-toolbar">
        <button class="at-flow-mini-btn" title="放大" @click="zoomIn">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
        <button class="at-flow-mini-btn" title="缩小" @click="zoomOut">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>
        <button class="at-flow-mini-btn" title="适应画布" @click="() => fitView()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path
              d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z"
            />
          </svg>
        </button>
        <button class="at-flow-mini-btn" title="还原 1:1" @click="resetZoom">
          <span style="font-size: 11px; font-weight: 600">1:1</span>
        </button>
        <button
          class="at-flow-mini-btn at-flow-mini-btn--focus"
          title="定位当前待办"
          @click="() => focusActiveNode()"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
            />
          </svg>
        </button>
      </div>
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
  font-weight: 600;
  font-size: 11px;
}

/* 悬停审计卡片浮层 */
.at-flow-audit-popover {
  position: absolute;
  z-index: 90;
  pointer-events: auto;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.12));
}

.at-flow-audit-card {
  width: 280px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  box-sizing: border-box;
}

.at-flow-audit-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.at-flow-audit-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-flow-audit-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.at-flow-audit-badge--success {
  background-color: #dcfce7;
  color: #15803d;
}

.at-flow-audit-badge--primary {
  background-color: #eff6ff;
  color: #2563eb;
}

.at-flow-audit-badge--danger {
  background-color: #fee2e2;
  color: #b91c1c;
}

.at-flow-audit-badge--warning {
  background-color: #fef3c7;
  color: #b45309;
}

.at-flow-audit-badge--muted {
  background-color: #f1f5f9;
  color: #64748b;
}

.at-flow-audit-card__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.at-flow-audit-item {
  background: #f8fafc;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.at-flow-audit-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.at-flow-audit-item__operator {
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-flow-audit-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.at-flow-audit-item__time {
  font-size: 11px;
  color: #94a3b8;
}

.at-flow-audit-item__comment {
  color: #475569;
  line-height: 1.4;
  font-style: italic;
}

.at-flow-audit-item__duration {
  font-size: 10px;
  color: #64748b;
}

.at-flow-audit-card__empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 8px 0;
}

/* 微型视口控制浮动工具条 */
.at-flow-mini-toolbar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 3px;
  gap: 2px;
  z-index: 50;
}

.at-flow-mini-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.at-flow-mini-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.at-flow-mini-btn--focus {
  color: #3b82f6;
}

.at-flow-mini-btn--focus:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

/* 过渡动画 */
.at-flow-fade-enter-active,
.at-flow-fade-leave-active {
  transition: opacity 0.2s ease;
}

.at-flow-fade-enter-from,
.at-flow-fade-leave-to {
  opacity: 0;
}

.at-flow-popover-enter-active,
.at-flow-popover-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.at-flow-popover-enter-from,
.at-flow-popover-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.96);
}
</style>

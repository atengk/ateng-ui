<script setup lang="ts">
/**
 * sample-flow-vue 自验展厅主页面。
 *
 * 验证 AtengFlowDesigner 设计态：三段式物料面板、DND 拖拽、四向磁吸正交折线与拓扑防呆连线。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  type FlowGraph,
  type FlowNode,
  type FlowEdge,
  type AtengFlowDesignerInstance,
  type BeforeConnectHook,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);

const graphData = ref<FlowGraph>({
  nodes: [
    {
      id: 'start-1',
      type: FlowNodeType.START,
      x: 120,
      y: 200,
      text: '开始',
    },
    {
      id: 'task-1',
      type: FlowNodeType.USER_TASK,
      x: 320,
      y: 200,
      text: '领导审批',
    },
    {
      id: 'end-1',
      type: FlowNodeType.END,
      x: 540,
      y: 200,
      text: '结束',
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'polyline',
      sourceNodeId: 'start-1',
      targetNodeId: 'task-1',
    },
    {
      id: 'edge-2',
      type: 'polyline',
      sourceNodeId: 'task-1',
      targetNodeId: 'end-1',
    },
  ],
});

const lastEvent = ref<string>('就绪：请从左侧物料库拖拽图元至画布，或尝试在节点间连线');
const alertMessage = ref<string>('');

// 自定义业务连线守卫示例：禁止从开始节点直接跨越连到结束节点
const beforeConnect: BeforeConnectHook = (source, target) => {
  if (source.type === FlowNodeType.START && target.type === FlowNodeType.END) {
    return '业务规则拦截：流程不可从【开始节点】直接流转至【结束节点】，必须经过审批！';
  }
  return true;
};

const handleReady = () => {
  lastEvent.value = 'LogicFlow 设计器已就绪，预设图元与防呆守卫已激活';
};

const handleNodeClick = (node: FlowNode) => {
  lastEvent.value = `选中节点: ${node.id} [${node.type}]`;
};

const handleEdgeClick = (edge: FlowEdge) => {
  lastEvent.value = `选中连线: ${edge.id} (${edge.sourceNodeId} ➔ ${edge.targetNodeId})`;
};

const handleConnectionNotAllowed = (data: unknown) => {
  const msg =
    (data as { msg?: string; message?: string })?.msg ||
    (data as { msg?: string; message?: string })?.message ||
    '连线不符合拓扑防呆规则！';
  alertMessage.value = `🚫 拦截警告: ${msg}`;
  lastEvent.value = `连线被拦截: ${msg}`;
  setTimeout(() => {
    alertMessage.value = '';
  }, 4000);
};

const handleZoomIn = () => designerRef.value?.zoomIn();
const handleZoomOut = () => designerRef.value?.zoomOut();
const handleResetZoom = () => designerRef.value?.resetZoom();
const handleFitView = () => designerRef.value?.fitView();
const handleClear = () => {
  designerRef.value?.clear();
  lastEvent.value = '画布已清空';
};

const handleReloadDefault = () => {
  designerRef.value?.render({
    nodes: [
      { id: 'start-1', type: FlowNodeType.START, x: 120, y: 200, text: '开始' },
      { id: 'task-1', type: FlowNodeType.USER_TASK, x: 320, y: 200, text: '领导审批' },
      { id: 'end-1', type: FlowNodeType.END, x: 540, y: 200, text: '结束' },
    ],
    edges: [
      { id: 'edge-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
      { id: 'edge-2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
    ],
  });
  lastEvent.value = '已恢复经典审批流初始数据';
};
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="sample-header__left">
        <h1>@atengk/flow-vue 自验展厅</h1>
        <p class="sample-desc">
          工单 #163 验证：设计态三段式物料面板（Stencil）、四向磁吸与防呆连线
        </p>
      </div>

      <!-- 拦截提示浮层 -->
      <transition name="fade">
        <div v-if="alertMessage" class="alert-banner">
          {{ alertMessage }}
        </div>
      </transition>
    </header>

    <div class="sample-toolbar">
      <button class="btn" @click="handleZoomIn">放大 (+)</button>
      <button class="btn" @click="handleZoomOut">缩小 (-)</button>
      <button class="btn" @click="handleResetZoom">1:1 重置</button>
      <button class="btn" @click="handleFitView">居中视口</button>
      <button class="btn btn--danger" @click="handleClear">清空画布</button>
      <button class="btn btn--primary" @click="handleReloadDefault">重载初始拓扑</button>
      <span class="status-tag">{{ lastEvent }}</span>
    </div>

    <main class="sample-designer-wrapper">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :before-connect="beforeConnect"
        width="100%"
        height="100%"
        @ready="handleReady"
        @node:click="handleNodeClick"
        @edge:click="handleEdgeClick"
        @connection:not-allowed="handleConnectionNotAllowed"
      />
    </main>

    <footer class="sample-footer">
      <span>当前节点数: {{ graphData.nodes.length }}</span>
      <span>当前连线数: {{ graphData.edges.length }}</span>
      <span class="footer-hint">
        💡 试一试防呆规则：1. 禁止自身连自己；2. 禁止连入开始节点；3. 禁止从结束节点连出；4.
        禁止开始直连结束
      </span>
    </footer>
  </div>
</template>

<style scoped>
.sample-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f8fafc;
}

.sample-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  position: relative;
}

.sample-header h1 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.sample-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.alert-banner {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #991b1b;
  background-color: #fee2e2;
  border: 1px solid #f87171;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);
}

.sample-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.btn--primary {
  background-color: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
}

.btn--primary:hover {
  background-color: #2563eb;
}

.btn--danger {
  background-color: #ef4444;
  border-color: #dc2626;
  color: #ffffff;
}

.btn--danger:hover {
  background-color: #dc2626;
}

.status-tag {
  margin-left: auto;
  font-size: 12px;
  color: #475569;
  background: #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.sample-designer-wrapper {
  flex: 1;
  min-height: 400px;
  background: #ffffff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sample-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.footer-hint {
  margin-left: auto;
  color: #3b82f6;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

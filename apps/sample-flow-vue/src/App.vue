<script setup lang="ts">
/**
 * sample-flow-vue 自验展厅主页面。
 *
 * 验证 AtengFlowCanvas 极简画布挂载、2节点相连渲染与视口操作。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref } from 'vue';
import { AtengFlowCanvas, type FlowGraph, type AtengFlowCanvasInstance } from '@atengk/flow-vue';

const canvasRef = ref<AtengFlowCanvasInstance | null>(null);

const graphData = ref<FlowGraph>({
  nodes: [
    {
      id: 'start-node',
      type: 'circle',
      x: 150,
      y: 200,
      text: '开始',
      properties: { role: 'initiator' },
    },
    {
      id: 'task-node',
      type: 'rect',
      x: 350,
      y: 200,
      text: '主管审批',
      properties: { role: 'manager' },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'polyline',
      sourceNodeId: 'start-node',
      targetNodeId: 'task-node',
      text: '提交',
    },
  ],
});

const lastEvent = ref<string>('等待交互...');

const handleReady = () => {
  lastEvent.value = 'LogicFlow 实例已就绪';
};

const handleNodeClick = (node: { id: string; text?: unknown }) => {
  lastEvent.value = `点击节点: ${node.id} (${JSON.stringify(node.text)})`;
};

const handleEdgeClick = (edge: { id: string }) => {
  lastEvent.value = `点击连线: ${edge.id}`;
};

const handleZoomIn = () => {
  canvasRef.value?.zoomIn();
};

const handleZoomOut = () => {
  canvasRef.value?.zoomOut();
};

const handleResetZoom = () => {
  canvasRef.value?.resetZoom();
};

const handleFitView = () => {
  canvasRef.value?.fitView();
};

const handleClear = () => {
  canvasRef.value?.clear();
  lastEvent.value = '画布已清空';
};

const handleReload = () => {
  canvasRef.value?.render({
    nodes: [
      { id: 'start-node', type: 'circle', x: 150, y: 200, text: '开始' },
      { id: 'task-node', type: 'rect', x: 350, y: 200, text: '主管审批' },
    ],
    edges: [
      {
        id: 'edge-1',
        type: 'polyline',
        sourceNodeId: 'start-node',
        targetNodeId: 'task-node',
        text: '提交',
      },
    ],
  });
  lastEvent.value = '已重新加载默认图谱';
};
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <h1>@atengk/flow-vue 自验展厅</h1>
      <p class="sample-desc">工单 #162 验证：模块工程底座与极简画布端到端贯通</p>
    </header>

    <div class="sample-toolbar">
      <button class="btn" @click="handleZoomIn">放大 (+)</button>
      <button class="btn" @click="handleZoomOut">缩小 (-)</button>
      <button class="btn" @click="handleResetZoom">1:1 重置</button>
      <button class="btn" @click="handleFitView">居中视口</button>
      <button class="btn btn--danger" @click="handleClear">清空</button>
      <button class="btn btn--primary" @click="handleReload">重载数据</button>
      <span class="status-tag">{{ lastEvent }}</span>
    </div>

    <main class="sample-canvas-wrapper">
      <AtengFlowCanvas
        ref="canvasRef"
        v-model="graphData"
        width="100%"
        height="100%"
        @ready="handleReady"
        @node:click="handleNodeClick"
        @edge:click="handleEdgeClick"
      />
    </main>

    <footer class="sample-footer">
      <span>当前节点数: {{ graphData.nodes.length }}</span>
      <span>当前连线数: {{ graphData.edges.length }}</span>
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
  margin-bottom: 12px;
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
  color: #64748b;
  background: #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.sample-canvas-wrapper {
  flex: 1;
  min-height: 400px;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sample-footer {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}
</style>

<script setup lang="ts">
/**
 * 场景一：基础流程编排设计器 (DesignerBasicScenario)。
 *
 * 验证 AtengFlowDesigner 工业级设计态：
 * 1. 顶部操作控制栏（AtengFlowToolbar）：视口缩放、Undo/Redo、DAG 自动分层排版、网格切换、防误触清空；
 * 2. 键盘快捷键体系：Delete 删除、Ctrl+Z/Y 撤销重做、Ctrl+C/V 复制粘贴；
 * 3. 三段式物料面板（AtengFlowStencil）、DND 图元拖拽、四向磁吸正交折线与拓扑防呆连线；
 * 4. 真实业务模型：企业费用报销审批流（发起 ➔ 财务初审 ➔ 金额网关分流 ➔ 总监终审 ➔ 办结归档）。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type FlowNode,
  type FlowEdge,
  type FlowElementData,
  type BeforeConnectHook,
  type AtengFlowDesignerInstance,
  type LayoutDirection,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);

const initialGraph: FlowGraph = {
  nodes: [
    {
      id: 'start-1',
      type: FlowNodeType.START,
      x: 100,
      y: 180,
      text: '发起报销',
      properties: {
        description: '员工发起费用报销申请',
        initiator: 'zhangsan',
      },
    },
    {
      id: 'task-1',
      type: FlowNodeType.USER_TASK,
      x: 300,
      y: 180,
      text: '财务初审',
      properties: {
        assigneeType: 'user',
        assignee: 'caiwu_01',
        approvalMode: 'single',
        dueHours: 24,
        description: '核实发票与报销明细真伪',
      },
    },
    {
      id: 'gateway-1',
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      x: 500,
      y: 180,
      text: '金额判断',
      properties: {
        description: '根据金额决定是否需要总监加签',
      },
    },
    {
      id: 'task-2',
      type: FlowNodeType.USER_TASK,
      x: 700,
      y: 90,
      text: '总监审批',
      properties: {
        assigneeType: 'role',
        assignee: 'role:finance_director',
        approvalMode: 'single',
        dueHours: 48,
        description: '大额支出终审',
      },
    },
    {
      id: 'end-1',
      type: FlowNodeType.END,
      x: 900,
      y: 180,
      text: '办结归档',
      properties: {
        description: '自动出纳打款与凭证归档',
      },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'polyline',
      sourceNodeId: 'start-1',
      targetNodeId: 'task-1',
      text: '提交',
    },
    {
      id: 'edge-2',
      type: 'polyline',
      sourceNodeId: 'task-1',
      targetNodeId: 'gateway-1',
      text: '初审通过',
    },
    {
      id: 'edge-3',
      type: 'polyline',
      sourceNodeId: 'gateway-1',
      sourceAnchorId: 'gateway-1_0',
      targetNodeId: 'task-2',
      targetAnchorId: 'task-2_3',
      text: '金额 ≥ 1万元',
      properties: {
        condition: '${amount >= 10000}',
        priority: 1,
      },
    },
    {
      id: 'edge-4',
      type: 'polyline',
      sourceNodeId: 'gateway-1',
      sourceAnchorId: 'gateway-1_1',
      targetNodeId: 'end-1',
      targetAnchorId: 'end-1_3',
      text: '金额 < 1万元',
      properties: {
        condition: '${amount < 10000}',
        priority: 2,
      },
    },
    {
      id: 'edge-5',
      type: 'polyline',
      sourceNodeId: 'task-2',
      targetNodeId: 'end-1',
      text: '同意打款',
    },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialGraph)));
const lastEvent = ref<string>(
  '就绪：可从左侧面板拖拽图元至画布，正交折线四向吸附连线，支持键盘快捷键',
);

const beforeConnect: BeforeConnectHook = (source, target) => {
  if (source.id === target.id) {
    lastEvent.value = `⚠️ 拓扑防呆拦截：禁止节点自环连线 [${source.id}]`;
    return false;
  }
  return true;
};

const handleReady = () => {
  lastEvent.value = '画布初始化就绪：LogicFlow 引擎加载完成';
};

const handleNodeClick = (node: FlowNode) => {
  lastEvent.value = `点击节点: ${node.text || node.id} (ID: ${node.id}, 类型: ${node.type})`;
};

const handleEdgeClick = (edge: FlowEdge) => {
  lastEvent.value = `点击连线: ${edge.text || edge.id} (${edge.sourceNodeId} ➔ ${edge.targetNodeId})`;
};

const handleBlankClick = () => {
  lastEvent.value = '点击空白区域：清除当前选中状态';
};

const handleSelectionChange = (element: FlowElementData | null) => {
  if (element) {
    lastEvent.value = `选区变更：选中元素 [${element.id}] (${element.type})`;
  } else {
    lastEvent.value = '选区变更：清空选中元素';
  }
};

const handleLayoutComplete = (data: { direction: LayoutDirection; graph: FlowGraph }) => {
  lastEvent.value = `DAG 自动排版完成：流向 [${data.direction}], 节点数 ${data.graph.nodes.length}`;
};

const handleConnectionNotAllowed = (data: unknown) => {
  lastEvent.value = `连线规则拦截：触发拓扑防呆守卫 (${JSON.stringify(data)})`;
};

const handleReset = () => {
  graphData.value = JSON.parse(JSON.stringify(initialGraph));
  lastEvent.value = '已重置为默认费用报销流程图谱';
};

onUnmounted(() => {
  // 严格执行确定性生命周期清理
  if (designerRef.value?.lf) {
    try {
      designerRef.value.lf.destroy();
    } catch {
      // 捕获已销毁异常
    }
  }
});
</script>

<template>
  <div class="scenario-designer">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">企业费用报销审批流程编排</span>
        <el-tag size="small" type="primary">业务驱动模型</el-tag>
        <span class="stat-badge">节点: {{ graphData.nodes.length }}</span>
        <span class="stat-badge">连线: {{ graphData.edges.length }}</span>
      </div>
      <div class="toolbar-right">
        <el-button size="small" @click="handleReset">重置默认图谱</el-button>
      </div>
    </div>

    <div class="scenario-event-bar">
      <span class="event-label">实时事件感知:</span>
      <span class="event-text">{{ lastEvent }}</span>
    </div>

    <div class="designer-canvas-box">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :stencil-groups="DEFAULT_STENCIL_GROUPS"
        :before-connect="beforeConnect"
        @ready="handleReady"
        @node:click="handleNodeClick"
        @edge:click="handleEdgeClick"
        @blank:click="handleBlankClick"
        @selection:change="handleSelectionChange"
        @layout:complete="handleLayoutComplete"
        @connection:not-allowed="handleConnectionNotAllowed"
      />
    </div>
  </div>
</template>

<style scoped>
.scenario-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 10px;
  box-sizing: border-box;
}

.scenario-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
}

.stat-badge {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

.scenario-event-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.event-label {
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.event-text {
  color: #2563eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.designer-canvas-box {
  flex: 1;
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}
</style>

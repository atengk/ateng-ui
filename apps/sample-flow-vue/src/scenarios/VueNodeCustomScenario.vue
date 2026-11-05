<script setup lang="ts">
/**
 * 场景四：Vue 3 SFC 自定义卡片节点与物料扩展 (VueNodeCustomScenario)。
 *
 * 验证 VueNodeRegistry 机制与 ApprovalCardNode 业务卡片：
 * 1. 声明式桥接 Vue 3 SFC 单文件组件为 LogicFlow 自定义卡片图元；
 * 2. 响应式 Props 双向透传：卡片内办理人、进度条、状态胶囊与快捷审批按钮原地响应；
 * 3. 物料面板无缝扩展：通过 stencilGroups 注入自定义卡片分组，支持从侧边栏 DND 拖拽至画布；
 * 4. 真实业务模型：法务合同联合会签流（起草 ➔ 研发审批卡片 ➔ 法务会签卡片 ➔ 财务复核卡片 ➔ 签章归档）。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  ApprovalCardNode,
  FlowNodeType,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type CustomVueNodeConfig,
  type StencilGroup,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);

const customVueNodes: CustomVueNodeConfig[] = [
  {
    type: 'approval-card',
    component: ApprovalCardNode,
    options: {
      width: 220,
      height: 126,
    },
  },
];

const stencilGroups: StencilGroup[] = [
  ...DEFAULT_STENCIL_GROUPS,
  {
    id: 'vue-sfc-nodes',
    title: '⭐ Vue 3 SFC 卡片图元',
    items: [
      {
        type: 'approval-card',
        label: '审批业务卡片',
        description: '带头像、状态胶囊、进度条与快捷审批按钮的 Vue 3 SFC 节点',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
        nodeConfig: {
          text: '新审批任务',
          properties: {
            assignee: '新审批人',
            status: 'processing',
            progress: 30,
          },
        },
      },
    ],
  },
];

const initialVueCardGraph: FlowGraph = {
  nodes: [
    {
      id: 'start-1',
      type: FlowNodeType.START,
      x: 100,
      y: 200,
      text: '起草合同',
      properties: { contractNo: 'HT-2026-088', amount: 580000 },
    },
    {
      id: 'card-tech',
      type: 'approval-card',
      x: 280,
      y: 200,
      text: '技术负责人审批',
      properties: {
        assignee: '王经理 (研发部)',
        status: 'completed',
        progress: 100,
      },
    },
    {
      id: 'card-legal',
      type: 'approval-card',
      x: 540,
      y: 120,
      text: '法务合规会签',
      properties: {
        assignee: '李法务 (法务部)',
        status: 'processing',
        progress: 65,
      },
    },
    {
      id: 'card-finance',
      type: 'approval-card',
      x: 540,
      y: 280,
      text: '财务预算复核',
      properties: {
        assignee: '赵总监 (财务部)',
        status: 'pending',
        progress: 0,
      },
    },
    {
      id: 'end-1',
      type: FlowNodeType.END,
      x: 800,
      y: 200,
      text: '盖章生效',
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'polyline',
      sourceNodeId: 'start-1',
      targetNodeId: 'card-tech',
      text: '提交合同',
    },
    {
      id: 'edge-2',
      type: 'polyline',
      sourceNodeId: 'card-tech',
      targetNodeId: 'card-legal',
      text: '送法务',
    },
    {
      id: 'edge-3',
      type: 'polyline',
      sourceNodeId: 'card-tech',
      targetNodeId: 'card-finance',
      text: '送财务',
    },
    {
      id: 'edge-4',
      type: 'polyline',
      sourceNodeId: 'card-legal',
      targetNodeId: 'end-1',
      text: '法务通过',
    },
    {
      id: 'edge-5',
      type: 'polyline',
      sourceNodeId: 'card-finance',
      targetNodeId: 'end-1',
      text: '财务通过',
    },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialVueCardGraph)));
const actionLog = ref<string>(
  '就绪：支持直接在审批卡片内点击审批/驳回按钮，或从左侧第四组拖入新卡片',
);

const handleReset = () => {
  graphData.value = JSON.parse(JSON.stringify(initialVueCardGraph));
  actionLog.value = '已重置合同会签卡片图谱';
};

onUnmounted(() => {
  if (designerRef.value?.lf) {
    try {
      designerRef.value.lf.destroy();
    } catch {
      // 捕获清理异常
    }
  }
});
</script>

<template>
  <div class="scenario-vue-node">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">Vue 3 SFC 自定义卡片节点与物料扩展展厅</span>
        <el-tag size="small" type="primary">VueNodeRegistry 机制</el-tag>
        <el-tag size="small" type="success">ApprovalCardNode 业务卡片</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button size="small" @click="handleReset">重置卡片拓扑</el-button>
      </div>
    </div>

    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span>
        提示：左侧物料面板已动态扩展“⭐ Vue 3 SFC
        卡片图元”分组。您可以直接从左侧拖拽“审批业务卡片”至画布中，
        也可以在已有卡片内部直接点击审批交互或微调进度条，响应式 Props 将原地双向回写至流程图谱。
      </span>
    </div>

    <div class="action-notice">
      <span class="notice-label">卡片动态事件:</span>
      <span class="notice-val">{{ actionLog }}</span>
    </div>

    <div class="designer-canvas-box">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :custom-vue-nodes="customVueNodes"
        :stencil-groups="stencilGroups"
      />
    </div>
  </div>
</template>

<style scoped>
.scenario-vue-node {
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

.info-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #fdf4ff;
  border: 1px solid #f5d0fe;
  color: #86198f;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.tip-icon {
  font-size: 14px;
}

.action-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.notice-label {
  font-weight: 600;
  color: #475569;
}

.notice-val {
  color: #7c3aed;
}

.designer-canvas-box {
  flex: 1;
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}
</style>

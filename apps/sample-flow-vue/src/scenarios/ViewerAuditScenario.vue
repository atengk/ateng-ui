<script setup lang="ts">
/**
 * 场景三：工单运行态流转追踪器 (ViewerAuditScenario)。
 *
 * 验证 AtengFlowViewer 工业级能力：
 * 1. 严格只读流转呈现：专用于工单详情与审批历史展示，杜绝非授权拖拽与连线篡改；
 * 2. 节点五态高亮与呼吸流动虚线：COMPLETED（绿色）、PROCESSING（蓝色流动）、REJECTED（红色）、PENDING（灰色待办）、TERMINATED（深灰）；
 * 3. 悬停审批审计卡片与 #audit-popover 插槽反转：原生悬停浮层 vs Element Plus 高级时间轴卡片双模切换；
 * 4. 视口人体工学：SmartFocus 智能视口对待办节点平滑定位，WheelZoomGuard 页面滚轮防冲突守卫；
 * 5. 动态进度模拟控制条：一键模拟不同审批流转阶段（正常推进、异常驳回、终审办结）。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed, onUnmounted } from 'vue';
import {
  AtengFlowViewer,
  FlowNodeType,
  FlowExecutionStatus,
  type FlowGraph,
  type FlowStatusMap,
  type AtengFlowViewerInstance,
} from '@atengk/flow-vue';

const viewerRef = ref<AtengFlowViewerInstance | null>(null);
const currentStep = ref<number>(2);
const useCustomAuditPopover = ref<boolean>(true);

const viewerGraph = ref<FlowGraph>({
  nodes: [
    {
      id: 'start-1',
      type: FlowNodeType.START,
      x: 100,
      y: 200,
      text: '发起申请',
      properties: { applicant: '张三 (研发部)', applyTime: '2026-11-05 09:30' },
    },
    {
      id: 'task-leader',
      type: FlowNodeType.USER_TASK,
      x: 280,
      y: 200,
      text: '部门主管审批',
      properties: { assignee: '李主管', dueHours: 24 },
    },
    {
      id: 'task-finance',
      type: FlowNodeType.USER_TASK,
      x: 480,
      y: 200,
      text: '财务初审',
      properties: { assignee: '王财务', dueHours: 24 },
    },
    {
      id: 'task-cfo',
      type: FlowNodeType.USER_TASK,
      x: 680,
      y: 200,
      text: '财务总监终审',
      properties: { assignee: '赵总监', dueHours: 48 },
    },
    {
      id: 'end-1',
      type: FlowNodeType.END,
      x: 880,
      y: 200,
      text: '办结打款',
      properties: { cashier: '钱出纳' },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'polyline',
      sourceNodeId: 'start-1',
      targetNodeId: 'task-leader',
      text: '已提交',
    },
    {
      id: 'edge-2',
      type: 'polyline',
      sourceNodeId: 'task-leader',
      targetNodeId: 'task-finance',
      text: '主管同意',
    },
    {
      id: 'edge-3',
      type: 'polyline',
      sourceNodeId: 'task-finance',
      targetNodeId: 'task-cfo',
      text: '初审通过',
    },
    {
      id: 'edge-4',
      type: 'polyline',
      sourceNodeId: 'task-cfo',
      targetNodeId: 'end-1',
      text: '同意打款',
    },
  ],
});

const statusMap = computed<FlowStatusMap>(() => {
  if (currentStep.value === 1) {
    return {
      'start-1': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '张三',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 09:30:15',
            comment: '提交 2026 年度技术攻坚出差差旅报销申请。',
          },
        ],
      },
      'edge-1': FlowExecutionStatus.PROCESSING,
      'task-leader': {
        status: FlowExecutionStatus.PROCESSING,
        audit: [
          {
            operator: '李主管',
            status: FlowExecutionStatus.PROCESSING,
            time: '2026-11-05 10:00:00',
            comment: '等待部门主管确认日程。',
          },
        ],
      },
      'edge-2': FlowExecutionStatus.PENDING,
      'task-finance': FlowExecutionStatus.PENDING,
      'edge-3': FlowExecutionStatus.PENDING,
      'task-cfo': FlowExecutionStatus.PENDING,
      'edge-4': FlowExecutionStatus.PENDING,
      'end-1': FlowExecutionStatus.PENDING,
    };
  }

  if (currentStep.value === 2) {
    return {
      'start-1': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '张三',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 09:30:15',
            comment: '提交费用报销申请。',
          },
        ],
      },
      'edge-1': FlowExecutionStatus.COMPLETED,
      'task-leader': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '李主管',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 10:15:20',
            comment: '出差行程真实有效，同意报销并报财务初审。',
          },
        ],
      },
      'edge-2': FlowExecutionStatus.COMPLETED,
      'task-finance': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '王财务',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 11:20:00',
            comment: '核验纸质发票与电子发票无重复报销，准予上报。',
          },
        ],
      },
      'edge-3': FlowExecutionStatus.PROCESSING,
      'task-cfo': {
        status: FlowExecutionStatus.PROCESSING,
        audit: [
          {
            operator: '赵总监',
            status: FlowExecutionStatus.PROCESSING,
            time: '2026-11-05 11:30:00',
            comment: '待总监审批：金额超过 2 万元需终审。',
          },
        ],
      },
      'edge-4': FlowExecutionStatus.PENDING,
      'end-1': FlowExecutionStatus.PENDING,
    };
  }

  if (currentStep.value === 3) {
    // 模拟驳回分支
    return {
      'start-1': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '张三',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 09:30:15',
            comment: '提交费用报销申请。',
          },
        ],
      },
      'edge-1': FlowExecutionStatus.COMPLETED,
      'task-leader': {
        status: FlowExecutionStatus.COMPLETED,
        audit: [
          {
            operator: '李主管',
            status: FlowExecutionStatus.COMPLETED,
            time: '2026-11-05 10:15:20',
            comment: '同意报销。',
          },
        ],
      },
      'edge-2': FlowExecutionStatus.COMPLETED,
      'task-finance': {
        status: FlowExecutionStatus.REJECTED,
        audit: [
          {
            operator: '王财务',
            status: FlowExecutionStatus.REJECTED,
            time: '2026-11-05 11:20:00',
            comment: '发票抬头税号填写有误，退回申请人重新开具发票后重提！',
          },
        ],
      },
      'edge-3': FlowExecutionStatus.PENDING,
      'task-cfo': FlowExecutionStatus.PENDING,
      'edge-4': FlowExecutionStatus.PENDING,
      'end-1': FlowExecutionStatus.PENDING,
    };
  }

  // 步骤 4：全流程办结
  return {
    'start-1': FlowExecutionStatus.COMPLETED,
    'edge-1': FlowExecutionStatus.COMPLETED,
    'task-leader': {
      status: FlowExecutionStatus.COMPLETED,
      audit: [
        {
          operator: '李主管',
          status: FlowExecutionStatus.COMPLETED,
          time: '2026-11-05 10:15:20',
          comment: '同意报销。',
        },
      ],
    },
    'edge-2': FlowExecutionStatus.COMPLETED,
    'task-finance': {
      status: FlowExecutionStatus.COMPLETED,
      audit: [
        {
          operator: '王财务',
          status: FlowExecutionStatus.COMPLETED,
          time: '2026-11-05 11:20:00',
          comment: '发票合规。',
        },
      ],
    },
    'edge-3': FlowExecutionStatus.COMPLETED,
    'task-cfo': {
      status: FlowExecutionStatus.COMPLETED,
      audit: [
        {
          operator: '赵总监',
          status: FlowExecutionStatus.COMPLETED,
          time: '2026-11-05 14:00:00',
          comment: '已核实支出预算，同意打款。',
        },
      ],
    },
    'edge-4': FlowExecutionStatus.COMPLETED,
    'end-1': {
      status: FlowExecutionStatus.COMPLETED,
      audit: [
        {
          operator: '钱出纳',
          status: FlowExecutionStatus.COMPLETED,
          time: '2026-11-05 16:30:00',
          comment: '网银打款完毕，工单自动归档结案。',
        },
      ],
    },
  };
});

const handleSmartFocus = () => {
  if (viewerRef.value) {
    viewerRef.value.focusActiveNode();
  }
};

const handleFitView = () => {
  if (viewerRef.value) {
    viewerRef.value.fitView();
  }
};

onUnmounted(() => {
  if (viewerRef.value?.lf) {
    try {
      viewerRef.value.lf.destroy();
    } catch {
      // 销毁异常守卫
    }
  }
});
</script>

<template>
  <div class="scenario-viewer">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">企业工单运行态流转追踪展厅</span>
        <el-tag size="small" type="warning">运行态严格只读</el-tag>
        <el-tag size="small" type="info">五态高亮 + 动态流动</el-tag>
      </div>
      <div class="toolbar-right">
        <span class="ctrl-label">流转进度模拟:</span>
        <el-radio-group v-model="currentStep" size="small">
          <el-radio-button :value="1">阶段 1: 部门初审中</el-radio-button>
          <el-radio-button :value="2">阶段 2: 总监审批中 (流动)</el-radio-button>
          <el-radio-button :value="3">阶段 3: 模拟财务驳回</el-radio-button>
          <el-radio-button :value="4">阶段 4: 终审全景办结</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="scenario-action-bar">
      <div class="action-left">
        <span class="action-label">审计浮层形态:</span>
        <el-radio-group v-model="useCustomAuditPopover" size="small">
          <el-radio-button :value="true">⭐ Element Plus 时间轴插槽</el-radio-button>
          <el-radio-button :value="false">原生轻量悬停浮层</el-radio-button>
        </el-radio-group>
      </div>
      <div class="action-right">
        <el-button size="small" type="primary" plain @click="handleSmartFocus">
          🎯 SmartFocus 待办定位
        </el-button>
        <el-button size="small" @click="handleFitView">🔍 全图自适应居中</el-button>
      </div>
    </div>

    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span>
        提示：鼠标悬停在任意节点（如“部门主管审批”或“财务初审”）上，将弹出悬停审计履历卡片。绿色代表已完成、蓝色虚线流动代表流转中、红色代表已驳回。
        运行态已内置 WheelZoomGuard（需按住 Ctrl 滚动才触发缩放），防止与主页面滚动冲突。
      </span>
    </div>

    <div class="viewer-canvas-box">
      <AtengFlowViewer
        ref="viewerRef"
        v-model="viewerGraph"
        :status-map="statusMap"
        :focus-active-node="true"
        :wheel-zoom-guard="true"
        :show-mini-toolbar="true"
      >
        <!-- 使用 Element Plus 时间轴自定义悬停审计浮层 (#audit-popover) -->
        <template v-if="useCustomAuditPopover" #audit-popover="{ node, audit }">
          <div class="custom-audit-card">
            <div class="card-header">
              <span class="node-title">{{ node.text || node.id }}</span>
              <el-tag
                size="small"
                :type="
                  audit.status === 'completed'
                    ? 'success'
                    : audit.status === 'processing'
                      ? 'primary'
                      : audit.status === 'rejected'
                        ? 'danger'
                        : 'info'
                "
              >
                {{
                  audit.status === 'completed'
                    ? '已通过'
                    : audit.status === 'processing'
                      ? '流转中'
                      : audit.status === 'rejected'
                        ? '已驳回'
                        : '待处理'
                }}
              </el-tag>
            </div>

            <div class="card-body">
              <div class="audit-row">
                <span class="row-label">办理人员:</span>
                <span class="row-val font-bold">{{ audit.operator || '系统自动指派' }}</span>
              </div>
              <div v-if="audit.time" class="audit-row">
                <span class="row-label">处理时间:</span>
                <span class="row-val font-mono">{{ audit.time }}</span>
              </div>
              <div v-if="audit.comment" class="audit-row comment-row">
                <span class="row-label">审批意见:</span>
                <p class="comment-text">{{ audit.comment }}</p>
              </div>
            </div>
          </div>
        </template>
      </AtengFlowViewer>
    </div>
  </div>
</template>

<style scoped>
.scenario-viewer {
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

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label,
.action-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.scenario-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.action-left,
.action-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.tip-icon {
  font-size: 14px;
}

.viewer-canvas-box {
  flex: 1;
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.custom-audit-card {
  min-width: 260px;
  max-width: 340px;
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 8px;
}

.node-title {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.audit-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.row-label {
  color: #64748b;
  white-space: nowrap;
}

.row-val {
  color: #1e293b;
}

.font-bold {
  font-weight: 600;
}

.font-mono {
  font-family: monospace;
}

.comment-row {
  flex-direction: column;
  background-color: #f8fafc;
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 2px;
}

.comment-text {
  margin: 2px 0 0;
  color: #334155;
  line-height: 1.5;
}
</style>

<script setup lang="ts">
/**
 * 场景五：静态拓扑校验与 DAG 自动分层排版 (ValidatorLayoutScenario)。
 *
 * 验证 FlowValidator 与 AutoLayoutEngine 工业级图论算法：
 * 1. 静态图论校验引擎：起止唯一性、连通孤岛、排他网关分支与条件、死循环闭环检测；
 * 2. 异常图元红色脉冲呼吸高亮动画与结构化诊断错误实体；
 * 3. DAG 分层规整排版引擎：基于拓扑排序计算 Rank 深度与同层偏移，支持水平（LR）与垂直（TB）平滑缓动重构。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  FlowValidator,
  AutoLayoutEngine,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type FlowValidationResult,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const currentPreset = ref<string>('valid');
const validationResult = ref<FlowValidationResult | null>(null);
const isDrawerVisible = ref<boolean>(false);

const presetGraphs: Record<string, { title: string; graph: FlowGraph }> = {
  valid: {
    title: '合法规范审批流程 (起止完整/网关分支健全)',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 100, y: 180, text: '开始' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 260, y: 180, text: '部门初审' },
        { id: 'gateway-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 440, y: 180, text: '金额网关' },
        { id: 'task-cfo', type: FlowNodeType.USER_TASK, x: 620, y: 100, text: '总监审批' },
        { id: 'end-1', type: FlowNodeType.END, x: 800, y: 180, text: '结束' },
      ],
      edges: [
        { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
        { id: 'e2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'gateway-1' },
        {
          id: 'e3',
          type: 'polyline',
          sourceNodeId: 'gateway-1',
          targetNodeId: 'task-cfo',
          text: '金额 ≥ 1万',
          properties: { condition: '${amount >= 10000}' },
        },
        {
          id: 'e4',
          type: 'polyline',
          sourceNodeId: 'gateway-1',
          targetNodeId: 'end-1',
          text: '金额 < 1万',
          properties: { condition: '${amount < 10000}' },
        },
        { id: 'e5', type: 'polyline', sourceNodeId: 'task-cfo', targetNodeId: 'end-1' },
      ],
    },
  },
  'isolated-node': {
    title: '异常注入 1: 包含孤岛无关联节点',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 100, y: 180, text: '开始' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 280, y: 180, text: '部门初审' },
        { id: 'end-1', type: FlowNodeType.END, x: 480, y: 180, text: '结束' },
        { id: 'task-ghost', type: FlowNodeType.USER_TASK, x: 280, y: 320, text: '孤岛漂浮节点' },
      ],
      edges: [
        { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
        { id: 'e2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
      ],
    },
  },
  'gateway-condition-missing': {
    title: '异常注入 2: 排他网关缺少分支条件',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 100, y: 180, text: '开始' },
        { id: 'gateway-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 280, y: 180, text: '决策网关' },
        { id: 'task-a', type: FlowNodeType.USER_TASK, x: 460, y: 100, text: '分支 A' },
        { id: 'task-b', type: FlowNodeType.USER_TASK, x: 460, y: 260, text: '分支 B' },
        { id: 'end-1', type: FlowNodeType.END, x: 640, y: 180, text: '结束' },
      ],
      edges: [
        { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'gateway-1' },
        { id: 'e2', type: 'polyline', sourceNodeId: 'gateway-1', targetNodeId: 'task-a' },
        { id: 'e3', type: 'polyline', sourceNodeId: 'gateway-1', targetNodeId: 'task-b' },
        { id: 'e4', type: 'polyline', sourceNodeId: 'task-a', targetNodeId: 'end-1' },
        { id: 'e5', type: 'polyline', sourceNodeId: 'task-b', targetNodeId: 'end-1' },
      ],
    },
  },
  'deadlock-cycle': {
    title: '异常注入 3: 循环嵌套死循环且无出口',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 100, y: 180, text: '开始' },
        { id: 'task-loop-a', type: FlowNodeType.USER_TASK, x: 300, y: 180, text: '死锁节点 A' },
        { id: 'task-loop-b', type: FlowNodeType.USER_TASK, x: 500, y: 180, text: '死锁节点 B' },
      ],
      edges: [
        { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-loop-a' },
        { id: 'e2', type: 'polyline', sourceNodeId: 'task-loop-a', targetNodeId: 'task-loop-b' },
        { id: 'e3', type: 'polyline', sourceNodeId: 'task-loop-b', targetNodeId: 'task-loop-a' },
      ],
    },
  },
};

const graphData = ref<FlowGraph>(
  JSON.parse(JSON.stringify(presetGraphs[currentPreset.value]?.graph || presetGraphs.valid?.graph)),
);

const handlePresetChange = (val: string) => {
  const target = presetGraphs[val];
  if (target) {
    clearValidationHighlights();
    graphData.value = JSON.parse(JSON.stringify(target.graph));
    validationResult.value = null;
  }
};

const clearValidationHighlights = () => {
  const lf = designerRef.value?.lf;
  if (!lf) return;
  for (const node of graphData.value.nodes) {
    try {
      const el = lf.graphModel.getNodeModelById(node.id);
      if (el) {
        // 清理红色呼吸边框样式类
        el.setProperties({ ...el.properties, _error: false });
      }
    } catch {
      // 容错处理
    }
  }
};

const handleRunValidate = () => {
  clearValidationHighlights();
  const res = FlowValidator.validate(graphData.value);
  validationResult.value = res;
  isDrawerVisible.value = true;

  const lf = designerRef.value?.lf;
  if (lf && !res.valid) {
    // 对涉事节点进行呼吸发光高亮
    for (const err of res.errors) {
      if (err.nodeIds && err.nodeIds.length > 0) {
        for (const nid of err.nodeIds) {
          try {
            const el = lf.graphModel.getNodeModelById(nid);
            if (el) {
              el.setProperties({ ...el.properties, _error: true });
            }
          } catch {
            // 容错处理
          }
        }
      }
    }
  }
};

const handleFocusErrorNode = (nodeId: string) => {
  const lf = designerRef.value?.lf;
  if (lf) {
    lf.focusOn({ id: nodeId });
  }
};

const handleRunLayout = (direction: 'LR' | 'TB') => {
  const lf = designerRef.value?.lf;
  if (!lf) return;
  AutoLayoutEngine.animateLayout(lf, graphData.value, {
    direction,
    nodeSpacing: direction === 'LR' ? 100 : 80,
    rankSpacing: direction === 'LR' ? 140 : 120,
    duration: 400,
  });
};

onUnmounted(() => {
  if (designerRef.value?.lf) {
    try {
      designerRef.value.lf.destroy();
    } catch {
      // 销毁清理
    }
  }
});
</script>

<template>
  <div class="scenario-validator-layout">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">静态图论校验与 DAG 自动分层排版展厅</span>
        <el-tag size="small" type="danger">FlowValidator 5大图论规则</el-tag>
        <el-tag size="small" type="primary">AutoLayoutEngine DAG 排版</el-tag>
      </div>
      <div class="toolbar-right">
        <span class="select-label">拓扑预设:</span>
        <el-select
          v-model="currentPreset"
          size="small"
          style="width: 260px"
          @change="handlePresetChange"
        >
          <el-option
            v-for="(item, key) in presetGraphs"
            :key="key"
            :label="item.title"
            :value="key"
          />
        </el-select>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-group">
        <el-button type="danger" size="small" @click="handleRunValidate">
          🛡️ 执行拓扑静态校验
        </el-button>
        <el-button size="small" @click="clearValidationHighlights">清空高亮标记</el-button>
        <el-button
          v-if="validationResult && !validationResult.valid"
          type="warning"
          plain
          size="small"
          @click="isDrawerVisible = true"
        >
          查看诊断报告 ({{ validationResult.errors.length }} 项缺陷)
        </el-button>
      </div>
      <div class="action-group">
        <el-button type="primary" size="small" @click="handleRunLayout('LR')">
          ⚡ DAG 水平分层排版 (LR)
        </el-button>
        <el-button type="primary" plain size="small" @click="handleRunLayout('TB')">
          ⚡ DAG 垂直分层排版 (TB)
        </el-button>
      </div>
    </div>

    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span>
        提示：选择上方“异常注入”预设后点击“执行拓扑静态校验”，算法将快速识别图论违规，并在画布上直接触发红色脉冲发光高亮（@keyframes
        at-flow-pulse-error）。 若图谱布局混乱，可点击“DAG
        分层排版”一键基于有向无环图深度算法规整对齐。
      </span>
    </div>

    <div class="designer-canvas-box">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :stencil-groups="DEFAULT_STENCIL_GROUPS"
      />
    </div>

    <!-- 静态校验诊断抽屉 -->
    <el-drawer v-model="isDrawerVisible" title="流程图拓扑静态校验诊断报告" size="380px">
      <div v-if="validationResult" class="drawer-content">
        <div class="status-banner">
          <el-alert
            :title="
              validationResult.valid
                ? '拓扑结构校验通过：符合图论刚性规则'
                : '拓扑结构存在缺陷：已阻断准出'
            "
            :type="validationResult.valid ? 'success' : 'error'"
            :closable="false"
            show-icon
          />
        </div>

        <div v-if="!validationResult.valid" class="error-list">
          <div v-for="(err, idx) in validationResult.errors" :key="idx" class="error-item">
            <div class="error-header">
              <el-tag size="small" :type="err.level === 'error' ? 'danger' : 'warning'">
                {{ err.ruleCode }}
              </el-tag>
              <span class="error-level">{{ err.level.toUpperCase() }}</span>
            </div>
            <p class="error-msg">{{ err.message }}</p>
            <div v-if="err.nodeIds && err.nodeIds.length" class="error-nodes">
              <span class="nodes-label">涉事节点:</span>
              <el-button
                v-for="nid in err.nodeIds"
                :key="nid"
                link
                type="primary"
                size="small"
                @click="handleFocusErrorNode(nid)"
              >
                {{ nid }} 🎯
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.scenario-validator-layout {
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

.select-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.tip-icon {
  font-size: 14px;
}

.designer-canvas-box {
  flex: 1;
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-item {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
  border-radius: 6px;
  padding: 10px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-level {
  font-size: 11px;
  font-weight: 700;
  color: #dc2626;
}

.error-msg {
  font-size: 12px;
  color: #374151;
  margin: 6px 0;
  line-height: 1.5;
}

.error-nodes {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.nodes-label {
  color: #6b7280;
}
</style>

<script setup lang="ts">
/**
 * 场景六：BPMN 2.0 工业标准协议双向转译 (BpmnAdapterScenario)。
 *
 * 验证 BpmnAdapter 工业级协议转换能力：
 * 1. FlowGraph ➔ 标准 BPMN 2.0 XML 序列化：输出符合 Flowable / Camunda 规范的 XML 格式；
 * 2. 几何拓扑保真：精确转换 LogicFlow 中心坐标与 BPMNDiagram (Bounds / Waypoint) 坐标；
 * 3. 扩展元数据保留：办理人 (flowable:assignee)、审批模式、条件表达式与业务属性；
 * 4. 反序列化导入：解析外部标准 BPMN 2.0 XML 字符串并无损还原至画布。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onMounted, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  BpmnAdapter,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const bpmnProcessName = ref<string>('企业差旅费用报销标准审批流');
const bpmnXmlContent = ref<string>('');
const isXmlDrawerOpen = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const initialGraph: FlowGraph = {
  nodes: [
    {
      id: 'start-event-1',
      type: FlowNodeType.START,
      x: 120,
      y: 200,
      text: '员工提交差旅申请',
      properties: { initiator: 'apply_user' },
    },
    {
      id: 'task-leader-review',
      type: FlowNodeType.USER_TASK,
      x: 320,
      y: 200,
      text: '直属领导审批',
      properties: {
        assigneeType: 'user',
        assignee: 'leader_chen',
        approvalMode: 'single',
      },
    },
    {
      id: 'gateway-budget',
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      x: 520,
      y: 200,
      text: '预算额度网关',
      properties: { description: '金额分流判断' },
    },
    {
      id: 'task-cfo-approve',
      type: FlowNodeType.USER_TASK,
      x: 720,
      y: 120,
      text: '财务总监终审',
      properties: {
        assigneeType: 'role',
        assignee: 'role:cfo',
        approvalMode: 'single',
      },
    },
    {
      id: 'end-event-1',
      type: FlowNodeType.END,
      x: 920,
      y: 200,
      text: '流程办结归档',
    },
  ],
  edges: [
    {
      id: 'flow-1',
      type: 'polyline',
      sourceNodeId: 'start-event-1',
      targetNodeId: 'task-leader-review',
      text: '提交',
    },
    {
      id: 'flow-2',
      type: 'polyline',
      sourceNodeId: 'task-leader-review',
      targetNodeId: 'gateway-budget',
      text: '领导同意',
    },
    {
      id: 'flow-3',
      type: 'polyline',
      sourceNodeId: 'gateway-budget',
      targetNodeId: 'task-cfo-approve',
      text: '差旅费 ≥ 5,000 元',
      properties: { condition: '${amount >= 5000}' },
    },
    {
      id: 'flow-4',
      type: 'polyline',
      sourceNodeId: 'gateway-budget',
      targetNodeId: 'end-event-1',
      text: '差旅费 < 5,000 元',
      properties: { condition: '${amount < 5000}' },
    },
    {
      id: 'flow-5',
      type: 'polyline',
      sourceNodeId: 'task-cfo-approve',
      targetNodeId: 'end-event-1',
      text: '总监批复通过',
    },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialGraph)));

const handleExportXml = () => {
  bpmnXmlContent.value = BpmnAdapter.toBpmnXml(graphData.value, {
    processId: 'Process_Expense_Reimbursement',
    processName: bpmnProcessName.value,
  });
  isXmlDrawerOpen.value = true;
};

const handleApplyXmlToGraph = () => {
  if (!bpmnXmlContent.value.trim()) return;
  try {
    const parsedGraph = BpmnAdapter.fromBpmnXml(bpmnXmlContent.value);
    graphData.value = parsedGraph;
    isXmlDrawerOpen.value = false;
  } catch (err) {
    alert(`BPMN XML 解析失败: ${String(err)}`);
  }
};

const handleDownloadXml = () => {
  const content = bpmnXmlContent.value || BpmnAdapter.toBpmnXml(graphData.value);
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bpmnProcessName.value || 'process'}.bpmn20.xml`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleTriggerUpload = () => {
  fileInputRef.value?.click();
};

const handleFileUploaded = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target?.result as string;
    if (text) {
      try {
        const parsed = BpmnAdapter.fromBpmnXml(text);
        graphData.value = parsed;
        bpmnXmlContent.value = text;
      } catch (err) {
        alert(`BPMN 文件导入解析失败: ${String(err)}`);
      }
    }
  };
  reader.readAsText(file);
  target.value = '';
};

onMounted(() => {
  bpmnXmlContent.value = BpmnAdapter.toBpmnXml(graphData.value, {
    processId: 'Process_Expense_Reimbursement',
    processName: bpmnProcessName.value,
  });
});

onUnmounted(() => {
  if (designerRef.value?.lf) {
    try {
      designerRef.value.lf.destroy();
    } catch {
      // 容错
    }
  }
});
</script>

<template>
  <div class="scenario-bpmn">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">BPMN 2.0 工业标准协议双向转译展厅</span>
        <el-tag size="small" type="success">Flowable / Camunda 兼容</el-tag>
        <el-tag size="small" type="primary">纯原生 TypeScript 转译</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" size="small" @click="handleExportXml">
          📄 导出 BPMN 2.0 XML
        </el-button>
        <el-button size="small" @click="handleTriggerUpload">📥 导入外部 .bpmn 文件</el-button>
        <el-button size="small" @click="handleDownloadXml">💾 下载当前 BPMN 文件</el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".bpmn,.xml"
          style="display: none"
          @change="handleFileUploaded"
        />
      </div>
    </div>

    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span>
        提示：BpmnAdapter 原生支持将前端 FlowGraph 序列化为符合 Flowable / Camunda 工业级规范的标准
        BPMN 2.0 XML， 保留 Bounds 中心坐标与 Waypoint 折点，并能无损反序列化还原至画布。
      </span>
    </div>

    <div class="designer-canvas-box">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :stencil-groups="DEFAULT_STENCIL_GROUPS"
      />
    </div>

    <!-- BPMN XML 实时抽屉 -->
    <el-drawer v-model="isXmlDrawerOpen" title="BPMN 2.0 标准 XML 预览与双向反序列化" size="520px">
      <div class="drawer-inner">
        <div class="drawer-bar">
          <el-input
            v-model="bpmnProcessName"
            size="small"
            placeholder="流程可读名称"
            style="width: 240px"
          />
          <div class="btn-group">
            <el-button size="small" @click="handleExportXml">🔄 重新生成</el-button>
            <el-button type="primary" size="small" @click="handleApplyXmlToGraph">
              ⬆️ 应用至画布
            </el-button>
          </div>
        </div>

        <el-input
          v-model="bpmnXmlContent"
          type="textarea"
          :rows="24"
          class="xml-editor"
          placeholder="BPMN 2.0 XML 文本内容"
        />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.scenario-bpmn {
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

.designer-canvas-box {
  flex: 1;
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.drawer-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.drawer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-group {
  display: flex;
  gap: 6px;
}

.xml-editor :deep(textarea) {
  font-family: 'Fira Code', Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background-color: #f8fafc;
  color: #0f172a;
}
</style>

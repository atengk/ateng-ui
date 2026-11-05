<script setup lang="ts">
/**
 * 场景二：属性配置抽屉与表单插槽接管 (PropertyPanelSlotScenario)。
 *
 * 验证 AtengFlowPropertyPanel 工业级能力：
 * 1. L2 专用能力层坚持纯原生零 UI 依赖，默认提供极简纯 HTML 表单；
 * 2. 100% 插槽控制反转：通过 #panel 具名插槽支持业务层无缝使用 Element Plus 表单组件完整接管；
 * 3. 双模对比切换：实时在“原生轻量模式”与“企业级 Element Plus 接管模式”之间无损热切换；
 * 4. 属性双向响应式回写：节点审批人、会签模式、流转时效及连线条件表达式双向绑定。
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
  type FlowElementData,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const useCustomPanel = ref<boolean>(true);
const currentSelected = ref<FlowElementData | null>(null);

const initialGraph: FlowGraph = {
  nodes: [
    {
      id: 'task-leader',
      type: FlowNodeType.USER_TASK,
      x: 220,
      y: 180,
      text: '部门主管审批',
      properties: {
        assigneeType: 'user',
        assignee: 'zhang_leader',
        approvalMode: 'single',
        dueHours: 24,
        description: '核实部门预算充足性及出差合理性',
      },
    },
    {
      id: 'gateway-audit',
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      x: 440,
      y: 180,
      text: '金额分流网关',
      properties: {
        description: '判断金额是否超过部门限额',
      },
    },
    {
      id: 'task-cfo',
      type: FlowNodeType.USER_TASK,
      x: 660,
      y: 180,
      text: '财务总监加签',
      properties: {
        assigneeType: 'role',
        assignee: 'role:finance_director',
        approvalMode: 'and',
        dueHours: 48,
        description: '大额资金支出合规性复核',
      },
    },
  ],
  edges: [
    {
      id: 'edge-lead-gate',
      type: 'polyline',
      sourceNodeId: 'task-leader',
      targetNodeId: 'gateway-audit',
      text: '主管同意',
    },
    {
      id: 'edge-gate-cfo',
      type: 'polyline',
      sourceNodeId: 'gateway-audit',
      targetNodeId: 'task-cfo',
      text: '金额 > 20,000 元',
      properties: {
        condition: '${amount > 20000}',
        priority: 1,
      },
    },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialGraph)));

const handleSelectionChange = (element: FlowElementData | null) => {
  currentSelected.value = element;
};

const handleElementUpdate = (element: FlowElementData) => {
  currentSelected.value = element;
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
  <div class="scenario-property-panel">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">元素属性配置与表单插槽接管展厅</span>
        <el-tag size="small" type="success">100% 插槽控制反转</el-tag>
      </div>
      <div class="toolbar-right">
        <span class="mode-label">抽屉表单形态:</span>
        <el-radio-group v-model="useCustomPanel" size="small">
          <el-radio-button :value="true">⭐ Element Plus 插槽接管</el-radio-button>
          <el-radio-button :value="false">开箱即用原生无依赖表单</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span>
        提示：点击画布中的“部门主管审批”节点或“金额 &gt; 20,000
        元”连线，观察右侧属性抽屉。在上方切换表单形态可实时对比 L2 原生表单与业务层 Element Plus
        表单的无缝接管能力。
      </span>
    </div>

    <div class="designer-canvas-box">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :stencil-groups="DEFAULT_STENCIL_GROUPS"
        :panel-width="360"
        @selection:change="handleSelectionChange"
        @element:update="handleElementUpdate"
      >
        <!-- 使用 Element Plus 表单定制属性面板 (#panel 插槽) -->
        <template v-if="useCustomPanel" #panel="{ element, updateProperty, close }">
          <div class="custom-panel-wrapper">
            <div class="custom-panel-header">
              <div class="header-title-box">
                <span class="header-icon">{{ element.isNode ? '📌' : '🔀' }}</span>
                <span class="header-title">
                  {{ element.isNode ? '节点业务属性' : '连线流转条件' }}
                </span>
              </div>
              <el-button link type="primary" size="small" @click="close">关闭</el-button>
            </div>

            <el-form label-position="top" size="small" class="custom-panel-form">
              <el-form-item label="图元标识 (ID)">
                <el-input :model-value="element.id" disabled />
              </el-form-item>

              <el-form-item label="显示名称">
                <el-input
                  :model-value="element.text || ''"
                  placeholder="请输入图元显示名称"
                  @update:model-value="val => updateProperty('text', val)"
                />
              </el-form-item>

              <!-- 节点特有业务属性 -->
              <template v-if="element.isNode">
                <el-form-item label="审批人指派模式">
                  <el-select
                    :model-value="element.properties?.assigneeType || 'user'"
                    style="width: 100%"
                    @update:model-value="val => updateProperty('assigneeType', val)"
                  >
                    <el-option label="指定具体用户" value="user" />
                    <el-option label="指定业务角色" value="role" />
                    <el-option label="部门负责人" value="dept_head" />
                  </el-select>
                </el-form-item>

                <el-form-item label="审批办理人/角色标识">
                  <el-input
                    :model-value="element.properties?.assignee || ''"
                    placeholder="如: zhang_leader 或 role:finance"
                    @update:model-value="val => updateProperty('assignee', val)"
                  />
                </el-form-item>

                <el-form-item label="会签决策机制">
                  <el-radio-group
                    :model-value="element.properties?.approvalMode || 'single'"
                    @update:model-value="val => updateProperty('approvalMode', val)"
                  >
                    <el-radio value="single">单人通过即流转</el-radio>
                    <el-radio value="and">全员会签一致同意</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="审批超时时效 (小时)">
                  <el-input-number
                    :model-value="element.properties?.dueHours || 24"
                    :min="1"
                    :max="720"
                    style="width: 100%"
                    @update:model-value="val => updateProperty('dueHours', val)"
                  />
                </el-form-item>
              </template>

              <!-- 连线特有条件属性 -->
              <template v-else>
                <el-form-item label="流转条件表达式 (UEL / SpEL)">
                  <el-input
                    :model-value="element.properties?.condition || ''"
                    placeholder="如: ${amount > 20000}"
                    type="textarea"
                    :rows="3"
                    @update:model-value="val => updateProperty('condition', val)"
                  />
                </el-form-item>

                <el-form-item label="分支计算优先级">
                  <el-input-number
                    :model-value="element.properties?.priority || 1"
                    :min="1"
                    :max="99"
                    style="width: 100%"
                    @update:model-value="val => updateProperty('priority', val)"
                  />
                </el-form-item>
              </template>

              <el-form-item label="业务备注说明">
                <el-input
                  :model-value="element.properties?.description || ''"
                  type="textarea"
                  :rows="2"
                  placeholder="填写用于工单审计的业务描述"
                  @update:model-value="val => updateProperty('description', val)"
                />
              </el-form-item>
            </el-form>

            <div class="custom-panel-footer">
              <el-alert
                title="数据双向实时同步：表单属性修改立即原地回写至流程内存图谱"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </template>
      </AtengFlowDesigner>
    </div>
  </div>
</template>

<style scoped>
.scenario-property-panel {
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

.mode-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.info-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
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

.custom-panel-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
}

.custom-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 16px;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  font-size: 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.custom-panel-form {
  flex: 1;
  overflow-y: auto;
}

.custom-panel-footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}
</style>

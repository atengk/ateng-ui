<script setup lang="ts">
/**
 * sample-flow-vue 自验展厅主页面。
 *
 * 验证 AtengFlowDesigner 设计态：
 * 1. 三段式物料面板、DND 拖拽、四向磁吸正交折线与拓扑防呆连线；
 * 2. 选中图元右侧属性抽屉平滑滑出、空白区点击收起；
 * 3. 基础属性只读 ID、名称、流转条件表达式配置；
 * 4. 支持 #panel 具名插槽使用 Element Plus 完整接管审批人和分支条件配置；
 * 5. 属性双向回写与历史栈（Undo / Redo）联动。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  type FlowGraph,
  type FlowNode,
  type FlowEdge,
  type FlowElementData,
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
      text: '发起报销',
      properties: {
        description: '员工发起费用报销申请',
        initiator: 'zhangsan',
      },
    },
    {
      id: 'task-1',
      type: FlowNodeType.USER_TASK,
      x: 340,
      y: 200,
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
      x: 540,
      y: 200,
      text: '金额判断',
      properties: {
        description: '根据金额决定是否需要总监加签',
      },
    },
    {
      id: 'task-2',
      type: FlowNodeType.USER_TASK,
      x: 740,
      y: 120,
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
      x: 940,
      y: 200,
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
      targetNodeId: 'task-2',
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
      targetNodeId: 'end-1',
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
});

const lastEvent = ref<string>('就绪：单击任意节点或连线唤起右侧属性抽屉');
const alertMessage = ref<string>('');
const useCustomPanel = ref<boolean>(true);
const currentSelected = ref<FlowElementData | null>(null);

// 自定义业务连线守卫示例：禁止从开始节点直接跨越连到结束节点
const beforeConnect: BeforeConnectHook = (source, target) => {
  if (source.type === FlowNodeType.START && target.type === FlowNodeType.END) {
    return '业务规则拦截：流程不可从【开始节点】直接流转至【结束节点】，必须经过审批！';
  }
  return true;
};

const handleReady = () => {
  lastEvent.value = 'LogicFlow 设计器已就绪，属性抽屉系统与防呆守卫已就绪';
};

const handleNodeClick = (node: FlowNode) => {
  lastEvent.value = `选中节点: ${node.id} (${node.text || node.type})`;
};

const handleEdgeClick = (edge: FlowEdge) => {
  lastEvent.value = `选中连线: ${edge.id} [${edge.text || '无标签'}]`;
};

const handleBlankClick = () => {
  lastEvent.value = '点击画布空白区，属性抽屉已收起';
};

const handleSelectionChange = (element: FlowElementData | null) => {
  currentSelected.value = element;
};

const handleElementUpdate = (element: FlowElementData) => {
  lastEvent.value = `图元属性已更新并同步历史栈: ${element.id} [${element.name}]`;
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
const handleUndo = () => {
  designerRef.value?.undo();
  lastEvent.value = '已撤销上一操作 (Undo)';
};
const handleRedo = () => {
  designerRef.value?.redo();
  lastEvent.value = '已恢复操作 (Redo)';
};
const handleClear = () => {
  designerRef.value?.clear();
  lastEvent.value = '画布已清空';
};

const handleReloadDefault = () => {
  designerRef.value?.render(graphData.value);
  lastEvent.value = '已重载示例费用审批拓扑';
};

const currentBadgeType = computed(() => {
  if (!currentSelected.value) return 'info';
  if (currentSelected.value.elementType === 'edge') return 'success';
  if (currentSelected.value.type.includes('task')) return 'warning';
  if (currentSelected.value.type.includes('gateway')) return 'danger';
  return 'primary';
});
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="sample-header__left">
        <h1>@atengk/flow-vue 流程可视化展厅</h1>
        <p class="sample-desc">
          工单 #164 验证：属性抽屉平滑滑出、Element Plus 表单接管（#panel 插槽）、双向回写与
          Undo/Redo 历史栈
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
      <span class="toolbar-divider" />
      <button class="btn btn--primary" @click="handleUndo">撤销 (Undo)</button>
      <button class="btn btn--primary" @click="handleRedo">重做 (Redo)</button>
      <span class="toolbar-divider" />
      <button
        class="btn btn--toggle"
        :class="{ 'is-active': useCustomPanel }"
        @click="useCustomPanel = !useCustomPanel"
      >
        {{ useCustomPanel ? '当前：Element Plus 插槽接管' : '当前：原生轻量抽屉面板' }}
      </button>
      <button class="btn btn--danger" @click="handleClear">清空画布</button>
      <button class="btn" @click="handleReloadDefault">重载初始拓扑</button>
      <span class="status-tag">{{ lastEvent }}</span>
    </div>

    <main class="sample-designer-wrapper">
      <AtengFlowDesigner
        ref="designerRef"
        v-model="graphData"
        :before-connect="beforeConnect"
        panel-width="360px"
        width="100%"
        height="100%"
        @ready="handleReady"
        @node:click="handleNodeClick"
        @edge:click="handleEdgeClick"
        @blank:click="handleBlankClick"
        @selection:change="handleSelectionChange"
        @element:update="handleElementUpdate"
        @connection:not-allowed="handleConnectionNotAllowed"
      >
        <!-- 使用 Element Plus 表单接管 #panel 插槽 -->
        <template v-if="useCustomPanel" #panel="{ element, updateProperty, close }">
          <div class="custom-el-panel">
            <div class="custom-el-panel__header">
              <div class="header-info">
                <span class="panel-title">业务属性配置</span>
                <el-tag size="small" :type="currentBadgeType">
                  {{ element.elementType === 'node' ? '节点' : '连线' }}: {{ element.type }}
                </el-tag>
              </div>
              <el-button link type="primary" size="small" @click="close"> 关闭 </el-button>
            </div>

            <div class="custom-el-panel__body">
              <el-form label-position="top" size="default">
                <!-- 通用元数据 -->
                <el-form-item label="图元 ID（只读）">
                  <el-input :model-value="element.id" readonly disabled />
                </el-form-item>

                <el-form-item label="显示名称 (Name / Text)">
                  <el-input
                    :model-value="element.name"
                    placeholder="请输入名称"
                    @input="(val: string) => updateProperty('name', val)"
                  />
                </el-form-item>

                <!-- 审批任务节点专属表单 -->
                <template
                  v-if="element.type === FlowNodeType.USER_TASK || element.type === 'user-task'"
                >
                  <el-divider content-position="left">审批人设置</el-divider>

                  <el-form-item label="审批人分配模式">
                    <el-select
                      :model-value="(element.properties.assigneeType as string) || 'user'"
                      style="width: 100%"
                      @change="(val: string) => updateProperty('assigneeType', val)"
                    >
                      <el-option label="指定具体用户" value="user" />
                      <el-option label="角色 / 岗位组" value="role" />
                      <el-option label="发起人自选" value="initiator_select" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="审批人 / 办理角色">
                    <el-input
                      :model-value="(element.properties.assignee as string) || ''"
                      placeholder="如: zhangsan, role:finance_director"
                      @input="(val: string) => updateProperty('assignee', val)"
                    />
                  </el-form-item>

                  <el-form-item label="办理模式">
                    <el-radio-group
                      :model-value="(element.properties.approvalMode as string) || 'single'"
                      @change="
                        (val: string | number | boolean | undefined) =>
                          updateProperty('approvalMode', val)
                      "
                    >
                      <el-radio value="single">或签（一人通过）</el-radio>
                      <el-radio value="countersign">会签（全员核准）</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item label="审批超时时限（小时）">
                    <el-input-number
                      :model-value="(element.properties.dueHours as number) || 24"
                      :min="1"
                      :max="720"
                      style="width: 100%"
                      @change="(val: number | undefined) => updateProperty('dueHours', val)"
                    />
                  </el-form-item>
                </template>

                <!-- 条件连线专属表单 -->
                <template v-if="element.elementType === 'edge'">
                  <el-divider content-position="left">分支流转条件</el-divider>

                  <el-form-item label="条件表达式">
                    <el-input
                      :model-value="(element.properties.condition as string) || ''"
                      placeholder="如: ${amount >= 10000} 或 approved == true"
                      @input="(val: string) => updateProperty('condition', val)"
                    />
                    <span class="form-tip">支持 Spring EL / UEL 格式表达式</span>
                  </el-form-item>

                  <el-form-item label="评估优先级 (Priority)">
                    <el-input-number
                      :model-value="(element.properties.priority as number) || 1"
                      :min="1"
                      :max="99"
                      style="width: 100%"
                      @change="(val: number | undefined) => updateProperty('priority', val)"
                    />
                  </el-form-item>
                </template>

                <!-- 备注说明 -->
                <el-form-item label="备注说明">
                  <el-input
                    type="textarea"
                    rows="3"
                    :model-value="(element.properties.description as string) || ''"
                    placeholder="业务规则或操作指引"
                    @input="(val: string) => updateProperty('description', val)"
                  />
                </el-form-item>
              </el-form>
            </div>

            <div class="custom-el-panel__footer">
              <el-text size="small" type="success">实时回写已同步</el-text>
              <el-button type="primary" size="small" @click="close">完成配置</el-button>
            </div>
          </div>
        </template>
      </AtengFlowDesigner>
    </main>

    <footer class="sample-footer">
      <span>当前节点数: {{ graphData.nodes.length }}</span>
      <span>当前连线数: {{ graphData.edges.length }}</span>
      <span v-if="currentSelected" class="current-selected-badge">
        🎯 选中: {{ currentSelected.id }} ({{ currentSelected.name }})
      </span>
      <span class="footer-hint">
        💡 试一试：单击节点修改审批人或连线条件，随后点击顶部【撤销 (Undo)】观察回退效果！
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

.toolbar-divider {
  width: 1px;
  height: 20px;
  background-color: #cbd5e1;
  margin: 0 4px;
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

.btn--toggle {
  background-color: #f8fafc;
  border-color: #0ea5e9;
  color: #0284c7;
  font-weight: 500;
}

.btn--toggle.is-active {
  background-color: #e0f2fe;
  border-color: #0284c7;
  color: #0369a1;
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

.custom-el-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-left: 1px solid #e2e8f0;
}

.custom-el-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  background-color: #fafbfc;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.custom-el-panel__body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.custom-el-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid #f1f5f9;
  background-color: #fafbfc;
}

.form-tip {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
  margin-top: 4px;
}

.sample-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.current-selected-badge {
  color: #2563eb;
  font-weight: 600;
  background-color: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
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

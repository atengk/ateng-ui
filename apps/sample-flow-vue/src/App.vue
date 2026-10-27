<script setup lang="ts">
/**
 * sample-flow-vue 自验展厅主页面。
 *
 * 验证 AtengFlowDesigner 设计态：
 * 1. 顶部操作控制栏（AtengFlowToolbar）：视口缩放、Undo/Redo、DAG 自动分层排版、网格切换、防误触清空；
 * 2. 键盘快捷键体系：Delete 删除、Ctrl+Z/Y 撤销重做、Ctrl+C/V 复制粘贴；
 * 3. 三段式物料面板、DND 拖拽、四向磁吸正交折线与拓扑防呆连线；
 * 4. 属性抽屉平滑滑出与 #panel 具名插槽 Element Plus 业务表单接管。
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
  type LayoutDirection,
  type AtengFlowDesignerInstance,
  type BeforeConnectHook,
  type FlowValidationError,
  type FlowValidationResult,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);

const initialGraph: FlowGraph = {
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
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialGraph)));
const lastEvent = ref<string>('就绪：可使用顶部工具栏执行缩放、自动分层排版、撤销重做或体验快捷键');
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
  lastEvent.value = 'LogicFlow 设计器已就绪，工具栏动作矩阵与快捷键已就绪';
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

const handleLayoutComplete = (data: { direction: LayoutDirection; graph: FlowGraph }) => {
  lastEvent.value = `DAG 自动分层排版完成 [${data.direction === 'LR' ? '水平整理 (LR)' : '垂直整理 (TB)'}]，共 ${data.graph.nodes.length} 个节点`;
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

const validationResult = ref<FlowValidationResult | null>(null);
const isValidationDrawerOpen = ref<boolean>(false);

const handleValidate = () => {
  if (!designerRef.value) return;
  const result = designerRef.value.validate();
  validationResult.value = result;
  isValidationDrawerOpen.value = true;
  if (result.valid) {
    lastEvent.value = '✅ 拓扑校验通过：流程图符合所有图论刚性规则！';
  } else {
    lastEvent.value = `❌ 拓扑校验未通过：发现 ${result.errors.length} 项违规，已在画布高亮红色呼吸边框！`;
  }
};

const handleOnValidate = (result: FlowValidationResult) => {
  validationResult.value = result;
  isValidationDrawerOpen.value = true;
  if (result.valid) {
    lastEvent.value = '✅ 拓扑校验通过：流程图符合所有图论刚性规则！';
  } else {
    lastEvent.value = `❌ 拓扑校验未通过：发现 ${result.errors.length} 项违规，已在画布高亮红色呼吸边框！`;
  }
};

const handleClearValidation = () => {
  designerRef.value?.clearValidationHighlight();
  validationResult.value = null;
  isValidationDrawerOpen.value = false;
  lastEvent.value = '已清除画布上的校验错误高亮状态';
};

const handleFocusElement = (id: string) => {
  if (designerRef.value && id) {
    designerRef.value.focusElement(id);
    lastEvent.value = `已自动平移视口并高亮居中定位图元: [${id}]`;
  }
};

const handleFocusError = (err: FlowValidationError) => {
  const targetId = err.nodeIds?.[0] || err.edgeIds?.[0];
  if (targetId) {
    handleFocusElement(targetId);
  }
};

// 预设违规测试用例
const invalidPresets: Record<string, { title: string; graph: FlowGraph }> = {
  'missing-end': {
    title: '缺少结束节点与悬空任务',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 120, y: 200, text: '开始' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 340, y: 200, text: '悬空初审任务' },
      ],
      edges: [{ id: 'edge-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' }],
    },
  },
  gateway: {
    title: '排他网关分支不足与未配条件',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 120, y: 200, text: '开始' },
        { id: 'gw-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 340, y: 200, text: '排他网关' },
        { id: 'end-1', type: FlowNodeType.END, x: 560, y: 200, text: '结束' },
      ],
      edges: [
        { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'gw-1' },
        { id: 'e-2', type: 'polyline', sourceNodeId: 'gw-1', targetNodeId: 'end-1' },
      ],
    },
  },
  deadlock: {
    title: '无出口死锁闭环拓扑',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 120, y: 150, text: '开始' },
        { id: 'task-a', type: FlowNodeType.USER_TASK, x: 300, y: 150, text: '死锁任务A' },
        { id: 'task-b', type: FlowNodeType.USER_TASK, x: 480, y: 150, text: '死锁任务B' },
        { id: 'task-c', type: FlowNodeType.USER_TASK, x: 390, y: 270, text: '死锁任务C' },
        { id: 'end-1', type: FlowNodeType.END, x: 680, y: 150, text: '孤立结束' },
      ],
      edges: [
        { id: 'e-s', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-a' },
        { id: 'e-ab', type: 'polyline', sourceNodeId: 'task-a', targetNodeId: 'task-b' },
        { id: 'e-bc', type: 'polyline', sourceNodeId: 'task-b', targetNodeId: 'task-c' },
        { id: 'e-ca', type: 'polyline', sourceNodeId: 'task-c', targetNodeId: 'task-a' },
      ],
    },
  },
  island: {
    title: '孤岛不可达节点',
    graph: {
      nodes: [
        { id: 'start-1', type: FlowNodeType.START, x: 120, y: 150, text: '发起流程' },
        { id: 'task-1', type: FlowNodeType.USER_TASK, x: 340, y: 150, text: '正常审批' },
        { id: 'end-1', type: FlowNodeType.END, x: 560, y: 150, text: '结束' },
        { id: 'island-1', type: FlowNodeType.USER_TASK, x: 250, y: 320, text: '孤岛节点A' },
        { id: 'island-2', type: FlowNodeType.USER_TASK, x: 450, y: 320, text: '孤岛节点B' },
      ],
      edges: [
        { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
        { id: 'e-2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
        { id: 'e-iso1', type: 'polyline', sourceNodeId: 'island-1', targetNodeId: 'island-2' },
        { id: 'e-iso2', type: 'polyline', sourceNodeId: 'island-2', targetNodeId: 'island-1' },
      ],
    },
  },
};

const handleLoadInvalid = (key: string | number | object) => {
  const item = invalidPresets[String(key)];
  if (!item) return;
  graphData.value = JSON.parse(JSON.stringify(item.graph));
  designerRef.value?.render(graphData.value);
  designerRef.value?.fitView();
  lastEvent.value = `已载入测试用例: [${item.title}]，正在执行静态校验...`;
  handleValidate();
};

const handleReloadDefault = () => {
  handleClearValidation();
  graphData.value = JSON.parse(JSON.stringify(initialGraph));
  designerRef.value?.render(graphData.value);
  designerRef.value?.fitView();
  lastEvent.value = '已重载示例初始审批拓扑并重置视口';
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
          工单 #166
          验证：流程拓扑静态校验引擎（起止节点唯一性、出入度悬空检测、网关分支条件、无出口死循环）、违规图元红色呼吸高亮与一键居中定位
        </p>
      </div>

      <div class="sample-header__right">
        <button class="btn btn--validate" @click="handleValidate">🔍 静态拓扑校验</button>

        <el-dropdown trigger="click" @command="handleLoadInvalid">
          <button class="btn btn--warning">⚠️ 测试违规用例 ▾</button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="missing-end">缺少结束节点与悬空任务</el-dropdown-item>
              <el-dropdown-item command="gateway">排他网关分支不足与未配条件</el-dropdown-item>
              <el-dropdown-item command="deadlock">无出口死锁拓扑闭环</el-dropdown-item>
              <el-dropdown-item command="island">孤岛不可达节点</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <button v-if="validationResult" class="btn" @click="handleClearValidation">清除高亮</button>

        <button
          class="btn btn--toggle"
          :class="{ 'is-active': useCustomPanel }"
          @click="useCustomPanel = !useCustomPanel"
        >
          {{ useCustomPanel ? '表单：Element Plus 接管' : '表单：原生轻量抽屉' }}
        </button>
        <button class="btn btn--primary" @click="handleReloadDefault">重置示例拓扑</button>
      </div>

      <!-- 拦截提示浮层 -->
      <transition name="fade">
        <div v-if="alertMessage" class="alert-banner">
          {{ alertMessage }}
        </div>
      </transition>
    </header>

    <!-- 快捷键与状态提示条 -->
    <div class="sample-status-bar">
      <span class="status-tip">
        ⌨️ <strong>快捷键支持</strong>：<kbd>Delete</kbd> 删除选中 | <kbd>Ctrl+Z</kbd> 撤销 |
        <kbd>Ctrl+Y / Ctrl+Shift+Z</kbd> 重做 | <kbd>Ctrl+C/V</kbd> 复制粘贴
      </span>
      <span class="status-event">{{ lastEvent }}</span>
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
        @layout:complete="handleLayoutComplete"
        @connection:not-allowed="handleConnectionNotAllowed"
        @validate="handleOnValidate"
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
        💡 试一试：点击顶部【水平整理】或【垂直整理】体验 DAG 智能排版；按键盘 Delete
        键即刻删除选中图元！
      </span>
    </footer>

    <!-- 拓扑校验诊断抽屉面板 -->
    <el-drawer
      v-model="isValidationDrawerOpen"
      title="流程拓扑静态校验诊断面板"
      size="480px"
      direction="rtl"
    >
      <div v-if="validationResult" class="sample-diagnosis">
        <div v-if="validationResult.valid" class="diagnosis-success">
          <el-result
            icon="success"
            title="拓扑校验 100% 通过"
            sub-title="当前流程图符合起止唯一性、连通性、网关分支及无死锁等所有图论刚性规则！"
          >
            <template #extra>
              <el-button type="primary" size="small" @click="isValidationDrawerOpen = false">
                完成审阅
              </el-button>
            </template>
          </el-result>
        </div>

        <div v-else class="diagnosis-errors">
          <el-alert
            type="error"
            :closable="false"
            show-icon
            :title="`检测到 ${validationResult.errors.length} 项流程拓扑违规`"
          >
            违规图元已在画布呈现红色呼吸边框高亮，点击对应条目可自动平移居中并选中目标图元。
          </el-alert>

          <div class="diagnosis-list">
            <div
              v-for="(err, index) in validationResult.errors"
              :key="index"
              class="diagnosis-item"
              :class="`diagnosis-item--${err.level}`"
              @click="handleFocusError(err)"
            >
              <div class="diagnosis-item__header">
                <el-tag :type="err.level === 'error' ? 'danger' : 'warning'" size="small">
                  {{ err.level === 'error' ? '阻断错误' : '规范警告' }}
                </el-tag>
                <span class="diagnosis-item__code">{{ err.code }}</span>
              </div>

              <div class="diagnosis-item__msg">{{ err.message }}</div>

              <div v-if="err.nodeIds && err.nodeIds.length > 0" class="diagnosis-item__targets">
                <span class="targets-label">违规节点：</span>
                <el-button
                  v-for="nid in err.nodeIds"
                  :key="nid"
                  size="small"
                  type="danger"
                  plain
                  @click="handleFocusElement(nid)"
                >
                  🎯 居中定位: {{ nid }}
                </el-button>
              </div>

              <div v-if="err.edgeIds && err.edgeIds.length > 0" class="diagnosis-item__targets">
                <span class="targets-label">关联连线：</span>
                <el-button
                  v-for="eid in err.edgeIds"
                  :key="eid"
                  size="small"
                  type="warning"
                  plain
                  @click="handleFocusElement(eid)"
                >
                  🔗 居中定位: {{ eid }}
                </el-button>
              </div>
            </div>
          </div>

          <div class="diagnosis-footer">
            <el-button @click="handleClearValidation">清除画布高亮</el-button>
            <el-button type="primary" @click="handleValidate">重新校验</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
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
  margin-bottom: 8px;
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

.sample-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sample-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
}

.status-tip {
  color: #334155;
}

.status-tip kbd {
  display: inline-block;
  padding: 1px 4px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
  color: #0f172a;
}

.status-event {
  color: #0284c7;
  font-weight: 500;
}

.alert-banner {
  position: absolute;
  top: 0;
  right: 220px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #991b1b;
  background-color: #fee2e2;
  border: 1px solid #f87171;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);
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

.btn--validate {
  background-color: #fef2f2;
  border-color: #f87171;
  color: #dc2626;
  font-weight: 600;
}

.btn--validate:hover {
  background-color: #fee2e2;
  border-color: #ef4444;
}

.btn--warning {
  background-color: #fffbeb;
  border-color: #fcd34d;
  color: #d97706;
}

.btn--warning:hover {
  background-color: #fef3c7;
}

.sample-diagnosis {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.diagnosis-errors {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.diagnosis-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diagnosis-item {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.diagnosis-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.diagnosis-item--warning {
  border-color: #fef3c7;
  background-color: #fffbeb;
}

.diagnosis-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagnosis-item__code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #64748b;
}

.diagnosis-item__msg {
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
  font-weight: 500;
}

.diagnosis-item__targets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.targets-label {
  font-size: 12px;
  color: #64748b;
}

.diagnosis-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
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

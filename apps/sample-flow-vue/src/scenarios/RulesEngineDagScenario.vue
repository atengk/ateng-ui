<script setup lang="ts">
/**
 * 场景八：低代码规则引擎 / DAG 数据拓扑 (RulesEngineDagScenario)。
 *
 * 验证规则引擎拓扑编排与 DAG 数据管道：
 * 1. 领域驱动物料分组：数据输入源 (Source)、规则过滤 (Filter)、清洗转换 (Transform)、汇聚输出 (Sink)；
 * 2. 规则链连线拓扑鉴权守卫（BeforeConnectHook）：输入源禁止作为终点、汇聚终端禁止连出、必须经过处理层；
 * 3. 一键动态模拟数据流处理：节点流动状态染色与实时控制台日志输出。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  type FlowGraph,
  type StencilGroup,
  type BeforeConnectHook,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const isSimulating = ref<boolean>(false);
const simulationLogs = ref<
  Array<{ time: string; level: 'info' | 'success' | 'warn'; msg: string }>
>([]);
const alertMsg = ref<string>('');

const ruleStencilGroups: StencilGroup[] = [
  {
    id: 'inputs',
    title: '📥 数据输入源 (Source)',
    items: [
      {
        type: FlowNodeType.START,
        label: 'Kafka 行为流',
        description: '分布式 Topic 实时行为事件流',
        nodeConfig: {
          text: 'Kafka 行为流',
          properties: { category: 'input', role: 'source', topic: 'user_behavior_event' },
        },
      },
      {
        type: FlowNodeType.START,
        label: 'HTTP API 上报',
        description: '外部 RESTful Webhook 实时上报',
        nodeConfig: {
          text: 'HTTP API 上报',
          properties: { category: 'input', role: 'source', endpoint: '/api/v1/event/collect' },
        },
      },
    ],
  },
  {
    id: 'filters',
    title: '🔍 规则过滤 (Filter)',
    items: [
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        label: '白名单过滤',
        description: 'IP / 租户黑白名单过滤',
        nodeConfig: {
          text: '白名单过滤',
          properties: {
            category: 'filter',
            role: 'processor',
            condition: 'tenant_id in whitelist',
          },
        },
      },
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        label: '指标阈值熔断',
        description: '数值区间阈值熔断',
        nodeConfig: {
          text: '指标阈值熔断',
          properties: { category: 'filter', role: 'processor', threshold: 1000 },
        },
      },
    ],
  },
  {
    id: 'transforms',
    title: '⚙️ 数据转换 (Transform)',
    items: [
      {
        type: FlowNodeType.SERVICE_TASK,
        label: '敏感字段脱敏',
        description: '手机号身份证内存正则脱敏',
        nodeConfig: {
          text: '敏感字段脱敏',
          properties: { category: 'transform', role: 'processor', rule: 'mask(idCard, phone)' },
        },
      },
      {
        type: FlowNodeType.SERVICE_TASK,
        label: 'IP 地理位置补全',
        description: '离线库补充城市地理元数据',
        nodeConfig: {
          text: 'IP 地理位置补全',
          properties: { category: 'transform', role: 'processor', rule: 'lookup(ip_geo_db)' },
        },
      },
    ],
  },
  {
    id: 'outputs',
    title: '📤 汇聚输出 (Sink)',
    items: [
      {
        type: FlowNodeType.END,
        label: 'ES 审计检索',
        description: '实时写入 ElasticSearch 集群',
        nodeConfig: {
          text: 'ES 审计检索',
          properties: { category: 'output', role: 'sink', index: 'audit_logs_v1' },
        },
      },
      {
        type: FlowNodeType.END,
        label: 'MySQL 归档存储',
        description: '批量分表插入 MySQL 持久化',
        nodeConfig: {
          text: 'MySQL 归档存储',
          properties: { category: 'output', role: 'sink', table: 't_user_action_archive' },
        },
      },
    ],
  },
];

const initialRulesGraph: FlowGraph = {
  nodes: [
    {
      id: 'rule-input-kafka',
      type: FlowNodeType.START,
      x: 80,
      y: 200,
      text: 'Kafka 行为流',
      properties: { category: 'input', role: 'source', topic: 'user_behavior_event' },
    },
    {
      id: 'rule-filter-whitelist',
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      x: 280,
      y: 200,
      text: '白名单过滤',
      properties: { category: 'filter', role: 'processor', condition: 'tenant_id in whitelist' },
    },
    {
      id: 'rule-transform-clean',
      type: FlowNodeType.SERVICE_TASK,
      x: 500,
      y: 120,
      text: '敏感字段脱敏',
      properties: { category: 'transform', role: 'processor', rule: 'mask(idCard, phone)' },
    },
    {
      id: 'rule-transform-enrich',
      type: FlowNodeType.SERVICE_TASK,
      x: 500,
      y: 280,
      text: 'IP 位置补全',
      properties: { category: 'transform', role: 'processor', rule: 'lookup(ip_geo_db)' },
    },
    {
      id: 'rule-output-es',
      type: FlowNodeType.END,
      x: 720,
      y: 120,
      text: 'ES 审计检索',
      properties: { category: 'output', role: 'sink', index: 'audit_logs_v1' },
    },
    {
      id: 'rule-output-mysql',
      type: FlowNodeType.END,
      x: 720,
      y: 280,
      text: 'MySQL 归档存储',
      properties: { category: 'output', role: 'sink', table: 't_user_action_archive' },
    },
  ],
  edges: [
    {
      id: 'r-e1',
      type: 'bezier',
      sourceNodeId: 'rule-input-kafka',
      targetNodeId: 'rule-filter-whitelist',
      text: '实时流入',
    },
    {
      id: 'r-e2',
      type: 'bezier',
      sourceNodeId: 'rule-filter-whitelist',
      targetNodeId: 'rule-transform-clean',
      text: '命中白名单',
    },
    {
      id: 'r-e3',
      type: 'bezier',
      sourceNodeId: 'rule-filter-whitelist',
      targetNodeId: 'rule-transform-enrich',
      text: '旁路扩增',
    },
    {
      id: 'r-e4',
      type: 'bezier',
      sourceNodeId: 'rule-transform-clean',
      targetNodeId: 'rule-output-es',
      text: '清洗落库',
    },
    {
      id: 'r-e5',
      type: 'bezier',
      sourceNodeId: 'rule-transform-enrich',
      targetNodeId: 'rule-output-mysql',
      text: '归档持久化',
    },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialRulesGraph)));

const beforeRuleConnect: BeforeConnectHook = (sourceNode, targetNode) => {
  const sourceRole =
    sourceNode.properties?.role ||
    (sourceNode.type === FlowNodeType.START
      ? 'source'
      : sourceNode.type === FlowNodeType.END
        ? 'sink'
        : 'processor');
  const targetRole =
    targetNode.properties?.role ||
    (targetNode.type === FlowNodeType.START
      ? 'source'
      : targetNode.type === FlowNodeType.END
        ? 'sink'
        : 'processor');

  if (targetRole === 'source') {
    alertMsg.value = '🛑 规则链拓扑鉴权：数据输入源（Source）禁止作为连线终点！';
    return '数据输入源禁止作为连线终点';
  }

  if (sourceRole === 'sink') {
    alertMsg.value = '🛑 规则链拓扑鉴权：汇聚输出终端（Sink）为拓扑终点，禁止反向连出！';
    return '汇聚输出终端为拓扑终点，禁止反向连出';
  }

  if (sourceRole === 'source' && targetRole === 'sink') {
    alertMsg.value =
      '⚠️ 规则链架构规约拦截：输入数据必须经过至少一级规则过滤或清洗转换，禁止直连汇聚终端！';
    return '输入源必须先经过规则过滤或清洗转换，禁止直连汇聚终端';
  }

  alertMsg.value = '';
  return true;
};

const handleRunSimulation = async () => {
  if (isSimulating.value) return;
  isSimulating.value = true;
  simulationLogs.value = [];

  const addLog = (level: 'info' | 'success' | 'warn', msg: string) => {
    const time = new Date().toLocaleTimeString();
    simulationLogs.value.push({ time, level, msg });
  };

  const lf = designerRef.value?.lf;
  if (!lf) {
    isSimulating.value = false;
    return;
  }

  // 1. Kafka 接入
  addLog('info', '📥 触发 Kafka 行为数据流入，捕获 5,000 条 user_behavior_event 事件...');
  lf.setProperties('rule-input-kafka', { status: 'processing' });
  await new Promise(r => setTimeout(r, 600));

  // 2. 白名单过滤
  addLog('info', '🔍 正在执行白名单规则引擎过滤（tenant_id in whitelist）...');
  lf.setProperties('rule-input-kafka', { status: 'completed' });
  lf.setProperties('rule-filter-whitelist', { status: 'processing' });
  await new Promise(r => setTimeout(r, 700));

  // 3. 数据脱敏与地理位置补全
  addLog('warn', '⚠️ 规则过滤完成：4,982 条合格通过，18 条非法黑名单 IP 已被安全策略熔断拦截');
  addLog('info', '⚙️ 双路并行处理：执行敏感手机号身份证脱敏 & IP 离线库地理信息补全...');
  lf.setProperties('rule-filter-whitelist', { status: 'completed' });
  lf.setProperties('rule-transform-clean', { status: 'processing' });
  lf.setProperties('rule-transform-enrich', { status: 'processing' });
  await new Promise(r => setTimeout(r, 800));

  // 4. 落库
  addLog('success', '📤 汇聚输出完成：已实时推入 ES 索引 (audit_logs_v1) 并批量持久化入库 MySQL');
  addLog(
    'success',
    '✨ DAG 规则链全链路执行完毕！吞吐率: 5,000 TPS，端到端耗时: 38ms，成功率: 99.64%',
  );
  lf.setProperties('rule-transform-clean', { status: 'completed' });
  lf.setProperties('rule-transform-enrich', { status: 'completed' });
  lf.setProperties('rule-output-es', { status: 'completed' });
  lf.setProperties('rule-output-mysql', { status: 'completed' });

  isSimulating.value = false;
};

const handleReset = () => {
  graphData.value = JSON.parse(JSON.stringify(initialRulesGraph));
  simulationLogs.value = [];
  alertMsg.value = '';
};

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
  <div class="scenario-rules">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">低代码规则引擎 / DAG 数据拓扑展厅</span>
        <el-tag size="small" type="primary">ETL 规则链管道</el-tag>
        <el-tag size="small" type="success">DAG 拓扑防呆守卫</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" size="small" :loading="isSimulating" @click="handleRunSimulation">
          🚀 触发数据流模拟执行
        </el-button>
        <el-button size="small" @click="handleReset">重置规则链拓扑</el-button>
      </div>
    </div>

    <div v-if="alertMsg" class="alert-box">
      <el-alert :title="alertMsg" type="warning" :closable="false" show-icon />
    </div>

    <div class="main-body">
      <div class="designer-canvas-box">
        <AtengFlowDesigner
          ref="designerRef"
          v-model="graphData"
          :stencil-groups="ruleStencilGroups"
          :before-connect="beforeRuleConnect"
        />
      </div>

      <!-- 实时模拟执行日志面板 -->
      <div class="log-panel">
        <div class="log-header">
          <span class="log-title">规则管道动态执行日志</span>
          <el-button link type="primary" size="small" @click="simulationLogs = []">清空</el-button>
        </div>
        <div class="log-body">
          <div v-if="simulationLogs.length === 0" class="empty-log">
            点击上方“触发数据流模拟执行”按钮观察执行流转
          </div>
          <div v-for="(log, idx) in simulationLogs" :key="idx" class="log-row" :class="log.level">
            <span class="log-time">[{{ log.time }}]</span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenario-rules {
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

.alert-box {
  margin: 2px 0;
}

.main-body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 520px;
  overflow: hidden;
}

.designer-canvas-box {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.log-panel {
  width: 360px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #0f172a;
  color: #f8fafc;
  padding: 10px;
  box-sizing: border-box;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #334155;
  margin-bottom: 8px;
}

.log-title {
  font-weight: 600;
  font-size: 13px;
  color: #cbd5e1;
}

.log-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: 'Fira Code', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.empty-log {
  color: #64748b;
  text-align: center;
  margin-top: 30px;
  font-style: italic;
}

.log-row {
  line-height: 1.5;
  display: flex;
  flex-direction: column;
}

.log-row.info .log-msg {
  color: #93c5fd;
}

.log-row.warn .log-msg {
  color: #fde047;
}

.log-row.success .log-msg {
  color: #86efac;
}

.log-time {
  color: #64748b;
  font-size: 10px;
}
</style>

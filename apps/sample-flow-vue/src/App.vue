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

import { ref, computed, nextTick, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  AtengFlowViewer,
  FlowNodeType,
  ApprovalCardNode,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type FlowNode,
  type FlowEdge,
  type FlowElementData,
  type LayoutDirection,
  type AtengFlowDesignerInstance,
  type AtengFlowViewerInstance,
  type BeforeConnectHook,
  type FlowValidationError,
  type FlowValidationResult,
  type StencilGroup,
  type CustomVueNodeConfig,
  type FlowStatusMap,
} from '@atengk/flow-vue';

const activeScene = ref<'designer' | 'viewer' | 'rules'>('designer');
const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const viewerRef = ref<AtengFlowViewerInstance | null>(null);

const customVueNodes: CustomVueNodeConfig[] = [
  {
    type: 'approval-card',
    component: ApprovalCardNode,
    options: {
      width: 220,
      height: 95,
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
        text: '审批卡片',
        description: '带头像、状态胶囊与快捷审批按钮的 Vue SFC 节点',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
        defaultProperties: {
          assignee: '王经理 (研发部)',
          status: 'processing',
          progress: 50,
        },
      },
    ],
  },
];

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
let alertTimer: ReturnType<typeof setTimeout> | null = null;

const showAlert = (msg: string, duration = 3500) => {
  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }
  alertMessage.value = msg;
  if (duration > 0) {
    alertTimer = setTimeout(() => {
      alertMessage.value = '';
      alertTimer = null;
    }, duration);
  }
};

onUnmounted(() => {
  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }
});

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
  showAlert(`🚫 拦截警告: ${msg}`, 4000);
  lastEvent.value = `连线被拦截: ${msg}`;
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

const vueCardGraph: FlowGraph = {
  nodes: [
    { id: 'start-1', type: FlowNodeType.START, x: 100, y: 220, text: '提交立项申请' },
    {
      id: 'card-pm',
      type: 'approval-card',
      x: 340,
      y: 220,
      text: '项目经理初核',
      properties: {
        assignee: '张项目经理 (产研部)',
        status: 'approved',
        progress: 100,
      },
    },
    {
      id: 'card-arch',
      type: 'approval-card',
      x: 620,
      y: 220,
      text: '架构师评审',
      properties: {
        assignee: '王首席架构师',
        status: 'processing',
        progress: 60,
      },
    },
    {
      id: 'card-director',
      type: 'approval-card',
      x: 900,
      y: 220,
      text: '研发总监终核',
      properties: {
        assignee: '李总监 (技术中心)',
        status: 'pending',
        progress: 0,
      },
    },
    { id: 'end-1', type: FlowNodeType.END, x: 1140, y: 220, text: '立项办结归档' },
  ],
  edges: [
    { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'card-pm', text: '送审' },
    {
      id: 'e2',
      type: 'polyline',
      sourceNodeId: 'card-pm',
      targetNodeId: 'card-arch',
      text: '初审通过',
    },
    {
      id: 'e3',
      type: 'polyline',
      sourceNodeId: 'card-arch',
      targetNodeId: 'card-director',
      text: '方案可行',
    },
    {
      id: 'e4',
      type: 'polyline',
      sourceNodeId: 'card-director',
      targetNodeId: 'end-1',
      text: '核准发版',
    },
  ],
};

const handleLoadVueCards = () => {
  handleClearValidation();
  graphData.value = JSON.parse(JSON.stringify(vueCardGraph));
  designerRef.value?.render(graphData.value);
  designerRef.value?.fitView();
  lastEvent.value =
    '已载入 Vue 3 SFC 高颜值卡片审批流，可点击卡片上的【✓ 通过 / ✕ 驳回】进行实时响应式回写！';
};

// ----------------------------------------------------
// 展厅二：运行态流转追踪器 (AtengFlowViewer) 场景数据
// ----------------------------------------------------
const viewerGraph: FlowGraph = {
  nodes: [
    {
      id: 'v-start',
      type: FlowNodeType.START,
      x: 100,
      y: 200,
      text: '立项提交',
      properties: { initiator: '张三 (研发架构师)', amount: '¥ 128,000' },
    },
    {
      id: 'v-leader',
      type: 'approval-card',
      x: 320,
      y: 200,
      text: '部门主管审批',
      properties: {
        assignee: '李总监 (技术部)',
        status: 'completed',
        progress: 100,
      },
    },
    {
      id: 'v-cfo',
      type: 'approval-card',
      x: 580,
      y: 200,
      text: '财务初审',
      properties: {
        assignee: '王财务 (财务部)',
        status: 'processing',
        progress: 60,
      },
    },
    {
      id: 'v-director',
      type: 'approval-card',
      x: 840,
      y: 200,
      text: '财务总监审核',
      properties: {
        assignee: '孙总 (财务总监)',
        status: 'pending',
        progress: 0,
      },
    },
    {
      id: 'v-end',
      type: FlowNodeType.END,
      x: 1060,
      y: 200,
      text: '资金归档',
    },
  ],
  edges: [
    { id: 'v-e1', type: 'polyline', sourceNodeId: 'v-start', targetNodeId: 'v-leader' },
    { id: 'v-e2', type: 'polyline', sourceNodeId: 'v-leader', targetNodeId: 'v-cfo' },
    { id: 'v-e3', type: 'polyline', sourceNodeId: 'v-cfo', targetNodeId: 'v-director' },
    { id: 'v-e4', type: 'polyline', sourceNodeId: 'v-director', targetNodeId: 'v-end' },
  ],
};

const currentViewerStep = ref<number>(2);

const viewerStatusMap = computed<FlowStatusMap>(() => {
  switch (currentViewerStep.value) {
    case 1:
      return {
        'v-start': 'completed',
        'v-e1': 'processing',
        'v-leader': {
          status: 'processing',
          audit: [
            {
              operator: '李总监',
              status: 'processing',
              time: '2026-10-27 09:30',
              comment: '正在评审项目立项材料与设备采购明细',
            },
          ],
        },
        'v-e2': 'pending',
        'v-cfo': 'pending',
        'v-e3': 'pending',
        'v-director': 'pending',
        'v-e4': 'pending',
        'v-end': 'pending',
      };
    case 2:
      return {
        'v-start': 'completed',
        'v-e1': 'completed',
        'v-leader': {
          status: 'completed',
          audit: [
            {
              operator: '李总监',
              status: 'completed',
              time: '2026-10-27 10:15',
              duration: '45分钟',
              comment: '同意采购，已核定业务合理性与自研替代成本，报财务初审。',
            },
          ],
        },
        'v-e2': 'processing',
        'v-cfo': {
          status: 'processing',
          audit: [
            {
              operator: '王财务',
              status: 'processing',
              time: '2026-10-27 11:00',
              duration: '已停留 30分钟',
              comment: '正在复核增值税专用发票与供应商报价合同。',
            },
          ],
        },
        'v-e3': 'pending',
        'v-director': 'pending',
        'v-e4': 'pending',
        'v-end': 'pending',
      };
    case 3:
      return {
        'v-start': 'completed',
        'v-e1': 'completed',
        'v-leader': {
          status: 'completed',
          audit: [
            {
              operator: '李总监',
              status: 'completed',
              time: '2026-10-27 10:15',
              duration: '45分钟',
              comment: '同意采购，已核定业务合理性与自研替代成本，报财务初审。',
            },
          ],
        },
        'v-e2': 'completed',
        'v-cfo': {
          status: 'completed',
          audit: [
            {
              operator: '王财务',
              status: 'completed',
              time: '2026-10-27 14:00',
              duration: '2小时',
              comment: '票据真实合规，科目扣除无误，已送财务总监审批。',
            },
          ],
        },
        'v-e3': 'processing',
        'v-director': {
          status: 'processing',
          audit: [
            {
              operator: '孙总',
              status: 'processing',
              time: '2026-10-27 14:30',
              comment: '正在进行大额支出最终授权。',
            },
          ],
        },
        'v-e4': 'pending',
        'v-end': 'pending',
      };
    case 4:
      return {
        'v-start': 'completed',
        'v-e1': 'completed',
        'v-leader': {
          status: 'completed',
          audit: [
            {
              operator: '李总监',
              status: 'completed',
              time: '2026-10-27 10:15',
              comment: '同意采购。',
            },
          ],
        },
        'v-e2': 'completed',
        'v-cfo': {
          status: 'completed',
          audit: [
            {
              operator: '王财务',
              status: 'completed',
              time: '2026-10-27 14:00',
              comment: '初审通过。',
            },
          ],
        },
        'v-e3': 'completed',
        'v-director': {
          status: 'completed',
          audit: [
            {
              operator: '孙总',
              status: 'completed',
              time: '2026-10-27 15:30',
              duration: '1小时',
              comment: '核准放款，交出纳执行打款并归档。',
            },
          ],
        },
        'v-e4': 'completed',
        'v-end': 'completed',
      };
    case 5:
      return {
        'v-start': 'completed',
        'v-e1': 'completed',
        'v-leader': {
          status: 'completed',
          audit: [
            {
              operator: '李总监',
              status: 'completed',
              time: '2026-10-27 10:15',
              comment: '初审通过。',
            },
          ],
        },
        'v-e2': 'rejected',
        'v-cfo': {
          status: 'rejected',
          audit: [
            {
              operator: '王财务',
              status: 'rejected',
              time: '2026-10-27 11:20',
              comment: '驳回申请：发票抬头纳税人识别号填写错误，请重新提交合规发票！',
            },
          ],
        },
        'v-e3': 'pending',
        'v-director': 'pending',
        'v-e4': 'pending',
        'v-end': 'terminated',
      };
    default:
      return {};
  }
});

// ==========================================
// 展厅三：低代码数据规则引擎 / DAG 拓扑状态与行为
// ==========================================
const rulesDesignerRef = ref<AtengFlowDesignerInstance | null>(null);

const ruleStencilGroups: StencilGroup[] = [
  {
    id: 'inputs',
    title: '📥 数据输入源 (Source)',
    items: [
      {
        type: FlowNodeType.START,
        text: 'Kafka 行为流',
        description: '分布式 Topic 实时行为事件流',
        defaultProperties: { category: 'input', role: 'source', topic: 'user_behavior_event' },
      },
      {
        type: FlowNodeType.START,
        text: 'HTTP API 上报',
        description: '外部 RESTful Webhook 实时上报',
        defaultProperties: { category: 'input', role: 'source', endpoint: '/api/v1/event/collect' },
      },
      {
        type: FlowNodeType.START,
        text: '定时调度触发',
        description: 'Cron 表达式周期拉取',
        defaultProperties: { category: 'input', role: 'source', cron: '0 0/5 * * * ?' },
      },
    ],
  },
  {
    id: 'filters',
    title: '🔍 规则过滤 (Filter)',
    items: [
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        text: '白名单过滤',
        description: 'IP / 租户黑白名单过滤',
        defaultProperties: {
          category: 'filter',
          role: 'processor',
          condition: 'tenant_id in whitelist',
        },
      },
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        text: '指标阈值熔断',
        description: '数值区间阈值熔断',
        defaultProperties: { category: 'filter', role: 'processor', threshold: 1000 },
      },
    ],
  },
  {
    id: 'transforms',
    title: '⚙️ 数据转换 (Transform)',
    items: [
      {
        type: FlowNodeType.SERVICE_TASK,
        text: '敏感字段脱敏',
        description: '手机号身份证内存正则脱敏',
        defaultProperties: {
          category: 'transform',
          role: 'processor',
          rule: 'mask(phone, idCard)',
        },
      },
      {
        type: FlowNodeType.SERVICE_TASK,
        text: 'IP 地理位置补全',
        description: '离线库补充城市地理元数据',
        defaultProperties: {
          category: 'transform',
          role: 'processor',
          rule: 'lookup(ip_geo_db)',
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
        text: 'ES 审计检索',
        description: '实时写入 ElasticSearch 集群',
        defaultProperties: { category: 'output', role: 'sink', index: 'audit_logs_v1' },
      },
      {
        type: FlowNodeType.END,
        text: 'MySQL 归档存储',
        description: '批量分表插入 MySQL 持久化',
        defaultProperties: { category: 'output', role: 'sink', table: 't_user_action_archive' },
      },
    ],
  },
];

const initialRulesGraph: FlowGraph = {
  nodes: [
    {
      id: 'rule-input-kafka',
      type: FlowNodeType.START,
      x: 120,
      y: 220,
      text: 'Kafka 行为流',
      properties: { category: 'input', role: 'source', topic: 'user_behavior_event' },
    },
    {
      id: 'rule-filter-whitelist',
      type: FlowNodeType.EXCLUSIVE_GATEWAY,
      x: 320,
      y: 220,
      text: '白名单过滤',
      properties: { category: 'filter', role: 'processor', condition: 'tenant_id in whitelist' },
    },
    {
      id: 'rule-transform-clean',
      type: FlowNodeType.SERVICE_TASK,
      x: 540,
      y: 160,
      text: '敏感字段脱敏',
      properties: { category: 'transform', role: 'processor', rule: 'mask(idCard, phone)' },
    },
    {
      id: 'rule-transform-enrich',
      type: FlowNodeType.SERVICE_TASK,
      x: 540,
      y: 280,
      text: 'IP 位置补全',
      properties: { category: 'transform', role: 'processor', rule: 'lookup(ip_geo_db)' },
    },
    {
      id: 'rule-output-es',
      type: FlowNodeType.END,
      x: 760,
      y: 160,
      text: 'ES 审计检索',
      properties: { category: 'output', role: 'sink', index: 'audit_logs_v1' },
    },
    {
      id: 'rule-output-mysql',
      type: FlowNodeType.END,
      x: 760,
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

const rulesGraphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialRulesGraph)));

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
    showAlert('🛑 规则链拓扑鉴权：数据输入源（Source）禁止作为连线终点！', 3500);
    return '数据输入源禁止作为连线终点';
  }

  if (sourceRole === 'sink') {
    showAlert('🛑 规则链拓扑鉴权：汇聚输出终端（Sink）为拓扑终点，禁止反向连出！', 3500);
    return '汇聚输出终端为拓扑终点，禁止反向连出';
  }

  if (sourceRole === 'source' && targetRole === 'sink') {
    showAlert(
      '⚠️ 规则链架构规约拦截：输入数据必须经过至少一级规则过滤或清洗转换，禁止直连汇聚终端！',
      3500,
    );
    return '输入源必须先经过规则过滤或清洗转换，禁止直连汇聚终端';
  }

  return true;
};

const isRuleSimulating = ref(false);
const ruleSimulationLogs = ref<
  Array<{ time: string; level: 'info' | 'success' | 'warn'; msg: string }>
>([]);

const handleRunRuleSimulation = async () => {
  if (isRuleSimulating.value) return;
  isRuleSimulating.value = true;
  ruleSimulationLogs.value = [];

  const addLog = (level: 'info' | 'success' | 'warn', msg: string) => {
    const time = new Date().toLocaleTimeString();
    ruleSimulationLogs.value.push({ time, level, msg });
  };

  const lf = rulesDesignerRef.value?.getLf();
  if (!lf) {
    isRuleSimulating.value = false;
    return;
  }

  // 步骤 1：Kafka 接入事件
  addLog('info', '📥 触发 Kafka 行为数据流入，捕获 5,000 条 user_behavior_event 事件...');
  lf.setProperties('rule-input-kafka', { status: 'processing' });
  lf.setProperties('r-e1', { status: 'processing' });
  await new Promise(r => setTimeout(r, 800));

  // 步骤 2：白名单过滤
  addLog('info', '🔍 正在执行白名单规则引擎过滤（tenant_id in whitelist）...');
  lf.setProperties('rule-input-kafka', { status: 'completed' });
  lf.setProperties('r-e1', { status: 'completed' });
  lf.setProperties('rule-filter-whitelist', { status: 'processing' });
  lf.setProperties('r-e2', { status: 'processing' });
  lf.setProperties('r-e3', { status: 'processing' });
  await new Promise(r => setTimeout(r, 900));

  // 步骤 3：数据脱敏清洗与 IP 地理位置补全
  addLog('warn', '⚠️ 规则过滤完成：4,982 条合格通过，18 条非法黑名单 IP 已被安全策略熔断拦截');
  addLog('info', '⚙️ 双路并行处理：执行敏感手机号身份证脱敏 & IP 离线库地理信息补全...');
  lf.setProperties('rule-filter-whitelist', { status: 'completed' });
  lf.setProperties('r-e2', { status: 'completed' });
  lf.setProperties('r-e3', { status: 'completed' });
  lf.setProperties('rule-transform-clean', { status: 'processing' });
  lf.setProperties('rule-transform-enrich', { status: 'processing' });
  lf.setProperties('r-e4', { status: 'processing' });
  lf.setProperties('r-e5', { status: 'processing' });
  await new Promise(r => setTimeout(r, 1000));

  // 步骤 4：落库完成
  addLog('success', '📤 汇聚输出完成：已实时推入 ES 索引 (audit_logs_v1) 并批量持久化入库 MySQL');
  addLog(
    'success',
    '✨ DAG 规则链全链路执行完毕！吞吐率: 5,000 TPS，端到端耗时: 38ms，成功率: 99.64%',
  );
  lf.setProperties('rule-transform-clean', { status: 'completed' });
  lf.setProperties('rule-transform-enrich', { status: 'completed' });
  lf.setProperties('r-e4', { status: 'completed' });
  lf.setProperties('r-e5', { status: 'completed' });
  lf.setProperties('rule-output-es', { status: 'completed' });
  lf.setProperties('rule-output-mysql', { status: 'completed' });

  isRuleSimulating.value = false;
};

const handleResetRulesGraph = () => {
  rulesGraphData.value = JSON.parse(JSON.stringify(initialRulesGraph));
  ruleSimulationLogs.value = [];
  lastEvent.value = '已重置规则链 DAG 初始拓扑';
  nextTick(() => {
    rulesDesignerRef.value?.fitView();
  });
};

const currentBadgeType = computed(() => {
  if (!currentSelected.value) return 'info';
  if (currentSelected.value.elementType === 'edge') return 'success';
  if (currentSelected.value.type.includes('task')) return 'warning';
  if (currentSelected.value.type.includes('gateway')) return 'danger';
  return 'primary';
});

// BPMN 2.0 互转对话框
const isBpmnDialogVisible = ref<boolean>(false);
const bpmnProcessName = ref<string>('业务审批差旅流程');
const bpmnXmlContent = ref<string>('');
const bpmnFileInput = ref<HTMLInputElement | null>(null);

const handleOpenBpmnDialog = () => {
  if (designerRef.value) {
    bpmnXmlContent.value = designerRef.value.exportBpmnXml({
      processName: bpmnProcessName.value,
    });
  }
  isBpmnDialogVisible.value = true;
};

const handleRefreshBpmnXml = () => {
  if (designerRef.value) {
    bpmnXmlContent.value = designerRef.value.exportBpmnXml({
      processName: bpmnProcessName.value,
    });
    lastEvent.value = '已从当前画布重新序列化生成 BPMN 2.0 XML';
  }
};

const handleApplyBpmnXml = () => {
  if (!designerRef.value || !bpmnXmlContent.value.trim()) return;
  try {
    const imported = designerRef.value.importBpmnXml(bpmnXmlContent.value);
    designerRef.value.fitView();
    isBpmnDialogVisible.value = false;
    lastEvent.value = `BPMN 2.0 XML 导入成功！还原 ${imported.nodes.length} 个节点，${imported.edges.length} 条连线`;
  } catch (err: unknown) {
    showAlert(`❌ 导入失败: ${(err as Error)?.message || 'XML 格式非法'}`, 4000);
  }
};

const handleTriggerUploadBpmn = () => {
  bpmnFileInput.value?.click();
};

const handleUploadBpmnFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      bpmnXmlContent.value = content;
      handleApplyBpmnXml();
    }
    input.value = '';
  };
  reader.readAsText(file);
};

const handleDownloadBpmnXml = () => {
  if (designerRef.value) {
    designerRef.value.downloadBpmnXml('approval-flow.bpmn20.xml', {
      processName: bpmnProcessName.value,
    });
    lastEvent.value = '已触发 approval-flow.bpmn20.xml 文件下载';
  }
};

// 高清快照导出对话框
const isSnapshotDialogVisible = ref<boolean>(false);
const snapshotFormat = ref<'png' | 'jpeg' | 'webp' | 'svg'>('png');
const snapshotDpr = ref<number>(2);
const snapshotPadding = ref<number>(40);
const snapshotBackground = ref<string>('#ffffff');
const snapshotEnableWatermark = ref<boolean>(true);
const snapshotWatermarkText = ref<string>('内部审批·绝密');
const snapshotPreviewUrl = ref<string>('');
const isSnapshotLoading = ref<boolean>(false);

const handleOpenSnapshotDialog = async () => {
  isSnapshotDialogVisible.value = true;
  await handleGenerateSnapshotPreview();
};

const handleGenerateSnapshotPreview = async () => {
  if (!designerRef.value) return;
  isSnapshotLoading.value = true;
  try {
    const url = await designerRef.value.exportSnapshot({
      format: snapshotFormat.value,
      dpr: snapshotDpr.value,
      padding: snapshotPadding.value,
      background: snapshotBackground.value,
      watermark: snapshotEnableWatermark.value
        ? {
            text: snapshotWatermarkText.value,
            color: 'rgba(0, 0, 0, 0.15)',
            opacity: 0.15,
          }
        : undefined,
    });
    snapshotPreviewUrl.value = url;
    lastEvent.value = `已生成 ${snapshotFormat.value.toUpperCase()} 高清全景快照预览 (DPR: ${snapshotDpr.value}x)`;
  } catch (err: unknown) {
    showAlert(`快照生成失败: ${(err as Error)?.message || '未知错误'}`, 4000);
  } finally {
    isSnapshotLoading.value = false;
  }
};

const handleDownloadSnapshot = async () => {
  if (!designerRef.value) return;
  await designerRef.value.downloadSnapshot({
    format: snapshotFormat.value,
    dpr: snapshotDpr.value,
    padding: snapshotPadding.value,
    background: snapshotBackground.value,
    filename: `flow-snapshot-${Date.now()}`,
    watermark: snapshotEnableWatermark.value
      ? {
          text: snapshotWatermarkText.value,
          color: 'rgba(0, 0, 0, 0.15)',
          opacity: 0.15,
        }
      : undefined,
  });
  lastEvent.value = `已成功下载 ${snapshotFormat.value.toUpperCase()} 高清全景快照文件`;
  isSnapshotDialogVisible.value = false;
};
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="sample-header__left">
        <div class="sample-title-row">
          <h1>@atengk/flow-vue 流程可视化展厅</h1>
          <div class="scene-switcher">
            <button
              class="scene-btn"
              :class="{ 'is-active': activeScene === 'designer' }"
              @click="activeScene = 'designer'"
            >
              🎨 展厅一：流程编排设计器
            </button>
            <button
              class="scene-btn"
              :class="{ 'is-active': activeScene === 'viewer' }"
              @click="activeScene = 'viewer'"
            >
              🔍 展厅二：运行态流转追踪器
            </button>
            <button
              class="scene-btn"
              :class="{ 'is-active': activeScene === 'rules' }"
              @click="activeScene = 'rules'"
            >
              ⚡ 展厅三：规则链 DAG 拓扑
            </button>
          </div>
        </div>
        <p class="sample-desc">
          {{
            activeScene === 'designer'
              ? '工单 #163~#168 验证：流程设计态物料拖拽、四向磁吸折线、属性抽屉双向回写、DAG 自动分层排版、静态拓扑校验、BPMN 互转与全景快照'
              : activeScene === 'viewer'
                ? '工单 #169 验证：运行态只读流转追踪器（AtengFlowViewer）、五态高亮与呼吸流动动效、悬停审批审计浮层（#audit-popover）、SmartFocus 待办智能聚焦与 WheelZoomGuard 滚轮防冲突'
                : '工单 #170 验证：低代码数据规则引擎（DAG 拓扑）、输入/过滤/转换/输出物料体系、平滑贝塞尔曲线路由（Bezier Edge）、防呆连线鉴权拦截与全链路动态流转模拟'
          }}
        </p>
      </div>

      <!-- 展厅一设计态按钮控制组 -->
      <div v-if="activeScene === 'designer'" class="sample-header__right">
        <button class="btn btn--card" @click="handleLoadVueCards">⭐ Vue 3 SFC 卡片流</button>
        <button class="btn btn--export" @click="handleOpenBpmnDialog">📄 BPMN 互转</button>
        <button class="btn btn--snapshot" @click="handleOpenSnapshotDialog">📷 高清快照</button>
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

        <!-- 隐藏的 BPMN 文件输入框 -->
        <input
          ref="bpmnFileInput"
          type="file"
          accept=".xml,.bpmn"
          style="display: none"
          @change="handleUploadBpmnFile"
        />
      </div>

      <!-- 展厅二运行态控制组 -->
      <div v-else-if="activeScene === 'viewer'" class="sample-header__right viewer-step-bar">
        <span class="step-label">审批流转模拟：</span>
        <el-radio-group v-model="currentViewerStep" size="small">
          <el-radio-button :value="1">1. 主管审批中</el-radio-button>
          <el-radio-button :value="2">2. 财务初审中 (当前)</el-radio-button>
          <el-radio-button :value="3">3. 总监审核中</el-radio-button>
          <el-radio-button :value="4">4. 办结归档</el-radio-button>
          <el-radio-button :value="5">5. 驳回修改</el-radio-button>
        </el-radio-group>
        <button class="btn btn--focus" @click="viewerRef?.focusActiveNode()">
          🎯 SmartFocus 居中待办
        </button>
        <button class="btn btn--fit" @click="viewerRef?.fitView()">[ ] 适应画布</button>
      </div>

      <!-- 展厅三规则链控制组 -->
      <div v-else class="sample-header__right rules-top-bar">
        <button class="btn btn--sim" :disabled="isRuleSimulating" @click="handleRunRuleSimulation">
          {{ isRuleSimulating ? '⏳ 规则流转中...' : '🚀 启动规则链模拟流转' }}
        </button>
        <button class="btn btn--reset" @click="handleResetRulesGraph">🔄 重置拓扑</button>
        <button class="btn btn--fit" @click="rulesDesignerRef?.fitView()">[ ] 适应画布</button>
        <button class="btn btn--dag" @click="rulesDesignerRef?.autoLayout('LR')">⇄ 水平排版</button>
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

    <main class="sample-main-wrapper">
      <!-- 展厅一：流程编排设计器 -->
      <div v-show="activeScene === 'designer'" class="sample-designer-wrapper">
        <AtengFlowDesigner
          ref="designerRef"
          v-model="graphData"
          :stencil-groups="stencilGroups"
          :custom-vue-nodes="customVueNodes"
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
      </div>

      <!-- 展厅二：运行态流转追踪器 -->
      <div v-show="activeScene === 'viewer'" class="sample-viewer-wrapper">
        <div class="viewer-order-card">
          <div class="viewer-order-card__header">
            <span class="viewer-order-tag">OA 采购审批单</span>
            <span class="viewer-order-id">单号：OA-20261027-8902</span>
            <span
              class="viewer-order-status"
              :class="`viewer-order-status--${currentViewerStep === 5 ? 'rejected' : currentViewerStep === 4 ? 'completed' : 'processing'}`"
            >
              {{
                currentViewerStep === 5
                  ? '● 已驳回'
                  : currentViewerStep === 4
                    ? '● 已办结'
                    : '● 流转中'
              }}
            </span>
          </div>
          <div class="viewer-order-card__body">
            <span><strong>事由：</strong>研发部 GPU 工作站与算力机架采购</span>
            <span><strong>申请人：</strong>张三 (系统架构组)</span>
            <span
              ><strong>报销金额：</strong
              ><span style="color: #ea580c; font-weight: 600">¥ 128,000.00</span></span
            >
            <span class="viewer-order-tip">
              💡
              提示：鼠标悬停在卡片或节点上自动弹出审批审计意见；普通滚轮直接平滑滚动外部页面，按住
              <kbd>Ctrl + 滚轮</kbd> 缩放画布。
            </span>
          </div>
        </div>

        <div class="viewer-canvas-box">
          <AtengFlowViewer
            ref="viewerRef"
            :model-value="viewerGraph"
            :status-map="viewerStatusMap"
            :custom-vue-nodes="customVueNodes"
            :focus-active-node="true"
            :wheel-zoom-guard="true"
            width="100%"
            height="100%"
          />
        </div>
      </div>

      <!-- 展厅三：低代码数据规则引擎 / DAG 拓扑 -->
      <div v-show="activeScene === 'rules'" class="sample-rules-wrapper">
        <div class="rules-top-card">
          <div class="rules-card-badge">低代码数据规则引擎 / DAG 拓扑</div>
          <div class="rules-card-tags">
            <span class="tag-pill tag-pill--bezier">〰️ 贝塞尔平滑曲线 (Bezier Edge)</span>
            <span class="tag-pill tag-pill--guard">🛡️ 规则鉴权防呆 (Auth Rules)</span>
            <span class="tag-pill tag-pill--dag">🔀 有向无环分层拓扑 (DAG)</span>
          </div>
          <div class="rules-card-tip">
            💡 试一试：尝试拖拽一条从“ES 审计检索(汇聚输出)”到“Kafka
            行为流(数据源)”的反向连线，或将“Kafka 行为流”直接连向“MySQL
            归档存储”，体验业务连线规则鉴权硬核拦截！
          </div>
        </div>

        <div class="rules-canvas-container">
          <div class="rules-designer-box">
            <AtengFlowDesigner
              ref="rulesDesignerRef"
              v-model="rulesGraphData"
              :stencil-groups="ruleStencilGroups"
              :before-connect="beforeRuleConnect"
              :options="{ edgeType: 'bezier', grid: { size: 10, visible: true, type: 'dot' } }"
              panel-width="360px"
              width="100%"
              height="100%"
            />
          </div>

          <!-- 规则链流转执行实时终端 -->
          <div class="rules-terminal">
            <div class="rules-terminal__header">
              <span class="rules-terminal__title">📟 规则链实时监控终端 (Execution Terminal)</span>
              <span v-if="isRuleSimulating" class="terminal-status-live">● 实时流转中</span>
              <span v-else class="terminal-status-idle">○ 待机就绪</span>
            </div>
            <div class="rules-terminal__body">
              <div v-if="ruleSimulationLogs.length === 0" class="terminal-empty">
                暂无流转日志。点击右上角【启动规则链模拟流转】观察贝塞尔曲线流动虚线动效与全链路执行日志！
              </div>
              <div
                v-for="(log, idx) in ruleSimulationLogs"
                :key="idx"
                class="terminal-line"
                :class="`terminal-line--${log.level}`"
              >
                <span class="terminal-time">[{{ log.time }}]</span>
                <span class="terminal-msg">{{ log.msg }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="sample-footer">
      <span>
        当前节点数:
        {{ activeScene === 'rules' ? rulesGraphData.nodes.length : graphData.nodes.length }}
      </span>
      <span>
        当前连线数:
        {{ activeScene === 'rules' ? rulesGraphData.edges.length : graphData.edges.length }}
      </span>
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

    <!-- BPMN 2.0 XML 互转对话框 -->
    <el-dialog
      v-model="isBpmnDialogVisible"
      title="BPMN 2.0 XML 协议互转面板 (Flowable / Camunda 兼容)"
      width="760px"
      destroy-on-close
    >
      <div class="bpmn-dialog-body">
        <el-alert type="info" :closable="false" show-icon title="双向保真协议转译">
          支持将 FlowGraph 与标准 BPMN 2.0 XML 双向互转，保留办理人、流转条件、坐标 Bounds 与折点
          Waypoint。
        </el-alert>

        <div class="bpmn-form-row">
          <label>流程定义名称：</label>
          <el-input v-model="bpmnProcessName" placeholder="输入流程定义名称" style="width: 240px" />
          <el-button type="primary" plain @click="handleRefreshBpmnXml">从画布重新生成</el-button>
          <el-button type="success" plain @click="handleTriggerUploadBpmn"
            >📥 本地上传 XML</el-button
          >
        </div>

        <el-input
          v-model="bpmnXmlContent"
          type="textarea"
          :rows="13"
          placeholder="BPMN 2.0 XML 内容"
          class="bpmn-xml-textarea"
        />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="isBpmnDialogVisible = false">取消</el-button>
          <el-button type="warning" plain @click="handleDownloadBpmnXml"
            >💾 下载 .bpmn20.xml</el-button
          >
          <el-button type="primary" @click="handleApplyBpmnXml">🚀 导入至当前画布</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 高清全景快照导出对话框 -->
    <el-dialog
      v-model="isSnapshotDialogVisible"
      title="全景高清快照导出 (矢量 SVG / 高清无损图片)"
      width="720px"
      destroy-on-close
    >
      <div class="snapshot-dialog-body">
        <el-form label-width="110px" size="default">
          <el-form-item label="导出格式">
            <el-radio-group v-model="snapshotFormat" @change="handleGenerateSnapshotPreview">
              <el-radio-button value="png">PNG (位图)</el-radio-button>
              <el-radio-button value="jpeg">JPEG (带底色)</el-radio-button>
              <el-radio-button value="webp">WebP (高压缩)</el-radio-button>
              <el-radio-button value="svg">SVG (无损矢量)</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="snapshotFormat !== 'svg'" label="高清放大倍率">
            <el-radio-group v-model="snapshotDpr" @change="handleGenerateSnapshotPreview">
              <el-radio-button :value="1">1x 标准</el-radio-button>
              <el-radio-button :value="2">2x 视网膜高清 (推荐)</el-radio-button>
              <el-radio-button :value="3">3x 印刷级超清</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="四周留白">
            <el-radio-group v-model="snapshotPadding" @change="handleGenerateSnapshotPreview">
              <el-radio-button :value="20">20px</el-radio-button>
              <el-radio-button :value="40">40px (标准)</el-radio-button>
              <el-radio-button :value="60">60px</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="防泄密水印">
            <div style="display: flex; align-items: center; gap: 12px; width: 100%">
              <el-switch
                v-model="snapshotEnableWatermark"
                @change="handleGenerateSnapshotPreview"
              />
              <el-input
                v-if="snapshotEnableWatermark"
                v-model="snapshotWatermarkText"
                placeholder="水印文本内容"
                style="max-width: 260px"
                @change="handleGenerateSnapshotPreview"
              />
            </div>
          </el-form-item>
        </el-form>

        <!-- 快照预览区 -->
        <div v-loading="isSnapshotLoading" class="snapshot-preview-box">
          <div v-if="snapshotPreviewUrl" class="snapshot-preview-inner">
            <img :src="snapshotPreviewUrl" alt="快照预览" />
          </div>
          <div v-else class="snapshot-empty-tip">暂无预览内容</div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="isSnapshotDialogVisible = false">取消</el-button>
          <el-button type="info" plain @click="handleGenerateSnapshotPreview">刷新预览</el-button>
          <el-button type="primary" @click="handleDownloadSnapshot">📥 确认下载文件</el-button>
        </div>
      </template>
    </el-dialog>
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

.btn--card {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(168, 85, 247, 0.25);
}
.btn--card:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
  transform: translateY(-1px);
}

.btn--export {
  background-color: #0284c7;
  color: #ffffff;
}
.btn--export:hover {
  background-color: #0369a1;
}

.btn--snapshot {
  background-color: #4f46e5;
  color: #ffffff;
}
.btn--snapshot:hover {
  background-color: #4338ca;
}

.bpmn-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bpmn-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #334155;
}

.bpmn-xml-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.snapshot-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.snapshot-preview-box {
  min-height: 200px;
  max-height: 320px;
  background-color: #f1f5f9;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 12px;
}

.snapshot-preview-inner img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  background-color: #ffffff;
}

.snapshot-empty-tip {
  color: #94a3b8;
  font-size: 13px;
}

/* 场景切换器 */
.sample-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.scene-switcher {
  display: inline-flex;
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.scene-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.scene-btn:hover {
  color: #0f172a;
}

.scene-btn.is-active {
  background-color: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sample-main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 展厅二：运行态样式 */
.viewer-step-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.sample-viewer-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.viewer-order-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.viewer-order-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.viewer-order-tag {
  background-color: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.viewer-order-id {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.viewer-order-status {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
}

.viewer-order-status--processing {
  background-color: #eff6ff;
  color: #2563eb;
}

.viewer-order-status--completed {
  background-color: #dcfce7;
  color: #16a34a;
}

.viewer-order-status--rejected {
  background-color: #fee2e2;
  color: #dc2626;
}

.viewer-order-card__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #334155;
}

.viewer-order-tip {
  color: #64748b;
  font-size: 11px;
}

.viewer-order-tip kbd {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
}

.viewer-canvas-box {
  flex: 1;
  min-height: 540px;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.btn--focus {
  background-color: #3b82f6;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 500;
}

.btn--focus:hover {
  background-color: #2563eb;
}

.btn--fit {
  background-color: #f8fafc;
  color: #334155;
}

/* 展厅三：低代码数据规则引擎 DAG 样式体系 */
.sample-rules-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 10px;
}

.rules-top-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  gap: 12px;
}

.rules-card-badge {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}

.rules-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #f1f5f9;
  color: #475569;
}

.tag-pill--bezier {
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.tag-pill--guard {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.tag-pill--dag {
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.rules-card-tip {
  width: 100%;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.rules-canvas-container {
  display: flex;
  flex: 1;
  min-height: 540px;
  gap: 12px;
  overflow: hidden;
}

.rules-designer-box {
  flex: 1;
  min-width: 0;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.rules-terminal {
  width: 380px;
  background-color: #0f172a;
  color: #f8fafc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.rules-terminal__header {
  padding: 10px 14px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.rules-terminal__title {
  font-weight: 600;
  color: #e2e8f0;
}

.terminal-status-live {
  color: #4ade80;
  font-size: 11px;
  font-weight: 600;
}

.terminal-status-idle {
  color: #94a3b8;
  font-size: 11px;
}

.rules-terminal__body {
  flex: 1;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.terminal-empty {
  color: #64748b;
  font-style: italic;
  line-height: 1.5;
}

.terminal-line {
  line-height: 1.4;
  word-break: break-all;
}

.terminal-line--info .terminal-msg {
  color: #93c5fd;
}

.terminal-line--warn .terminal-msg {
  color: #fde047;
}

.terminal-line--success .terminal-msg {
  color: #86efac;
}

.terminal-time {
  color: #64748b;
  margin-right: 6px;
}

.btn--sim {
  background-color: #10b981;
  color: #ffffff;
  border-color: #059669;
  font-weight: 500;
}

.btn--sim:hover:not(:disabled) {
  background-color: #059669;
}

.btn--sim:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--reset {
  background-color: #f1f5f9;
  color: #475569;
}
</style>

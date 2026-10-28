/**
 * 预设图元常量、分组元数据与小徽标字典。
 *
 * 依据 ADR-0033，定义核心图元类型常量、三段式物料分组与图标映射。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { FlowNode } from '../types';

export const FlowNodeType = {
  /** 开始事件节点 */
  START: 'flow:start',
  /** 结束事件节点 */
  END: 'flow:end',
  /** 人工审批任务节点 */
  USER_TASK: 'flow:user-task',
  /** 系统自动化服务任务节点 */
  SERVICE_TASK: 'flow:service-task',
  /** 抄送通知任务节点 */
  CC_TASK: 'flow:cc-task',
  /** 排他条件网关 */
  EXCLUSIVE_GATEWAY: 'flow:exclusive-gateway',
  /** 并行分支/汇聚网关 */
  PARALLEL_GATEWAY: 'flow:parallel-gateway',
} as const;

export type FlowNodeTypeValue = (typeof FlowNodeType)[keyof typeof FlowNodeType];

/**
 * 预设图元名称映射字典。
 */
export const NODE_TYPE_LABEL_MAP: Record<string, string> = {
  [FlowNodeType.START]: '开始事件',
  start: '开始事件',
  [FlowNodeType.END]: '结束事件',
  end: '结束事件',
  [FlowNodeType.USER_TASK]: '用户审批任务',
  'user-task': '用户审批任务',
  [FlowNodeType.SERVICE_TASK]: '自动化服务任务',
  'service-task': '自动化服务任务',
  [FlowNodeType.CC_TASK]: '抄送通知任务',
  'cc-task': '抄送通知任务',
  [FlowNodeType.EXCLUSIVE_GATEWAY]: '排他网关（条件分支）',
  'exclusive-gateway': '排他网关（条件分支）',
  [FlowNodeType.PARALLEL_GATEWAY]: '并行网关（聚合分流）',
  'parallel-gateway': '并行网关（聚合分流）',
};

/**
 * 预设图元小徽标图标字典。
 */
export const NODE_TYPE_ICON_MAP: Record<string, string> = {
  [FlowNodeType.START]: '▶',
  start: '▶',
  [FlowNodeType.END]: '■',
  end: '■',
  [FlowNodeType.USER_TASK]: '👤',
  'user-task': '👤',
  [FlowNodeType.SERVICE_TASK]: '⚙',
  'service-task': '⚙',
  [FlowNodeType.CC_TASK]: '✉',
  'cc-task': '✉',
  [FlowNodeType.EXCLUSIVE_GATEWAY]: '✕',
  'exclusive-gateway': '✕',
  [FlowNodeType.PARALLEL_GATEWAY]: '＋',
  'parallel-gateway': '＋',
};

/**
 * 获取图元徽标图标。
 *
 * @param type 图元类型
 * @returns 对应徽标字符
 */
export function getNodeBadgeIcon(type: string): string {
  if (NODE_TYPE_ICON_MAP[type]) {
    return NODE_TYPE_ICON_MAP[type];
  }
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(NODE_TYPE_ICON_MAP)) {
    if (lower.includes(key.toLowerCase())) {
      return icon;
    }
  }
  return '●';
}

/**
 * 物料面板图元条目契约。
 */
export interface StencilItem {
  /** 图元类型 */
  type: string;
  /** 显示标题 */
  label: string;
  /** 图元描述说明 */
  description?: string;
  /** 图标 SVG 或标识符 */
  icon?: string;
  /** 拖拽至画布时初始化的节点配置 */
  nodeConfig?: Partial<FlowNode>;
}

/**
 * 物料分类分组契约。
 */
export interface StencilGroup {
  /** 分组唯一标识 */
  id: string;
  /** 分组标题 */
  title: string;
  /** 组内图元清单 */
  items: StencilItem[];
}

/**
 * 默认三段式企业级物料分组清单。
 */
export const DEFAULT_STENCIL_GROUPS: StencilGroup[] = [
  {
    id: 'events',
    title: '事件图元 (Events)',
    items: [
      {
        type: FlowNodeType.START,
        label: '开始节点',
        description: '流程发起起始事件',
        nodeConfig: {
          text: '开始',
        },
      },
      {
        type: FlowNodeType.END,
        label: '结束节点',
        description: '流程终止结束事件',
        nodeConfig: {
          text: '结束',
        },
      },
    ],
  },
  {
    id: 'tasks',
    title: '任务图元 (Tasks)',
    items: [
      {
        type: FlowNodeType.USER_TASK,
        label: '人工审批',
        description: '需人工审核的审批任务',
        nodeConfig: {
          text: '人工审批',
        },
      },
      {
        type: FlowNodeType.SERVICE_TASK,
        label: '系统任务',
        description: '由系统自动调用的任务',
        nodeConfig: {
          text: '系统任务',
        },
      },
      {
        type: FlowNodeType.CC_TASK,
        label: '抄送节点',
        description: '流程信息抄送知会',
        nodeConfig: {
          text: '抄送节点',
        },
      },
    ],
  },
  {
    id: 'gateways',
    title: '网关控制 (Gateways)',
    items: [
      {
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        label: '排他网关',
        description: '条件排他分支路由',
        nodeConfig: {
          text: '×',
        },
      },
      {
        type: FlowNodeType.PARALLEL_GATEWAY,
        label: '并行网关',
        description: '多路并行并发与汇聚',
        nodeConfig: {
          text: '+',
        },
      },
    ],
  },
];

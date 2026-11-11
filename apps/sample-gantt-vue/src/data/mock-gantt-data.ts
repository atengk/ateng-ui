/**
 * sample-gantt-vue 离线自洽业务模拟数据集。
 *
 * 遵循 documentation-specification.md 规范，采用真实业务模型（研发项目排期、基线偏差工程排产），
 * 100% 杜绝 foo/bar/test 等测试假数据。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { GanttTaskRecord, GanttColumn, GanttDependencyLink } from '@atengk/gantt-vue';

/**
 * 敏捷研发项目多级 WBS 任务树数据集（含里程碑与层级嵌套）。
 */
export const agileWbsTasks: GanttTaskRecord[] = [
  {
    id: 1,
    name: 'Ateng-UI v2.0 架构升级 Epic',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    progress: 0.65,
    type: 'summary',
    children: [
      {
        id: 101,
        name: '需求澄清与领域建模',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        progress: 1,
        owner: '阿腾',
        priority: 'P0',
      },
      {
        id: 102,
        name: '底层无头状态机与契约设计',
        startDate: '2026-11-06',
        endDate: '2026-11-14',
        progress: 0.9,
        owner: '技术中台',
        priority: 'P0',
      },
      {
        id: 103,
        name: 'Canvas 渲染引擎与性能压测',
        startDate: '2026-11-15',
        endDate: '2026-11-24',
        progress: 0.45,
        owner: '图形组',
        priority: 'P1',
      },
      {
        id: 104,
        name: 'Alpha 内部评审里程碑',
        startDate: '2026-11-25',
        endDate: '2026-11-25',
        progress: 0,
        type: 'milestone',
        owner: '架构委员会',
        priority: 'P0',
      },
      {
        id: 105,
        name: '企业级场景看板与端到端交付',
        startDate: '2026-11-26',
        endDate: '2026-11-30',
        progress: 0.1,
        owner: '全栈团队',
        priority: 'P1',
      },
    ],
  },
  {
    id: 2,
    name: '全链路 APM 观测引擎改造',
    startDate: '2026-11-08',
    endDate: '2026-11-28',
    progress: 0.5,
    type: 'summary',
    children: [
      {
        id: 201,
        name: '白屏嗅探点阵优化',
        startDate: '2026-11-08',
        endDate: '2026-11-16',
        progress: 0.8,
        owner: '前端体验组',
        priority: 'P2',
      },
      {
        id: 202,
        name: 'OpenTelemetry 链路指标对齐',
        startDate: '2026-11-17',
        endDate: '2026-11-28',
        progress: 0.2,
        owner: '运维组',
        priority: 'P1',
      },
    ],
  },
];

/**
 * 敏捷研发树表列配置。
 */
export const agileColumns: GanttColumn[] = [
  { field: 'id', title: '序号', width: 60, align: 'center' },
  { field: 'name', title: '任务 / 需求项', width: 240, sortable: true, editor: 'input' },
  { field: 'owner', title: '负责人', width: 100, align: 'center', editor: 'input' },
  { field: 'priority', title: '优先级', width: 80, align: 'center', editor: 'input' },
  { field: 'progress', title: '进度', width: 90, align: 'center', editor: 'input' },
  { field: 'startDate', title: '计划开始', width: 110, align: 'center', editor: 'input' },
  { field: 'endDate', title: '计划交付', width: 110, align: 'center', editor: 'input' },
];

/**
 * 敏捷研发前后置依赖连线列表。
 */
export const agileDependencies: GanttDependencyLink[] = [
  { sourceId: 101, targetId: 102, type: 'FS' },
  { sourceId: 102, targetId: 103, type: 'FS' },
  { sourceId: 103, targetId: 104, type: 'FS' },
  { sourceId: 104, targetId: 105, type: 'FS' },
  { sourceId: 102, targetId: 201, type: 'SS' },
  { sourceId: 201, targetId: 202, type: 'FS' },
];

/**
 * 工程建设与基线偏差预警数据集（包含基准工期与延误偏差）。
 */
export const engineeringBaselineTasks: GanttTaskRecord[] = [
  {
    id: 'E1',
    name: '智慧云园区综合管廊建设工程',
    startDate: '2026-10-25',
    endDate: '2026-11-30',
    progress: 0.72,
    type: 'summary',
    baseline: {
      startDate: '2026-10-20',
      endDate: '2026-11-25',
    },
    children: [
      {
        id: 'E101',
        name: '地质勘探与基坑支护工程',
        startDate: '2026-10-25',
        endDate: '2026-11-04',
        progress: 1,
        baseline: {
          startDate: '2026-10-20',
          endDate: '2026-10-31',
        },
      },
      {
        id: 'E102',
        name: '主体钢结构吊装与浇筑 (受降雨延误)',
        startDate: '2026-11-05',
        endDate: '2026-11-20',
        progress: 0.6,
        baseline: {
          startDate: '2026-11-01',
          endDate: '2026-11-14',
        },
      },
      {
        id: 'E103',
        name: '强弱电机房管线敷设',
        startDate: '2026-11-15',
        endDate: '2026-11-26',
        progress: 0.35,
        baseline: {
          startDate: '2026-11-10',
          endDate: '2026-11-22',
        },
      },
      {
        id: 'E104',
        name: '消防水喷淋与联调联试里程碑',
        startDate: '2026-11-30',
        endDate: '2026-11-30',
        progress: 0,
        type: 'milestone',
        baseline: {
          startDate: '2026-11-25',
          endDate: '2026-11-25',
        },
      },
    ],
  },
];

/**
 * 工程建设列定义。
 */
export const engineeringColumns: GanttColumn[] = [
  { field: 'id', title: '工程编号', width: 90, align: 'center' },
  { field: 'name', title: '分部 / 分项工程', width: 250 },
  { field: 'startDate', title: '实际开始', width: 110, align: 'center' },
  { field: 'endDate', title: '实际结束', width: 110, align: 'center' },
  { field: 'progress', title: '工期进度', width: 85, align: 'center' },
];

/**
 * 多粒度动态时间轴数据集。
 */
export const scaleMacroTasks: GanttTaskRecord[] = [
  {
    id: 'M1',
    name: '2026 全年企业级数字化转型战役',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    progress: 0.85,
    type: 'summary',
    children: [
      {
        id: 'M1-Q1',
        name: 'Q1: 云原生基础设施容器化与上云',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        progress: 1,
      },
      {
        id: 'M1-Q2',
        name: 'Q2: 微服务拆分与分布式数据底座重构',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        progress: 1,
      },
      {
        id: 'M1-Q3',
        name: 'Q3: 统一前端工程套件与组件生态收敛',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        progress: 1,
      },
      {
        id: 'M1-Q4',
        name: 'Q4: 智能化与全景排程套件落地验证',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        progress: 0.45,
      },
    ],
  },
];

/**
 * @atengk/gantt-vue GanttRollup 单元测试。
 *
 * 验证 WBS 父子任务联动、自底向上工期范围汇总与工期加权进度计算。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import { GanttRollup } from '../src/engines/gantt-rollup';
import type { GanttTaskRecord } from '../src/types';

describe('GanttRollup Engine', () => {
  it('应当正确计算两个标准日期之间的工期天数', () => {
    // 同一天算 1 天
    expect(GanttRollup.calculateDuration('2026-11-01', '2026-11-01')).toBe(1);
    // 跨天工期
    expect(GanttRollup.calculateDuration('2026-11-01', '2026-11-05')).toBe(5);
    // 跨月工期
    expect(GanttRollup.calculateDuration('2026-10-30', '2026-11-02')).toBe(4);
    // 逆序日期保底为 1
    expect(GanttRollup.calculateDuration('2026-11-10', '2026-11-05')).toBe(1);
  });

  it('应当按子任务工期加权自动推算父任务的起止日期与加权完成进度', () => {
    const rollup = new GanttRollup();

    // 子任务 1: 11-01 到 11-05 (5天), 进度 100% -> 权重乘积 = 5 * 100 = 500
    // 子任务 2: 11-06 到 11-15 (10天), 进度 40% -> 权重乘积 = 10 * 40 = 400
    // 总工期权重 = 15 天，加权平均进度 = (500 + 400) / 15 = 60%
    // 父工期范围: min(11-01) ~ max(11-15)
    const tree: GanttTaskRecord[] = [
      {
        id: 'parent-1',
        name: '系统重构主工程',
        startDate: '2026-11-10', // 原始脏数据会被子任务真实范围修正
        endDate: '2026-11-12',
        progress: 0,
        children: [
          {
            id: 'sub-1',
            name: '子任务 1',
            startDate: '2026-11-01',
            endDate: '2026-11-05',
            progress: 100,
          },
          {
            id: 'sub-2',
            name: '子任务 2',
            startDate: '2026-11-06',
            endDate: '2026-11-15',
            progress: 40,
          },
        ],
      },
    ];

    const result = rollup.rollupTree(tree);

    expect(result[0].startDate).toBe('2026-11-01');
    expect(result[0].endDate).toBe('2026-11-15');
    expect(result[0].progress).toBe(60);
  });

  it('应当支持多层深度 WBS 树（3~4 级）自底向上正确累加推算', () => {
    const rollup = new GanttRollup();

    // 结构：
    // 项目总纲 (root)
    //   └── 模块 A (level-1)
    //         ├── 任务 A-1 (level-2, 11-01~11-05: 5天, 进度 100%)
    //         └── 任务 A-2 (level-2, 11-06~11-10: 5天, 进度 60%)
    //              -> 模块 A 进度 = (5*100 + 5*60)/10 = 80%, 工期 11-01~11-10 (10天)
    //   └── 模块 B (level-1, 11-11~11-20: 10天, 进度 40%)
    // -> 项目总纲总工期 = 10天 + 10天 = 20天
    // -> 项目总纲加权进度 = (10*80 + 10*40)/20 = 60%, 工期 11-01~11-20
    const tree: GanttTaskRecord[] = [
      {
        id: 'root',
        name: '项目总纲',
        children: [
          {
            id: 'mod-a',
            name: '模块 A',
            children: [
              {
                id: 'task-a1',
                name: '任务 A-1',
                startDate: '2026-11-01',
                endDate: '2026-11-05',
                progress: 100,
              },
              {
                id: 'task-a2',
                name: '任务 A-2',
                startDate: '2026-11-06',
                endDate: '2026-11-10',
                progress: 60,
              },
            ],
          },
          {
            id: 'mod-b',
            name: '模块 B',
            startDate: '2026-11-11',
            endDate: '2026-11-20',
            progress: 40,
          },
        ],
      },
    ];

    const result = rollup.rollupTree(tree);

    // 检查模块 A (自底向上第 1 级汇总)
    const modA = result[0].children?.[0];
    expect(modA?.startDate).toBe('2026-11-01');
    expect(modA?.endDate).toBe('2026-11-10');
    expect(modA?.progress).toBe(80);

    // 检查根节点 (自底向上第 2 级汇总)
    const root = result[0];
    expect(root.startDate).toBe('2026-11-01');
    expect(root.endDate).toBe('2026-11-20');
    expect(root.progress).toBe(60);
  });

  it('当配置 enabled: false (rollup: false) 时应当禁用自动推算并保留原始值', () => {
    const disabledRollup = new GanttRollup({ enabled: false });

    const tree: GanttTaskRecord[] = [
      {
        id: 'parent-1',
        name: '手工维护聚合节点',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        progress: 88,
        children: [
          {
            id: 'sub-1',
            name: '子项',
            startDate: '2026-11-05',
            endDate: '2026-11-06',
            progress: 10,
          },
        ],
      },
    ];

    const result = disabledRollup.rollupTree(tree);

    // 应当原封不动保持外部传入的值
    expect(result[0].startDate).toBe('2026-11-01');
    expect(result[0].endDate).toBe('2026-11-30');
    expect(result[0].progress).toBe(88);
  });

  it('单节点无子任务时应当安全保留原值，空数组保底返回空数组', () => {
    const rollup = new GanttRollup();

    expect(rollup.rollupTree([])).toEqual([]);

    const singleTask: GanttTaskRecord[] = [
      {
        id: 'leaf-1',
        name: '独立里程碑',
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        progress: 100,
      },
    ];

    const res = rollup.rollupTree(singleTask);
    expect(res[0].startDate).toBe('2026-11-15');
    expect(res[0].endDate).toBe('2026-11-15');
    expect(res[0].progress).toBe(100);
  });
});

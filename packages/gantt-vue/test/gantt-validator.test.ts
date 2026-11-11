/**
 * @atengk/gantt-vue GanttValidator 单元测试。
 *
 * 验证 DAG 有向无环图判环、自环拦截、依赖连线合法性校验与基线延误判定。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import { GanttValidator } from '../src/engines/gantt-validator';
import type { GanttDependencyLink, GanttTaskRecord } from '../src/types';

describe('GanttValidator Engine', () => {
  it('应当直接拦截自环连线 (source === target)', () => {
    const link: GanttDependencyLink = {
      sourceId: 'task-1',
      targetId: 'task-1',
      type: 'FS',
    };

    const result = GanttValidator.validateNewLink([], link);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('self_dependency');
  });

  it('应当正确允许合法的单向 DAG 依赖连线', () => {
    const existingLinks: GanttDependencyLink[] = [
      { sourceId: 'A', targetId: 'B', type: 'FS' },
      { sourceId: 'B', targetId: 'C', type: 'FS' },
    ];

    // 添加合法的 A -> C 连线
    const newLink1: GanttDependencyLink = { sourceId: 'A', targetId: 'C', type: 'FS' };
    expect(GanttValidator.validateNewLink(existingLinks, newLink1).valid).toBe(true);

    // 添加合法的 D -> A 连线
    const newLink2: GanttDependencyLink = { sourceId: 'D', targetId: 'A', type: 'FS' };
    expect(GanttValidator.validateNewLink(existingLinks, newLink2).valid).toBe(true);
  });

  it('应当快速失败拦截直接反向回路 (A -> B -> A)', () => {
    const existingLinks: GanttDependencyLink[] = [{ sourceId: 'A', targetId: 'B', type: 'FS' }];

    // 拟添加 B -> A，构成 A -> B -> A 环
    const invalidLink: GanttDependencyLink = {
      sourceId: 'B',
      targetId: 'A',
      type: 'FS',
    };

    const result = GanttValidator.validateNewLink(existingLinks, invalidLink);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('circular_dependency');
    expect(result.cyclePath).toBeDefined();
  });

  it('应当精准拦截多层间接复杂回路 (A -> B -> C -> D -> B)', () => {
    const existingLinks: GanttDependencyLink[] = [
      { sourceId: 'A', targetId: 'B', type: 'FS' },
      { sourceId: 'B', targetId: 'C', type: 'FS' },
      { sourceId: 'C', targetId: 'D', type: 'FS' },
    ];

    // 添加 D -> B 构成 B -> C -> D -> B 间接环
    const invalidLink: GanttDependencyLink = {
      sourceId: 'D',
      targetId: 'B',
      type: 'FS',
    };

    const result = GanttValidator.validateNewLink(existingLinks, invalidLink);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('circular_dependency');
  });

  it('应当支持全量存量依赖连线集的 DAG 完整性检测', () => {
    const validLinks: GanttDependencyLink[] = [
      { sourceId: '1', targetId: '2', type: 'FS' },
      { sourceId: '2', targetId: '3', type: 'FS' },
      { sourceId: '1', targetId: '3', type: 'SS' },
    ];
    expect(GanttValidator.validateAll(validLinks).valid).toBe(true);

    const circularLinks: GanttDependencyLink[] = [
      { sourceId: '1', targetId: '2', type: 'FS' },
      { sourceId: '2', targetId: '3', type: 'FS' },
      { sourceId: '3', targetId: '1', type: 'FS' },
    ];
    const invalidRes = GanttValidator.validateAll(circularLinks);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.reason).toBe('circular_dependency');
  });

  it('应当精准比对实际工期与基准工期，判断是否延误并计算滞后天数', () => {
    // 1. 未延误任务 (实际提前或按期完成)
    const onTimeTask: GanttTaskRecord = {
      id: 'task-1',
      name: '按期交付任务',
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      baseline: {
        startDate: '2026-11-01',
        endDate: '2026-11-10',
      },
    };
    const check1 = GanttValidator.isTaskDelayed(onTimeTask);
    expect(check1.delayed).toBe(false);
    expect(check1.delayDays).toBe(0);

    // 2. 滞后延误任务 (实际结束日期晚于基准结束日期 5 天)
    const delayedTask: GanttTaskRecord = {
      id: 'task-2',
      name: '滞后任务',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      baselineEndDate: '2026-11-10',
    };
    const check2 = GanttValidator.isTaskDelayed(delayedTask);
    expect(check2.delayed).toBe(true);
    expect(check2.delayDays).toBe(5);

    // 3. 无基准配置的任务默认不视为延误
    const noBaselineTask: GanttTaskRecord = {
      id: 'task-3',
      name: '无基准任务',
      startDate: '2026-11-01',
      endDate: '2026-11-20',
    };
    expect(GanttValidator.isTaskDelayed(noBaselineTask).delayed).toBe(false);
  });
});

/**
 * @atengk/gantt-vue 基座构建与类型契约基线单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import {
  GANTT_VUE_VERSION,
  type GanttScale,
  type GanttMode,
  type GanttDependencyType,
  type GanttTaskDependency,
  type GanttBaseline,
  type GanttTaskRecord,
  type GanttColumn,
  type GanttMarkLine,
  type GanttExportOptions,
} from '../src';

describe('@atengk/gantt-vue Baseline', () => {
  it('应当正确导出包版本常量与核心标识', () => {
    expect(GANTT_VUE_VERSION).toBe('1.0.0');
  });

  it('应当具备完备的 GanttScale 时间刻度联合类型约束', () => {
    const scales: GanttScale[] = ['day', 'week', 'month', 'quarter', 'year'];
    expect(scales).toHaveLength(5);
    expect(scales).toContain('day');
    expect(scales).toContain('week');
    expect(scales).toContain('month');
    expect(scales).toContain('quarter');
    expect(scales).toContain('year');
  });

  it('应当具备完备的 GanttMode 交互模式联合类型约束', () => {
    const modes: GanttMode[] = ['interactive', 'readonly'];
    expect(modes).toHaveLength(2);
    expect(modes).toContain('interactive');
    expect(modes).toContain('readonly');
  });

  it('应当具备完备的 GanttDependencyType 依赖连线类型约束', () => {
    const depTypes: GanttDependencyType[] = ['FS', 'SS', 'FF', 'SF'];
    expect(depTypes).toHaveLength(4);
    expect(depTypes).toContain('FS');
    expect(depTypes).toContain('SS');
    expect(depTypes).toContain('FF');
    expect(depTypes).toContain('SF');
  });

  it('应当正确构造 GanttTaskDependency 依赖契约', () => {
    const dep: GanttTaskDependency = {
      id: 'task-1',
      type: 'FS',
    };
    expect(dep.id).toBe('task-1');
    expect(dep.type).toBe('FS');
  });

  it('应当正确构造 GanttBaseline 计划基准线契约', () => {
    const baseline: GanttBaseline = {
      startDate: '2026-11-01',
      endDate: '2026-11-15',
    };
    expect(baseline.startDate).toBe('2026-11-01');
    expect(baseline.endDate).toBe('2026-11-15');
  });

  it('应当正确构造 GanttTaskRecord 标准任务实体契约', () => {
    const task: GanttTaskRecord = {
      id: 'task-101',
      name: '核心算法研发',
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      progress: 60,
      parentId: 'epic-1',
      dependencies: ['task-100', { id: 'task-99', type: 'SS' }],
      baseline: {
        startDate: '2026-11-01',
        endDate: '2026-11-08',
      },
      collapsed: false,
      type: 'task',
      assignee: 'Ateng',
      _customMeta: { priority: 'P0' },
    };

    expect(task.id).toBe('task-101');
    expect(task.name).toBe('核心算法研发');
    expect(task.progress).toBe(60);
    expect(task.dependencies).toHaveLength(2);
    expect(task.assignee).toBe('Ateng');
  });

  it('应当正确构造 GanttColumn 任务树表列定义契约', () => {
    const column: GanttColumn = {
      field: 'name',
      title: '任务名称',
      width: 240,
      minWidth: 150,
      align: 'left',
      sortable: true,
      editor: 'input',
    };

    expect(column.field).toBe('name');
    expect(column.title).toBe('任务名称');
    expect(column.width).toBe(240);
    expect(column.editor).toBe('input');
  });

  it('应当正确构造 GanttMarkLine 与 GanttExportOptions 契约', () => {
    const markLine: GanttMarkLine = {
      date: '2026-11-11',
      label: '今日发布',
      color: '#ef4444',
      style: 'solid',
    };

    const exportOptions: GanttExportOptions = {
      format: 'png',
      fileName: 'project-gantt-2026',
      pixelRatio: 2,
      viewRange: 'all',
      includeTable: true,
    };

    expect(markLine.label).toBe('今日发布');
    expect(markLine.style).toBe('solid');
    expect(exportOptions.format).toBe('png');
    expect(exportOptions.includeTable).toBe(true);
  });
});

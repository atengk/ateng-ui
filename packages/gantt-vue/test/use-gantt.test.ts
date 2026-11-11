/**
 * @atengk/gantt-vue useGantt 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGantt, type GanttTaskRecord } from '../src';

describe('useGantt Composable', () => {
  let container: HTMLDivElement;

  const sampleTasks: GanttTaskRecord[] = [
    {
      id: 'task-1',
      name: '架构设计',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      progress: 100,
    },
    {
      id: 'task-2',
      name: '核心编码',
      startDate: '2026-11-06',
      endDate: '2026-11-15',
      progress: 40,
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('应当正确挂载并初始化甘特图引擎实例', () => {
    const { ready, mount, dispose, taskCount, getRawGanttInstance } = useGantt({
      tasks: sampleTasks,
    });

    mount(container);

    expect(ready.value).toBe(true);
    expect(taskCount.value).toBe(2);
    expect(getRawGanttInstance()).not.toBeNull();

    dispose();
    expect(ready.value).toBe(false);
    expect(getRawGanttInstance()).toBeNull();
  });

  it('应当支持动态更新任务数据集并精准按 ID 检索', () => {
    const { mount, dispose, setTasks, getTasks, getTask, taskCount } = useGantt();

    mount(container);
    expect(taskCount.value).toBe(0);

    setTasks(sampleTasks);
    expect(taskCount.value).toBe(2);
    expect(getTasks()).toHaveLength(2);

    const task1 = getTask('task-1');
    expect(task1).not.toBeNull();
    expect(task1?.name).toBe('架构设计');

    const notFound = getTask('task-999');
    expect(notFound).toBeNull();

    dispose();
  });

  it('应当支持时间轴尺度缩放与模式切换', () => {
    const { mount, dispose, currentScale, setScale, zoomIn, zoomOut, currentMode, setMode } =
      useGantt({
        scale: 'week',
        mode: 'interactive',
      });

    mount(container);

    expect(currentScale.value).toBe('week');
    expect(currentMode.value).toBe('interactive');

    // 步进放大至 'day'
    zoomIn();
    expect(currentScale.value).toBe('day');

    // 步进缩小回 'week'
    zoomOut();
    expect(currentScale.value).toBe('week');

    // 手动切换至 'month'
    setScale('month');
    expect(currentScale.value).toBe('month');

    // 切换至只读模式
    setMode('readonly');
    expect(currentMode.value).toBe('readonly');

    dispose();
  });

  it('应当支持日期与任务视口定位方法调用且不抛错', () => {
    const { mount, dispose, scrollToDate, scrollToToday, scrollToTask, resize } = useGantt({
      tasks: sampleTasks,
    });

    mount(container);

    expect(() => {
      scrollToDate('2026-11-03');
      scrollToToday();
      scrollToTask('task-1');
      resize();
    }).not.toThrow();

    dispose();
  });

  it('应当支持树节点全部展开与折叠', () => {
    const { mount, dispose, expandAll, collapseAll, getTasks } = useGantt({
      tasks: sampleTasks,
    });

    mount(container);

    collapseAll();
    const collapsedTasks = getTasks();
    expect(collapsedTasks.every(t => t.collapsed === true)).toBe(true);

    expandAll();
    const expandedTasks = getTasks();
    expect(expandedTasks.every(t => t.collapsed === false)).toBe(true);

    dispose();
  });
});

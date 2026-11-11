/**
 * @atengk/gantt-vue AtengGantt 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengGantt, type GanttTaskRecord, type GanttColumn } from '../src';

describe('AtengGantt Component', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const sampleTasks: GanttTaskRecord[] = [
    {
      id: 1,
      name: '项目启动会',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      progress: 100,
    },
    {
      id: 2,
      name: '系统原型验证',
      startDate: '2026-11-03',
      endDate: '2026-11-08',
      progress: 30,
    },
  ];

  const sampleColumns: GanttColumn[] = [
    { field: 'id', title: 'ID', width: 60 },
    { field: 'name', title: '任务名称', width: 220 },
    { field: 'progress', title: '进度', width: 80 },
  ];

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应当正确挂载核心容器并渲染微工具栏', () => {
    wrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
        columns: sampleColumns,
        scale: 'day',
        showToolbar: true,
      },
    });

    expect(wrapper.classes()).toContain('at-gantt');
    expect(wrapper.find('.at-gantt__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-gantt__canvas-container').exists()).toBe(true);
  });

  it('当任务数组为空时应当展示空数据保底或自定义 empty 插槽', async () => {
    wrapper = mount(AtengGantt, {
      props: {
        tasks: [],
      },
      slots: {
        empty: '<div class="custom-empty-slot">暂无排程计划</div>',
      },
    });

    expect(wrapper.find('.custom-empty-slot').exists()).toBe(true);
    expect(wrapper.find('.custom-empty-slot').text()).toBe('暂无排程计划');
  });

  it('只读模式下应当应用只读修饰样式类', () => {
    wrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
        mode: 'readonly',
      },
    });

    expect(wrapper.classes()).toContain('at-gantt--readonly');
  });

  it('支持隐藏微工具栏或通过插槽完全自定义工具栏', () => {
    const customWrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
        showToolbar: false,
      },
    });
    expect(customWrapper.find('.at-gantt__toolbar').exists()).toBe(false);
    customWrapper.unmount();

    wrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
        showToolbar: true,
      },
      slots: {
        toolbar: '<div class="custom-toolbar">业务专属排程操作栏</div>',
      },
    });
    expect(wrapper.find('.custom-toolbar').exists()).toBe(true);
    expect(wrapper.find('.custom-toolbar').text()).toBe('业务专属排程操作栏');
  });

  it('应当通过 defineExpose 暴露完备的实例操作门面方法', () => {
    wrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
      },
    });

    const vm = wrapper.vm as unknown as Record<string, unknown>;
    expect(typeof vm.scrollToDate).toBe('function');
    expect(typeof vm.scrollToToday).toBe('function');
    expect(typeof vm.scrollToTask).toBe('function');
    expect(typeof vm.zoomIn).toBe('function');
    expect(typeof vm.zoomOut).toBe('function');
    expect(typeof vm.expandAll).toBe('function');
    expect(typeof vm.collapseAll).toBe('function');
    expect(typeof vm.setScale).toBe('function');
    expect(typeof vm.setMode).toBe('function');
    expect(typeof vm.setTasks).toBe('function');
    expect(typeof vm.getTasks).toBe('function');
    expect(typeof vm.getTask).toBe('function');
    expect(typeof vm.resize).toBe('function');
    expect(typeof vm.dispose).toBe('function');

    expect(vm.getTasks()).toHaveLength(2);
    expect(vm.getTask(1)?.name).toBe('项目启动会');
  });

  it('点击工具栏刻度按钮应当正确切换刻度并触发 update:scale 事件', async () => {
    wrapper = mount(AtengGantt, {
      props: {
        tasks: sampleTasks,
        scale: 'day',
      },
    });

    const buttons = wrapper.findAll('.at-gantt__scale-btn');
    expect(buttons.length).toBe(5);

    // 点击“周”刻度按钮
    const weekBtn = buttons.find(b => b.text() === '周');
    expect(weekBtn).toBeDefined();
    await weekBtn?.trigger('click');

    expect(wrapper.emitted('update:scale')).toBeTruthy();
    expect(wrapper.emitted('update:scale')?.[0]).toEqual(['week']);
  });
});

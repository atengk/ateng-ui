/**
 * AtengGanttModal 单元测试套件。
 *
 * 验证模态弹窗脱壳挂载、真全屏切换、保存/取消事件派发、ESC/遮罩交互与高阶门面方法暴露。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import AtengGanttModal from '../src/components/AtengGanttModal.vue';
import type { GanttTaskRecord, AtengGanttModalExpose } from '../src/types';

describe('AtengGanttModal Component', () => {
  let wrapper: VueWrapper<InstanceType<typeof AtengGanttModal>> | null = null;

  const mockTasks: GanttTaskRecord[] = [
    {
      id: 1,
      name: '项目需求评审',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      progress: 1,
    },
    {
      id: 2,
      name: '核心架构实现',
      startDate: '2026-11-06',
      endDate: '2026-11-12',
      progress: 0.6,
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应当正确挂载脱壳模态弹窗至 document.body 并渲染标题', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        title: '敏捷项目甘特图',
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const modal = document.body.querySelector('.at-gantt-modal');
    expect(modal).not.toBeNull();

    const titleEl = document.body.querySelector('.at-gantt-modal__title');
    expect(titleEl?.textContent).toBe('敏捷项目甘特图');

    // 弹窗内部应当挂载 AtengGantt
    const ganttEl = document.body.querySelector('.at-gantt');
    expect(ganttEl).not.toBeNull();
  });

  it('点击全屏切换按钮应当切换全屏模式并派发 update:fullscreen', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        fullscreen: false,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const fullscreenBtn = document.body.querySelector(
      '.at-gantt-modal__action-btn',
    ) as HTMLButtonElement;
    expect(fullscreenBtn).not.toBeNull();

    await fullscreenBtn.click();
    await nextTick();

    expect(wrapper.emitted('update:fullscreen')).toBeTruthy();
    expect(wrapper.emitted('update:fullscreen')?.[0]).toEqual([true]);

    const modal = document.body.querySelector('.at-gantt-modal');
    expect(modal?.classList.contains('at-gantt-modal--fullscreen')).toBe(true);
  });

  it('点击取消按钮应当触发 cancel 并通知关闭弹窗', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const cancelBtn = document.body.querySelector(
      '.at-gantt-modal__btn--default',
    ) as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn.textContent?.trim()).toBe('取消');

    await cancelBtn.click();
    await nextTick();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('点击保存按钮应当触发 save 与 update:tasks 并携带当前数据集', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const saveBtn = document.body.querySelector(
      '.at-gantt-modal__btn--primary',
    ) as HTMLButtonElement;
    expect(saveBtn).not.toBeNull();
    expect(saveBtn.textContent?.trim()).toBe('保存');

    await saveBtn.click();
    await nextTick();

    expect(wrapper.emitted('save')).toBeTruthy();
    const savedData = wrapper.emitted('save')?.[0]?.[0] as GanttTaskRecord[];
    expect(savedData.length).toBe(mockTasks.length);
    expect(wrapper.emitted('update:tasks')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('点击背景遮罩层应当在 closeOnClickModal 为 true 时触发关闭', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        closeOnClickModal: true,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const mask = document.body.querySelector('.at-gantt-modal__mask') as HTMLElement;
    expect(mask).not.toBeNull();

    await mask.click();
    await nextTick();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('按下 ESC 键应当在 closeOnPressEscape 为 true 时触发关闭', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        closeOnPressEscape: true,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('应当通过 defineExpose 显式暴露完整的门面方法', async () => {
    wrapper = mount(AtengGanttModal, {
      props: {
        modelValue: true,
        tasks: mockTasks,
      },
      attachTo: document.body,
    });

    await nextTick();

    const exposed = wrapper.vm as unknown as AtengGanttModalExpose;

    expect(typeof exposed.open).toBe('function');
    expect(typeof exposed.close).toBe('function');
    expect(typeof exposed.cancel).toBe('function');
    expect(typeof exposed.save).toBe('function');
    expect(typeof exposed.toggleFullscreen).toBe('function');
    expect(typeof exposed.scrollToToday).toBe('function');
    expect(typeof exposed.scrollToDate).toBe('function');
    expect(typeof exposed.scrollToTask).toBe('function');
    expect(typeof exposed.zoomIn).toBe('function');
    expect(typeof exposed.zoomOut).toBe('function');
    expect(typeof exposed.expandAll).toBe('function');
    expect(typeof exposed.collapseAll).toBe('function');
    expect(typeof exposed.exportImage).toBe('function');
    expect(typeof exposed.getTask).toBe('function');
    expect(typeof exposed.getTasks).toBe('function');
    expect(typeof exposed.getRawGanttInstance).toBe('function');
    expect(typeof exposed.resize).toBe('function');

    // 验证 getTasks 正确返回
    const tasks = exposed.getTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(mockTasks.length);

    // 验证 getTask 按 ID 检索
    const task = exposed.getTask(1);
    expect(task).not.toBeNull();
    expect(task?.name).toBe('项目需求评审');
  });
});

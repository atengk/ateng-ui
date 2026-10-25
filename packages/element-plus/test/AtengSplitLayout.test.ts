/**
 * AtengSplitLayout 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengSplitLayout } from '../src/components/split-layout';

describe('AtengSplitLayout 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('基础渲染：左右两栏结构与默认尺寸', () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '300px',
      },
      slots: {
        first: '<div class="left-tree">部门树</div>',
        second: '<div class="right-table">员工列表</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-split-layout');
    expect(wrapper.classes()).toContain('is-horizontal');
    expect(wrapper.find('.left-tree').exists()).toBe(true);
    expect(wrapper.find('.right-table').exists()).toBe(true);

    const firstPane = wrapper.find('.at-split-layout__first');
    expect(firstPane.attributes('style')).toContain('width: 300px');
  });

  it('方向支持：vertical 垂直分栏模式', () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        direction: 'vertical',
        defaultSize: '200px',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-vertical');
    const firstPane = wrapper.find('.at-split-layout__first');
    expect(firstPane.attributes('style')).toContain('height: 200px');
  });

  it('一键折叠把手交互', async () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '260px',
        collapsible: true,
      },
      attachTo: document.body,
    });

    const collapseBtn = wrapper.find('.at-split-layout__collapse-btn');
    expect(collapseBtn.exists()).toBe(true);

    // 点击收起
    await collapseBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-collapsed');
    expect(wrapper.emitted('collapse')).toBeTruthy();
    expect(wrapper.emitted('update:collapsed')![0]).toEqual([true]);

    // 再次点击展开
    await collapseBtn.trigger('click');
    expect(wrapper.classes()).not.toContain('is-collapsed');
    expect(wrapper.emitted('update:collapsed')![1]).toEqual([false]);
  });

  it('本地偏好持久化 (storageKey)', async () => {
    const key = 'test_dept_split';
    wrapper = mount(AtengSplitLayout, {
      props: {
        storageKey: key,
        defaultSize: '250px',
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as unknown as { setSize: (size: string) => void };
    vm.setSize('350px');

    const saved = localStorage.getItem(`ateng_split_${key}`);
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.size).toBe('350px');
  });

  it('W3C Pointer Events 拖拽与指针捕获', async () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '200px',
      },
      attachTo: document.body,
    });

    const splitter = wrapper.find('.at-split-layout__splitter');
    expect(splitter.exists()).toBe(true);

    let captureId: number | null = null;
    let releaseId: number | null = null;
    splitter.element.setPointerCapture = (id: number) => {
      captureId = id;
    };
    splitter.element.releasePointerCapture = (id: number) => {
      releaseId = id;
    };

    // 触发 pointerdown
    const downEvent = new PointerEvent('pointerdown', {
      pointerId: 1,
      clientX: 200,
      clientY: 100,
      bubbles: true,
    });
    splitter.element.dispatchEvent(downEvent);
    expect(captureId).toBe(1);

    // 触发 pointerup
    const upEvent = new PointerEvent('pointerup', {
      pointerId: 1,
      clientX: 260,
      clientY: 100,
      bubbles: true,
    });
    window.dispatchEvent(upEvent);
    expect(releaseId).toBe(1);
  });

  it('双向把手与次栏折叠 (collapseTarget="second" / "both")', async () => {
    // 1. 测试次栏折叠 target="second"
    wrapper = mount(AtengSplitLayout, {
      props: {
        collapseTarget: 'second',
        defaultSize: '200px',
      },
      attachTo: document.body,
    });

    const secondBtn = wrapper.find('.at-split-layout__collapse-btn.is-second');
    expect(secondBtn.exists()).toBe(true);
    expect(wrapper.find('.at-split-layout__collapse-btn.is-first').exists()).toBe(false);

    await secondBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-second-collapsed');
    expect(wrapper.emitted('secondCollapse')).toBeTruthy();
    expect(wrapper.emitted('update:secondCollapsed')![0]).toEqual([true]);

    wrapper.unmount();

    // 2. 测试双向把手 target="both"
    wrapper = mount(AtengSplitLayout, {
      props: {
        collapseTarget: 'both',
        defaultSize: '200px',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-split-layout__collapse-btn.is-first').exists()).toBe(true);
    expect(wrapper.find('.at-split-layout__collapse-btn.is-second').exists()).toBe(true);
  });

  it('双向状态持久化恢复 (storageKey)', async () => {
    const key = 'dual_collapse_storage';
    localStorage.setItem(
      `ateng_split_${key}`,
      JSON.stringify({ size: '280px', collapsed: false, secondCollapsed: true }),
    );

    wrapper = mount(AtengSplitLayout, {
      props: {
        storageKey: key,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-second-collapsed');
    expect(wrapper.classes()).not.toContain('is-collapsed');
    // 次栏处于折叠态，尺寸为 0
    expect(wrapper.find('.at-split-layout__second').attributes('style')).toContain('width: 0px');

    // 展开次栏后，首栏还原为存储的 280px
    const vm = wrapper.vm as unknown as { toggleSecondCollapse: () => void };
    vm.toggleSecondCollapse();
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).not.toContain('is-second-collapsed');
    expect(wrapper.find('.at-split-layout__first').attributes('style')).toContain('width: 280px');
  });

  it('边缘阻尼磁吸附 (snapThreshold)：逼近临界值吸附折叠，反向拉出恢复有效宽度', async () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '200px',
        min: '100px',
        snapThreshold: 30,
      },
      attachTo: document.body,
    });

    const splitter = wrapper.find('.at-split-layout__splitter');
    const container = wrapper.element as HTMLElement;
    Object.defineProperty(container, 'offsetWidth', { value: 1000, configurable: true });

    const firstPane = wrapper.find('.at-split-layout__first').element as HTMLElement;
    Object.defineProperty(firstPane, 'offsetWidth', { value: 200, configurable: true });

    // 1. 模拟 pointerdown
    splitter.element.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 200, bubbles: true }),
    );

    // 2. 向左拖拽至 60px (低于 min 100px - snapThreshold 30px = 70px) -> 触发磁吸附折叠
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 60, bubbles: true }),
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('is-collapsed');
    expect(wrapper.emitted('collapse')).toBeTruthy();
    expect(wrapper.emitted('update:collapsed')![0]).toEqual([true]);

    // 3. 反向向右拉出至 120px (拉出临界值) -> 平滑恢复至吸附前宽度
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 120, bubbles: true }),
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).not.toContain('is-collapsed');
    expect(wrapper.emitted('update:collapsed')![1]).toEqual([false]);

    // 4. 释放指针
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
  });

  it('双击把手交互 (dblclick)：在记忆宽度与折叠状态之间快速切换', async () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '260px',
        collapsible: true,
      },
      attachTo: document.body,
    });

    const splitter = wrapper.find('.at-split-layout__splitter');
    expect(splitter.exists()).toBe(true);

    // 初始状态未折叠
    expect(wrapper.classes()).not.toContain('is-collapsed');

    // 双击把手 -> 快速折叠
    await splitter.trigger('dblclick');
    expect(wrapper.classes()).toContain('is-collapsed');
    expect(wrapper.emitted('update:collapsed')![0]).toEqual([true]);

    // 再次双击把手 -> 快速恢复记忆宽度
    await splitter.trigger('dblclick');
    expect(wrapper.classes()).not.toContain('is-collapsed');
    expect(wrapper.emitted('update:collapsed')![1]).toEqual([false]);
    expect(wrapper.find('.at-split-layout__first').attributes('style')).toContain('width: 260px');
  });

  it('无障碍 A11y 属性与键盘微调：role="separator"、方向键 8px 及 Shift 32px 快速步进', async () => {
    wrapper = mount(AtengSplitLayout, {
      props: {
        defaultSize: '200px',
        min: '100px',
        max: '500px',
      },
      attachTo: document.body,
    });

    const splitter = wrapper.find('.at-split-layout__splitter');
    expect(splitter.attributes('role')).toBe('separator');
    expect(splitter.attributes('tabindex')).toBe('0');
    expect(splitter.attributes('aria-valuenow')).toBe('200');

    const container = wrapper.element as HTMLElement;
    Object.defineProperty(container, 'offsetWidth', { value: 1000, configurable: true });

    // 1. 按右方向键微调增加 8px (200 + 8 = 208px)
    await splitter.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['208px']);

    // 2. 按住 Shift 键按右方向键增加 32px (208 + 32 = 240px)
    await splitter.trigger('keydown', { key: 'ArrowRight', shiftKey: true });
    expect(wrapper.emitted('update:modelValue')![1]).toEqual(['240px']);

    // 3. 按左方向键微调减少 8px (240 - 8 = 232px)
    await splitter.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')![2]).toEqual(['232px']);
  });
});

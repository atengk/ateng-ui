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
});

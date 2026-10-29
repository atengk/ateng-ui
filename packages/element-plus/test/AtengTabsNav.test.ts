/**
 * AtengTabsNav 基础多标签页导航组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengTabsNav } from '../src/components/tabs-nav';
import type { TabItem } from '../src';

describe('AtengTabsNav Component', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  const mockTabs: TabItem[] = [
    { key: '/home', title: '首页', affix: true },
    { key: '/users', title: '用户管理', closable: true },
    { key: '/settings', title: '系统设置', closable: true },
  ];

  it('1. 默认渲染标签栏结构与根样式类', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
      },
    });

    expect(wrapper.classes()).toContain('at-tabs-nav');
    expect(wrapper.classes()).toContain('at-tabs-nav--card');
    const tabElements = wrapper.findAll('.at-tabs-nav__item');
    expect(tabElements).toHaveLength(3);
  });

  it('2. 正确高亮当前激活标签 (is-active)', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/users',
      },
    });

    const activeItem = wrapper.find('.at-tabs-nav__item.is-active');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain('用户管理');
  });

  it('3. 固定标签 (affix: true) 不渲染关闭按钮，普通标签渲染关闭按钮', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
      },
    });

    const items = wrapper.findAll('.at-tabs-nav__item');
    // 首项为 affix 标签，无关闭按钮
    expect(items[0].find('.at-tabs-nav__close').exists()).toBe(false);
    // 第二项为普通标签，存在关闭按钮
    expect(items[1].find('.at-tabs-nav__close').exists()).toBe(true);
  });

  it('4. 点击标签派发 tabClick 与 update:modelValue 事件', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
      },
    });

    const items = wrapper.findAll('.at-tabs-nav__item');
    await items[1].trigger('click');

    expect(wrapper.emitted('tabClick')).toBeTruthy();
    expect(wrapper.emitted('tabClick')?.[0]?.[0]).toEqual(mockTabs[1]);
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('/users');
  });

  it('5. 点击关闭按钮派发 tabClose 事件', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
      },
    });

    const closeBtn = wrapper.findAll('.at-tabs-nav__close')[0];
    await closeBtn.trigger('click');

    expect(wrapper.emitted('tabClose')).toBeTruthy();
    expect(wrapper.emitted('tabClose')?.[0]?.[0]).toBe('/users');
    expect(wrapper.emitted('tabClose')?.[0]?.[1]).toEqual(mockTabs[1]);
  });

  it('6. 支持通过 styleType 切换 pill / line 视觉形态类名', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
        styleType: 'pill',
      },
    });

    expect(wrapper.classes()).toContain('at-tabs-nav--pill');
    expect(wrapper.classes()).not.toContain('at-tabs-nav--card');
  });

  it('7. 最大化按钮切换：点击最大化按钮派发 maximizeChange 与 update:isMaximized', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
        showMaximize: true,
        isMaximized: false,
      },
    });

    const maxBtn = wrapper.find('.at-tabs-nav__maximize-btn');
    expect(maxBtn.exists()).toBe(true);

    await maxBtn.trigger('click');
    expect(wrapper.emitted('maximizeChange')).toBeTruthy();
    expect(wrapper.emitted('maximizeChange')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('update:isMaximized')?.[0]?.[0]).toBe(true);
  });

  it('8. 原生拖拽排序：固定标签不可拖拽，普通标签支持拖拽重排并派发 tabOrderChange', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
        draggable: true,
      },
    });

    const items = wrapper.findAll('.at-tabs-nav__item');
    // 首项 affix: true 不可拖拽
    expect(items[0].attributes('draggable')).toBe('false');
    // 第二项普通标签可拖拽
    expect(items[1].attributes('draggable')).toBe('true');

    // 模拟拖拽操作：从索引 2 (settings) 拖到索引 1 (users)
    await items[2].trigger('dragstart', {
      dataTransfer: {
        setData: () => {},
        effectAllowed: 'move',
      },
    });

    await items[1].trigger('dragover');
    await items[1].trigger('drop');

    expect(wrapper.emitted('tabOrderChange')).toBeTruthy();
    const newTabs = wrapper.emitted('tabOrderChange')?.[0]?.[0] as TabItem[];
    expect(newTabs.map(t => t.key)).toEqual(['/home', '/settings', '/users']);
  });

  it('9. 快捷操作下拉面板：showQuickActions 为 true 时渲染快捷操作按钮', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
        showQuickActions: true,
      },
    });

    const quickActions = wrapper.find('.at-tabs-nav__quick-actions');
    expect(quickActions.exists()).toBe(true);
  });

  it('10. 批量关闭操作：触发关闭其他/全部关闭时为每个关闭项派发 tabClose 并同步 update:tabs', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs, // [/home (affix), /users, /settings]
        modelValue: '/users',
        showQuickActions: true,
      },
    });

    const quickDropdown = wrapper
      .find('.at-tabs-nav__quick-actions')
      .findComponent({ name: 'ElDropdown' });
    expect(quickDropdown.exists()).toBe(true);

    // 触发 closeOthers 命令（当前在 /users）
    quickDropdown.vm.$emit('command', 'closeOthers');

    // /settings 是非固定且非激活项，应被关闭并派发 tabClose
    expect(wrapper.emitted('tabClose')).toBeTruthy();
    expect(wrapper.emitted('tabClose')?.[0]?.[0]).toBe('/settings');

    // 剩余标签为 /home 和 /users
    const updatedTabs = wrapper.emitted('update:tabs')?.[0]?.[0] as TabItem[];
    expect(updatedTabs.map(t => t.key)).toEqual(['/home', '/users']);
  });
});

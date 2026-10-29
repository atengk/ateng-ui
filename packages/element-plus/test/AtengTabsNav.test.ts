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
});

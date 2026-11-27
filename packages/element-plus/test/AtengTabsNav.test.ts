/**
 * AtengTabsNav 基础多标签页导航组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, afterEach } from 'vitest';
import { h, nextTick } from 'vue';
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
    // 同时默认补发 @batch-close 语义事件
    expect(wrapper.emitted('batchClose')?.[0]?.[0]).toMatchObject({
      command: 'closeOthers',
      closedTabs: [expect.objectContaining({ key: '/settings' })],
      remainingTabs: [
        expect.objectContaining({ key: '/home' }),
        expect.objectContaining({ key: '/users' }),
      ],
      nextActiveKey: '/users',
    });
  });

  it('11. emitCloseOnBatch=false：批量关闭仅派发 @batch-close / update:tabs / update:modelValue，不连发 N 次 tabClose', () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/users',
        showQuickActions: true,
        emitCloseOnBatch: false,
      },
    });

    const quickDropdown = wrapper
      .find('.at-tabs-nav__quick-actions')
      .findComponent({ name: 'ElDropdown' });
    quickDropdown.vm.$emit('command', 'closeAll');

    expect(wrapper.emitted('tabClose')).toBeUndefined();
    expect(wrapper.emitted('batchClose')?.[0]?.[0]).toMatchObject({
      command: 'closeAll',
      closedTabs: [
        expect.objectContaining({ key: '/users' }),
        expect.objectContaining({ key: '/settings' }),
      ],
      remainingTabs: [expect.objectContaining({ key: '/home' })],
      nextActiveKey: '/home',
    });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['/home']);
  });

  it('12. 菜单纯矢量 SVG 图标、menuIcons 定制/隐藏与 #menuIcon 插槽，同步校验快捷下拉 :disabled 状态', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: [{ key: '/home', title: '首页', affix: true }],
        modelValue: '/home',
        contextMenu: true,
        showQuickActions: true,
      },
      global: {
        stubs: {
          ElDropdown: {
            template: '<div class="stub-el-dropdown"><slot /><slot name="dropdown" /></div>',
          },
          ElDropdownMenu: {
            template: '<ul class="stub-el-dropdown-menu"><slot /></ul>',
          },
          ElDropdownItem: {
            props: { command: String, disabled: Boolean, divided: Boolean },
            template:
              '<li class="stub-el-dropdown-item" :data-command="command" :data-disabled="String(Boolean(disabled))"><slot /></li>',
          },
        },
      },
    });

    const dropdownMenus = wrapper.findAll('.stub-el-dropdown-menu');
    expect(dropdownMenus.length).toBeGreaterThanOrEqual(2);
    // 右键菜单与快捷菜单都不应含 Emoji
    for (const emoji of ['🔄', '❌', '🚫', '⬅️', '➡️', '🧹']) {
      expect(wrapper.html()).not.toContain(emoji);
    }
    // 含内置矢量 SVG 图标
    expect(wrapper.findAll('.at-tabs-nav__menu-icon svg').length).toBeGreaterThanOrEqual(5);

    // 快捷下拉面板在仅剩固定标签时，关闭类全部 disabled
    const quickMenu = dropdownMenus[dropdownMenus.length - 1]!;
    const quickItems = quickMenu.findAll('.stub-el-dropdown-item');
    const getDisabled = (cmd: string) =>
      quickItems.find(i => i.attributes('data-command') === cmd)?.attributes('data-disabled');
    expect(getDisabled('refresh')).toBe('false');
    expect(getDisabled('closeOthers')).toBe('true');
    expect(getDisabled('closeLeft')).toBe('true');
    expect(getDisabled('closeRight')).toBe('true');
    expect(getDisabled('closeAll')).toBe('true');

    // menuIcons 支持 false 隐藏特定命令图标并支持自定义类/组件
    await wrapper.setProps({
      menuIcons: {
        refresh: false,
        closeAll: 'custom-sweep-icon',
      },
    });
    const refreshItem = quickItems.find(i => i.attributes('data-command') === 'refresh')!;
    expect(refreshItem.find('.at-tabs-nav__menu-icon').exists()).toBe(false);
    const closeAllItem = quickItems.find(i => i.attributes('data-command') === 'closeAll')!;
    expect(closeAllItem.find('.custom-sweep-icon').exists()).toBe(true);
  });

  it('13. TabItem.icon 支持函数式组件、iconResolver 与 #tabIcon 插槽', async () => {
    const FunctionalIcon = () => h('svg', { class: 'functional-tab-svg' });

    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: [
          { key: '/fn', title: '函数图标', icon: FunctionalIcon },
          { key: '/str', title: '字符串图标', icon: 'ep:user' },
        ],
        modelValue: '/fn',
        iconResolver: (icon, tab, idx) =>
          icon === 'ep:user' ? `resolved-${tab.key}-${idx}` : icon,
      },
    });

    await nextTick();
    expect(wrapper.find('.functional-tab-svg').exists()).toBe(true);
    expect(wrapper.find('i.resolved-\\/str-1').exists()).toBe(true);

    // #tabIcon 覆写默认图标渲染
    const slotWrapper = mount(AtengTabsNav, {
      props: {
        tabs: [{ key: '/a', title: 'A', icon: 'ep:setting' }],
        modelValue: '/a',
      },
      slots: {
        tabIcon: ({ icon, active }: { icon: unknown; active: boolean }) =>
          h('span', { class: 'custom-tab-icon-slot', 'data-active': String(active) }, String(icon)),
      },
    });
    expect(slotWrapper.find('.custom-tab-icon-slot').text()).toBe('ep:setting');
    expect(slotWrapper.find('.custom-tab-icon-slot').attributes('data-active')).toBe('true');
    slotWrapper.unmount();
  });

  it('14. ARIA 结构合规：role="tablist" 仅收口于轨道节点，辅助区与关闭图标无嵌套角色冲突', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/users',
        contextMenu: true,
        showQuickActions: true,
        showMaximize: true,
      },
      slots: {
        prefix: () => h('button', { type: 'button', class: 'slot-prefix-btn' }, '前置按钮'),
        suffix: () => h('button', { type: 'button', class: 'slot-suffix-btn' }, '后置按钮'),
        extra: () => h('button', { type: 'button', class: 'slot-extra-btn' }, '扩展按钮'),
      },
    });

    // 1. 根容器不应再承担 role="tablist"
    expect(wrapper.attributes('role')).toBeUndefined();

    // 2. role="tablist" 严格收口到 .at-tabs-nav__track 且具备可访问名称
    const tablist = wrapper.find('.at-tabs-nav__track');
    expect(tablist.attributes('role')).toBe('tablist');
    expect(tablist.attributes('aria-label')).toBe('页面标签栏');

    // 3. 辅助插槽、快捷菜单、最大化与共享右键菜单容器均在 tablist 之外
    expect(tablist.find('.slot-prefix-btn').exists()).toBe(false);
    expect(tablist.find('.slot-suffix-btn').exists()).toBe(false);
    expect(tablist.find('.slot-extra-btn').exists()).toBe(false);
    expect(tablist.find('.at-tabs-nav__quick-actions').exists()).toBe(false);
    expect(tablist.find('.at-tabs-nav__maximize-btn').exists()).toBe(false);
    expect(tablist.find('.el-dropdown').exists()).toBe(false);

    // 4. tablist 直接子元素全部为 role="tab"，无 role="button" / aria-haspopup 污染，且无嵌套 button
    const directChildren = Array.from(tablist.element.children);
    expect(directChildren).toHaveLength(3);
    directChildren.forEach((child, idx) => {
      expect(child.getAttribute('role')).toBe('tab');
      expect(child.getAttribute('aria-selected')).toBe(idx === 1 ? 'true' : 'false');
      expect(child.hasAttribute('aria-haspopup')).toBe(false);
      expect(child.hasAttribute('aria-controls')).toBe(false);
      expect(child.querySelector('button, a, [role="button"]')).toBeNull();
    });

    // 5. 关闭图标以非交互节点渲染并对外隐藏（aria-hidden="true"）
    const closeIcons = wrapper.findAll('.at-tabs-nav__close');
    expect(closeIcons).toHaveLength(2);
    closeIcons.forEach(node => {
      expect(node.element.tagName).toBe('SPAN');
      expect(node.attributes('aria-hidden')).toBe('true');
    });

    // 6. 空标签列表不挂载 role="tablist"，防止触发空 tablist 违规
    await wrapper.setProps({ tabs: [] });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });

  it('15. Roving tabindex 与键盘导航：方向键移动焦点并自动激活，Delete/Backspace 关闭可关闭页签', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs, // [/home (affix), /users, /settings]
        modelValue: '/home',
      },
      attachTo: document.body,
    });

    const items = wrapper.findAll('[role="tab"]');
    expect(items).toHaveLength(3);
    expect(items[0]!.attributes('tabindex')).toBe('0');
    expect(items[1]!.attributes('tabindex')).toBe('-1');
    expect(items[2]!.attributes('tabindex')).toBe('-1');

    // ArrowRight 移动到下一个页签并激活
    await items[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['/users']);
    expect(wrapper.emitted('tabClick')?.[0]?.[0]).toEqual(mockTabs[1]);
    expect(document.activeElement).toBe(items[1]!.element);
    await wrapper.setProps({ modelValue: '/users' });
    expect(items[0]!.attributes('tabindex')).toBe('-1');
    expect(items[1]!.attributes('tabindex')).toBe('0');

    // End 跳至末项，Home 跳回首项，ArrowLeft 环形回到末项
    await items[1]!.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['/settings']);
    expect(document.activeElement).toBe(items[2]!.element);
    await wrapper.setProps({ modelValue: '/settings' });
    expect(items[2]!.attributes('tabindex')).toBe('0');

    await items[2]!.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual(['/home']);
    expect(document.activeElement).toBe(items[0]!.element);
    await wrapper.setProps({ modelValue: '/home' });

    await items[0]!.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[3]).toEqual(['/settings']);
    expect(document.activeElement).toBe(items[2]!.element);

    // Affix 项按 Delete 不触发关闭；普通项按 Delete / Backspace 触发 tabClose
    await items[0]!.trigger('keydown', { key: 'Delete' });
    expect(wrapper.emitted('tabClose')).toBeUndefined();

    await items[1]!.trigger('keydown', { key: 'Delete' });
    expect(wrapper.emitted('tabClose')?.[0]?.[0]).toBe('/users');

    await items[2]!.trigger('keydown', { key: 'Backspace' });
    expect(wrapper.emitted('tabClose')?.[1]?.[0]).toBe('/settings');

    // 自定义 #tab 内输入元素按键不被劫持
    wrapper.unmount();
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs,
        modelValue: '/home',
      },
      slots: {
        tab: ({ tab }: { tab: TabItem }) =>
          h('input', { class: 'slot-inline-input', value: tab.title }),
      },
      attachTo: document.body,
    });
    const innerInput = wrapper.find('.slot-inline-input');
    await innerInput.trigger('keydown', { key: 'ArrowRight' });
    await innerInput.trigger('keydown', { key: 'Delete' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('tabClose')).toBeUndefined();
  });

  it('16. 轨道外共享右键菜单：右键非激活页签时精确锁定目标页签执行关闭或刷新', async () => {
    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: mockTabs, // [/home (affix), /users, /settings]
        modelValue: '/home',
        contextMenu: true,
        showQuickActions: true,
      },
    });

    const items = wrapper.findAll('[role="tab"]');
    await items[2]!.trigger('contextmenu', { clientX: 240, clientY: 32 });
    await nextTick();

    const contextDropdown = wrapper.find('.at-tabs-nav__context-dropdown');
    expect(contextDropdown.exists()).toBe(true);
    const contextDropdownVm = wrapper.findComponent({ ref: 'contextDropdownRef' });
    expect(contextDropdownVm.exists()).toBe(true);

    // 触发右键菜单“关闭当前”，应精准命中右键的 /settings 而非激活项 /home
    contextDropdownVm.vm.$emit('command', 'close');
    expect(wrapper.emitted('tabClose')?.[0]?.[0]).toBe('/settings');
    expect(wrapper.emitted('tabClose')?.[0]?.[1]).toEqual(mockTabs[2]);

    // 右键切换到 /users 并触发“刷新当前”
    await items[1]!.trigger('contextmenu', { clientX: 160, clientY: 32 });
    await nextTick();
    contextDropdownVm.vm.$emit('command', 'refresh');
    expect(wrapper.emitted('tabRefresh')?.[0]?.[0]).toBe('/users');
  });

  it('17. 页签与菜单传入 SVG 图标组件时保持专用图标容器包裹以命中 1em 约束', () => {
    const CustomTabSvg = () => h('svg', { viewBox: '0 0 1024 1024', class: 'custom-tab-svg' });
    const CustomMenuSvg = () => h('svg', { viewBox: '0 0 1024 1024', class: 'custom-menu-svg' });

    wrapper = mount(AtengTabsNav, {
      props: {
        tabs: [{ key: '/home', title: '首页', affix: true, icon: CustomTabSvg }],
        modelValue: '/home',
        showQuickActions: true,
        menuIcons: { refresh: CustomMenuSvg },
      },
      global: {
        stubs: {
          ElDropdown: {
            template: '<div class="stub-el-dropdown"><slot /><slot name="dropdown" /></div>',
          },
          ElDropdownMenu: {
            template: '<ul class="stub-el-dropdown-menu"><slot /></ul>',
          },
          ElDropdownItem: {
            props: { command: String, disabled: Boolean, divided: Boolean },
            template: '<li class="stub-el-dropdown-item" :data-command="command"><slot /></li>',
          },
        },
      },
    });

    expect(wrapper.find('.at-tabs-nav__icon > svg.custom-tab-svg').exists()).toBe(true);
    expect(wrapper.find('.at-tabs-nav__menu-icon > svg.custom-menu-svg').exists()).toBe(true);
  });
});

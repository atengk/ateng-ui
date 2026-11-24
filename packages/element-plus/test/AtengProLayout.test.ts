/**
 * AtengProLayout 框架布局容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, inject, h, markRaw } from 'vue';
import { AtengProLayout, ATENG_PRO_LAYOUT_KEY } from '../src/components/pro-layout';
import { AtengFooterBar } from '../src/components/footer-bar';
import type { ProMenuItem } from '../src/components/pro-layout';

describe('AtengProLayout Component', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const mockMenuData: ProMenuItem[] = [
    { path: '/dashboard', title: '工作台首页' },
    {
      path: '/system',
      title: '系统管理',
      children: [
        { path: '/system/user', title: '用户列表' },
        { path: '/system/role', title: '角色权限' },
      ],
    },
  ];

  it('1. 默认渲染 side 模式：包含 Header、Aside 与 Content 骨架', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        title: '测试系统',
        menuData: mockMenuData,
      },
      slots: {
        default: () => [h('div', { class: 'test-content' }, '页面主体内容')],
      },
    });

    expect(wrapper.classes()).toContain('at-pro-layout');
    expect(wrapper.classes()).toContain('at-pro-layout--side');
    expect(wrapper.find('.at-pro-layout__header').exists()).toBe(true);
    expect(wrapper.find('.at-pro-layout__aside').exists()).toBe(true);
    expect(wrapper.find('.test-content').text()).toBe('页面主体内容');
  });

  it('2. 数据驱动菜单渲染：根据 menuData 正确递归渲染菜单项与子菜单', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        menuData: mockMenuData,
        activeMenu: '/dashboard',
      },
    });

    const menuItems = wrapper.findAll('.el-menu-item');
    expect(menuItems.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain('工作台首页');
    expect(wrapper.text()).toContain('系统管理');
  });

  it('3. fieldNames 别名映射：自适应映射后端异构菜单字段', () => {
    interface BackendMenuItem {
      url: string;
      name: string;
      subList?: BackendMenuItem[];
    }

    const backendData: BackendMenuItem[] = [
      { url: '/home', name: '自定义首页' },
      {
        url: '/nested',
        name: '嵌套大类',
        subList: [{ url: '/nested/sub1', name: '子节点 1' }],
      },
    ];

    wrapper = mount(AtengProLayout, {
      props: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        menuData: backendData as any,
        fieldNames: {
          path: 'url',
          title: 'name',
          children: 'subList',
        },
      },
    });

    expect(wrapper.text()).toContain('自定义首页');
    expect(wrapper.text()).toContain('嵌套大类');
  });

  it('4. 侧边栏折叠：点击折叠把手派发 update:collapsed 与 collapseChange 事件', async () => {
    wrapper = mount(AtengProLayout, {
      props: {
        collapsed: false,
        collapsible: true,
        showCollapseTrigger: true,
      },
    });

    const trigger = wrapper.find('.at-pro-layout__collapse-btn');
    expect(trigger.exists()).toBe(true);

    await trigger.trigger('click');
    expect(wrapper.emitted('update:collapsed')).toBeTruthy();
    expect(wrapper.emitted('update:collapsed')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('collapseChange')).toBeTruthy();
    expect(wrapper.emitted('collapseChange')?.[0]?.[0]).toBe(true);
  });

  it('5. top 模式：顶栏承载水平菜单，不渲染 Aside 侧边栏', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'top',
        menuData: mockMenuData,
      },
    });

    expect(wrapper.classes()).toContain('at-pro-layout--top');
    expect(wrapper.find('.at-pro-layout__aside').exists()).toBe(false);
    expect(wrapper.find('.at-pro-layout__header .el-menu--horizontal').exists()).toBe(true);
  });

  it('6. 上下文注入总线：正确提供 ATENG_PRO_LAYOUT_KEY 供子组件感知 asideWidth 与 collapsed', () => {
    let capturedContext: unknown = null;

    const ChildComponent = defineComponent({
      setup() {
        capturedContext = inject(ATENG_PRO_LAYOUT_KEY, null);
        return () => h('div', 'Child');
      },
    });

    wrapper = mount(AtengProLayout, {
      props: {
        asideWidth: '240px',
        asideCollapsedWidth: '60px',
        collapsed: false,
      },
      slots: {
        default: () => h(ChildComponent),
      },
    });

    expect(capturedContext).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = capturedContext as any;
    expect(ctx.asideWidth.value).toBe('240px');
    expect(ctx.collapsed.value).toBe(false);
  });

  it('7. 插槽覆盖：#logo、#headerLeft、#breadcrumb、#headerRight 支持深度定制', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        title: 'Original Title',
      },
      slots: {
        logo: () => h('div', { class: 'custom-logo' }, 'My Brand'),
        headerRight: () => h('div', { class: 'custom-user' }, 'User Admin'),
      },
    });

    expect(wrapper.find('.custom-logo').text()).toBe('My Brand');
    expect(wrapper.find('.custom-user').text()).toBe('User Admin');
  });

  it('8. 协同总线：AtengFooterBar 在 AtengProLayout 内部自动感知 asideWidth 并避让', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        asideWidth: '260px',
        collapsed: false,
      },
      slots: {
        default: () => h(AtengFooterBar, { position: 'fixed', leftOffset: 'auto' }),
      },
    });

    const footerBar = wrapper.findComponent(AtengFooterBar);
    expect(footerBar.exists()).toBe(true);
    const footerEl = footerBar.find('.at-footer-bar');
    expect(footerEl.attributes('style')).toContain('left: 260px');
  });

  it('9. mix 模式：顶栏呈现一级大类，侧边栏联动呈现其子树菜单', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: mockMenuData,
        activeMenu: '/system/user',
      },
    });

    expect(wrapper.classes()).toContain('at-pro-layout--mix');
    const topMenu = wrapper.find('.at-pro-layout__header .el-menu--horizontal');
    expect(topMenu.exists()).toBe(true);
    expect(topMenu.text()).toContain('工作台首页');
    expect(topMenu.text()).toContain('系统管理');

    const aside = wrapper.find('.at-pro-layout__aside');
    expect(aside.exists()).toBe(true);
    expect(aside.text()).toContain('用户列表');
    expect(aside.text()).toContain('角色权限');
  });

  it('10. mix 模式 mixAutoSelectFirstLeaf 导航策略：点击一级大类自动选中首个叶子节点', async () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: mockMenuData,
        activeMenu: '/dashboard',
        mixAutoSelectFirstLeaf: true,
      },
    });

    const topMenuItems = wrapper.findAll('.at-pro-layout__header .el-menu-item');
    const systemTopItem = topMenuItems.find(item => item.text().includes('系统管理'));
    expect(systemTopItem).toBeDefined();
    await systemTopItem!.trigger('click');

    expect(wrapper.emitted('update:activeMenu')).toBeTruthy();
    expect(wrapper.emitted('update:activeMenu')?.[0]?.[0]).toBe('/system/user');
    expect(wrapper.emitted('menuSelect')).toBeTruthy();
    expect(wrapper.emitted('menuSelect')?.[0]?.[0]).toBe('/system/user');
  });

  it('11. mix 模式 mixAutoSelectFirstLeaf: false：点击一级大类仅切换侧边栏子菜单，不触发导航', async () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: mockMenuData,
        activeMenu: '/dashboard',
        mixAutoSelectFirstLeaf: false,
      },
    });

    const topMenuItems = wrapper.findAll('.at-pro-layout__header .el-menu-item');
    const systemTopItem = topMenuItems.find(item => item.text().includes('系统管理'));
    expect(systemTopItem).toBeDefined();
    await systemTopItem!.trigger('click');

    expect(wrapper.emitted('update:activeMenu')).toBeFalsy();
    expect(wrapper.emitted('menuSelect')).toBeFalsy();

    const aside = wrapper.find('.at-pro-layout__aside');
    expect(aside.exists()).toBe(true);
    expect(aside.text()).toContain('用户列表');
  });

  it('12. 移动端响应式断点识别与抽屉遮罩渲染', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedContext: any = null;
    const ChildComponent = defineComponent({
      setup() {
        capturedContext = inject(ATENG_PRO_LAYOUT_KEY, null);
        return () => h('div');
      },
    });

    const mockMql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMql as any);

    wrapper = mount(AtengProLayout, {
      props: {
        collapsed: false,
        menuData: mockMenuData,
      },
      slots: {
        default: () => h(ChildComponent),
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('is-mobile');
    expect(wrapper.find('.at-pro-layout__drawer-mask').exists()).toBe(true);
    expect(wrapper.find('.at-pro-layout__aside').classes()).toContain('is-mobile-drawer');
    expect(capturedContext.isMobile?.value).toBe(true);
    expect(capturedContext.asideWidth.value).toBe('0px');
  });

  it('13. 移动端抽屉：点击遮罩或选中叶子菜单自动收起抽屉', async () => {
    const mockMql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMql as any);

    wrapper = mount(AtengProLayout, {
      props: {
        collapsed: false,
        menuData: mockMenuData,
      },
    });
    await wrapper.vm.$nextTick();

    const mask = wrapper.find('.at-pro-layout__drawer-mask');
    expect(mask.exists()).toBe(true);
    await mask.trigger('click');

    expect(wrapper.emitted('update:collapsed')).toBeTruthy();
    expect(wrapper.emitted('update:collapsed')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('collapseChange')?.[0]?.[0]).toBe(true);
  });

  it('14. 确定性生命周期清理：组件销毁时解绑 matchMedia 监听器', () => {
    const removeEventListener = vi.fn();
    const mockMql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMql as any);

    wrapper = mount(AtengProLayout);
    wrapper.unmount();
    wrapper = null;

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('15. 移动端抽屉：点击叶子菜单项自动收起抽屉', async () => {
    const mockMql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMql as any);

    wrapper = mount(AtengProLayout, {
      props: {
        collapsed: false,
        menuData: mockMenuData,
      },
    });
    await wrapper.vm.$nextTick();

    const menuItems = wrapper.findAll('.el-menu-item');
    const dashboardItem = menuItems.find(item => item.text().includes('工作台首页'));
    expect(dashboardItem).toBeDefined();
    await dashboardItem!.trigger('click');

    expect(wrapper.emitted('update:collapsed')).toBeTruthy();
    expect(wrapper.emitted('update:collapsed')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('collapseChange')?.[0]?.[0]).toBe(true);
  });

  it('16. showTabs 与 tabsProps：开启 showTabs 自动内置渲染 AtengTabsNav 并透传 tabsProps', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        showTabs: true,
        tabsProps: {
          modelValue: '/system/user',
          tabs: [
            { key: '/dashboard', title: '工作台首页', affix: true },
            { key: '/system/user', title: '用户列表' },
          ],
        },
      },
    });

    const tabsNav = wrapper.find('.at-tabs-nav');
    expect(tabsNav.exists()).toBe(true);
    expect(tabsNav.text()).toContain('工作台首页');
    expect(tabsNav.text()).toContain('用户列表');
  });

  it('17. #tabs 插槽优先覆盖：提供 #tabs 插槽时不渲染默认内置标签栏', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        showTabs: true,
      },
      slots: {
        tabs: () => h('div', { class: 'custom-tabs-slot' }, '自定义标签栏插槽'),
      },
    });

    expect(wrapper.find('.custom-tabs-slot').exists()).toBe(true);
    expect(wrapper.find('.custom-tabs-slot').text()).toBe('自定义标签栏插槽');
    expect(wrapper.find('.at-tabs-nav').exists()).toBe(false);
  });

  it('18. 最大化沉浸模式协同：isMaximized 或 toggleMaximize 触发 Header/Aside 隐藏与 asideWidth 归零', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedContext: any = null;
    const ChildComponent = defineComponent({
      setup() {
        capturedContext = inject(ATENG_PRO_LAYOUT_KEY, null);
        return () => h('div');
      },
    });

    wrapper = mount(AtengProLayout, {
      props: {
        asideWidth: '220px',
        isMaximized: false,
      },
      slots: {
        default: () => h(ChildComponent),
      },
    });

    expect(capturedContext.asideWidth.value).toBe('220px');
    expect(capturedContext.isMaximized.value).toBe(false);
    expect(wrapper.classes()).not.toContain('is-maximized');

    // 触发实例 toggleMaximize
    wrapper.vm.toggleMaximize();
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('is-maximized');
    expect(capturedContext.isMaximized.value).toBe(true);
    expect(capturedContext.asideWidth.value).toBe('0px');
    expect(wrapper.emitted('update:isMaximized')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('maximizeChange')?.[0]?.[0]).toBe(true);

    // 再次调用恢复
    wrapper.vm.toggleMaximize();
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('is-maximized');
    expect(capturedContext.isMaximized.value).toBe(false);
    expect(capturedContext.asideWidth.value).toBe('220px');
  });

  it('19. 内置 AtengTabsNav 最大化与 AtengProLayout 深度联动', async () => {
    wrapper = mount(AtengProLayout, {
      props: {
        showTabs: true,
        tabsProps: {
          showMaximize: true,
          tabs: [{ key: '/dashboard', title: '首页' }],
        },
      },
    });

    const maxBtn = wrapper.find('.at-tabs-nav__maximize-btn');
    expect(maxBtn.exists()).toBe(true);

    // 点击 TabsNav 的最大化按钮
    await maxBtn.trigger('click');

    expect(wrapper.classes()).toContain('is-maximized');
    expect(wrapper.emitted('update:isMaximized')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('maximizeChange')?.[0]?.[0]).toBe(true);
  });

  it('20. 侧边栏折叠态 (collapse)：未配置图标时自动回退首字徽标 (Fallback Avatar)', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        menuData: [
          { path: '/dashboard', title: '工作台首页', icon: 'el-icon-monitor' },
          { path: '/no-icon', title: '无图标模块' },
        ],
        collapsed: true,
      },
    });

    const fallback = wrapper.find('.at-pro-menu__fallback-icon');
    expect(fallback.exists()).toBe(true);
    expect(fallback.text()).toBe('无');
  });

  it('21. #menuItem 作用域插槽：自定义单菜单项内容渲染', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        menuData: [{ path: '/custom', title: '自定义菜单项' }],
      },
      slots: {
        menuItem: ({ item, depth }: { item: ProMenuItem; depth: number }) => [
          h('span', { class: 'custom-menu-slot' }, `[D:${depth}] ${item.title}`),
        ],
      },
    });

    const customSlot = wrapper.find('.custom-menu-slot');
    expect(customSlot.exists()).toBe(true);
    expect(customSlot.text()).toBe('[D:0] 自定义菜单项');
  });

  it('22. 菜单项外链支持：配置 target="_blank" 时点击调用 window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    wrapper = mount(AtengProLayout, {
      props: {
        menuData: [{ path: 'https://example.com', title: '外部链接', target: '_blank' }],
      },
    });

    const menuItem = wrapper.find('.el-menu-item');
    expect(menuItem.exists()).toBe(true);
    await menuItem.trigger('click');

    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });

  it('23. 内置 AtengTabsNav 列表变动与调序事件由 AtengProLayout 转发', async () => {
    wrapper = mount(AtengProLayout, {
      props: {
        showTabs: true,
        tabsProps: {
          tabs: [
            { key: '/t1', title: 'T1' },
            { key: '/t2', title: 'T2' },
          ],
        },
      },
    });

    const tabsNav = wrapper.findComponent({ name: 'AtengTabsNav' });
    expect(tabsNav.exists()).toBe(true);

    // 模拟 TabsNav 派发 update:tabs
    const updatedTabs = [{ key: '/t1', title: 'T1' }];
    tabsNav.vm.$emit('update:tabs', updatedTabs);
    expect(wrapper.emitted('update:tabs')?.[0]?.[0]).toEqual(updatedTabs);

    // 模拟 TabsNav 派发 tabOrderChange
    tabsNav.vm.$emit('tabOrderChange', updatedTabs);
    expect(wrapper.emitted('tabOrderChange')?.[0]?.[0]).toEqual(updatedTabs);
  });

  it('24. iconResolver 回调：支持将字符串图标映射为 Vue 组件并向多层子菜单及 fieldNames 透传', () => {
    const MockSettingIcon = defineComponent({
      name: 'MockSettingIcon',
      render() {
        return h('svg', { class: 'mock-svg-setting' });
      },
    });
    const MockUserIcon = defineComponent({
      name: 'MockUserIcon',
      render() {
        return h('svg', { class: 'mock-svg-user' });
      },
    });

    const iconMap: Record<string, ReturnType<typeof defineComponent>> = {
      Setting: MockSettingIcon,
      User: MockUserIcon,
    };
    const resolverCalls: Array<{ icon: unknown; path: unknown; depth: number }> = [];

    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'side',
        defaultOpeneds: ['/system'],
        fieldNames: {
          path: 'url',
          title: 'name',
          icon: 'iconKey',
          children: 'subList',
        },
        menuData: [
          {
            url: '/system',
            name: '系统管理',
            iconKey: 'Setting',
            subList: [{ url: '/system/user', name: '用户管理', iconKey: 'User' }],
          },
        ] as unknown as ProMenuItem[],
        iconResolver: (icon, item, depth) => {
          resolverCalls.push({ icon, path: item.url ?? item.path, depth });
          return typeof icon === 'string' ? iconMap[icon] : icon;
        },
      },
    });

    expect(wrapper.find('.mock-svg-setting').exists()).toBe(true);
    expect(wrapper.find('.mock-svg-user').exists()).toBe(true);
    expect(resolverCalls).toEqual([
      { icon: 'Setting', path: '/system', depth: 0 },
      { icon: 'User', path: '/system/user', depth: 1 },
    ]);
  });

  it('25. iconResolver 回退与折叠态边界：支持返回 CSS 类名、undefined 回退原逻辑、空串隐藏及 top/mix/collapsed 模式', () => {
    const MockHomeIcon = markRaw(
      defineComponent({
        name: 'MockHomeIcon',
        render() {
          return h('svg', { class: 'mock-svg-home' });
        },
      }),
    );
    const MockDirectIcon = markRaw(
      defineComponent({
        name: 'MockDirectIcon',
        render() {
          return h('svg', { class: 'mock-svg-direct' });
        },
      }),
    );

    const menuItems: ProMenuItem[] = [
      { path: '/home', title: '首页', icon: 'Home' },
      { path: '/monitor', title: '监控', icon: 'el-icon-monitor' },
      { path: '/direct', title: '直传组件', icon: MockDirectIcon },
      { path: '/hidden-icon', title: '隐藏图标', icon: 'HiddenIcon' },
      {
        path: '/group',
        title: '分组',
        icon: 'Home',
        children: [{ path: '/group/leaf', title: '空图标叶子', icon: 'HiddenIcon' }],
      },
    ];

    const resolver = (icon: string | ReturnType<typeof defineComponent>) => {
      if (icon === 'Home') return MockHomeIcon;
      if (icon === 'HiddenIcon') return '';
      if (icon === 'CssAlias') return 'iconfont icon-alias';
      return undefined;
    };

    // 1. 折叠态：Home 解析为组件不触发 fallback-icon；HiddenIcon 返回空串触发首字徽标回退
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'side',
        collapsed: true,
        menuData: [...menuItems, { path: '/alias', title: '别名', icon: 'CssAlias' }],
        iconResolver: resolver,
      },
    });

    expect(wrapper.find('.mock-svg-home').exists()).toBe(true);
    expect(wrapper.find('.mock-svg-direct').exists()).toBe(true);
    expect(wrapper.find('i.el-icon-monitor').exists()).toBe(true);
    expect(wrapper.find('i.iconfont.icon-alias').exists()).toBe(true);
    const fallbacks = wrapper.findAll('.at-pro-menu__fallback-icon');
    expect(fallbacks.map(el => el.text())).toContain('隐');

    wrapper.unmount();

    // 2. 展开态：空串隐藏的二级叶子菜单按无图标缩进 (60px)
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'side',
        collapsed: false,
        defaultOpeneds: ['/group'],
        menuData: menuItems,
        iconResolver: resolver,
      },
    });

    const leafItem = wrapper
      .findAll('.el-menu-item')
      .find(item => item.text().includes('空图标叶子'));
    expect(leafItem).toBeDefined();
    expect(leafItem!.attributes('style')).toContain('padding-left: 60px');

    wrapper.unmount();

    // 3. mix 模式透传 iconResolver 至顶栏与侧栏菜单
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: [
          {
            path: '/top-group',
            title: '顶栏模块',
            icon: 'Home',
            children: [{ path: '/top-group/sub', title: '侧栏子项', icon: 'CssAlias' }],
          },
        ],
        activeMenu: '/top-group/sub',
        iconResolver: resolver,
      },
    });

    expect(wrapper.find('.at-pro-layout__header .mock-svg-home').exists()).toBe(true);
    expect(wrapper.find('.at-pro-layout__aside i.iconfont.icon-alias').exists()).toBe(true);
  });

  it('26. #menuIcon 作用域插槽：在保留内置标题与徽标前提下独立定制图标节点，且无图标项仍保留首字回退', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'side',
        defaultOpeneds: ['/sys'],
        menuData: [
          {
            path: '/sys',
            title: '系统管理',
            icon: 'ep:setting',
            badge: 9,
            children: [
              { path: '/sys/user', title: '用户管理', icon: 'ep:user' },
              { path: '/sys/plain', title: '无图标项' },
            ],
          },
        ],
      },
      slots: {
        menuIcon: ({ icon, item, depth }: { icon: unknown; item: ProMenuItem; depth: number }) =>
          h(
            'span',
            { class: 'custom-menu-icon', 'data-path': item.path, 'data-depth': String(depth) },
            String(icon),
          ),
      },
    });

    const icons = wrapper.findAll('.custom-menu-icon');
    expect(icons.length).toBe(2);
    expect(icons[0]?.text()).toBe('ep:setting');
    expect(icons[0]?.attributes('data-depth')).toBe('0');
    expect(icons[1]?.text()).toBe('ep:user');
    expect(icons[1]?.attributes('data-depth')).toBe('1');
    expect(wrapper.find('.at-pro-menu__title').text()).toBe('系统管理');
    expect(wrapper.find('.at-pro-menu__badge').text()).toContain('9');
    expect(wrapper.find('.at-pro-menu__fallback-icon').text()).toBe('无');
  });

  it('27. mix 模式 headerRight 兜底：补充 #headerActions 与 #user 默认兜底插槽', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: mockMenuData,
      },
      slots: {
        headerActions: () => h('button', { class: 'mix-action-btn' }, '消息通知'),
        user: () => h('span', { class: 'mix-user-name' }, '系统管理员'),
      },
    });

    const headerRight = wrapper.find('.at-pro-layout__header-right');
    expect(headerRight.exists()).toBe(true);
    expect(headerRight.find('.at-pro-layout__header-actions .mix-action-btn').text()).toBe(
      '消息通知',
    );
    expect(headerRight.find('.at-pro-layout__header-user .mix-user-name').text()).toBe(
      '系统管理员',
    );
  });

  it('28. mix 模式 headerRight 覆盖：传入 #headerRight 时覆盖 #headerActions 与 #user 默认兜底', () => {
    wrapper = mount(AtengProLayout, {
      props: {
        layout: 'mix',
        menuData: mockMenuData,
      },
      slots: {
        headerRight: () => h('div', { class: 'custom-mix-header-right' }, '自定义右侧区'),
        headerActions: () => h('button', { class: 'mix-action-btn' }, '不应渲染'),
        user: () => h('span', { class: 'mix-user-name' }, '不应渲染'),
      },
    });

    const headerRight = wrapper.find('.at-pro-layout__header-right');
    expect(headerRight.find('.custom-mix-header-right').text()).toBe('自定义右侧区');
    expect(headerRight.find('.at-pro-layout__header-actions').exists()).toBe(false);
    expect(headerRight.find('.at-pro-layout__header-user').exists()).toBe(false);
  });
});

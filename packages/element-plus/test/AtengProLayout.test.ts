/**
 * AtengProLayout 框架布局容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, inject, h } from 'vue';
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
});

/**
 * AtengPageContainer 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengPageContainer } from '../src/components/page-container';

describe('AtengPageContainer 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：包含标题、副标题与内容', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '用户中心',
        subTitle: '管理平台所有用户档案',
      },
      slots: {
        default: '<div class="test-body">表格或卡片</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-page-container');
    expect(wrapper.find('.at-page-container__title').text()).toBe('用户中心');
    expect(wrapper.find('.at-page-container__sub-title').text()).toBe('管理平台所有用户档案');
    expect(wrapper.find('.test-body').exists()).toBe(true);
    expect(wrapper.find('.at-page-container__card').exists()).toBe(true);
  });

  it('幽灵模式 (ghost=true)：内容区无白底卡片容器包裹', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        ghost: true,
      },
      slots: {
        default: '<div class="naked-content">纯净内容</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-ghost');
    expect(wrapper.find('.at-page-container__card').exists()).toBe(false);
    expect(wrapper.find('.naked-content').exists()).toBe(true);
  });

  it('视口撑满模式 (fitViewport=true)：具有 is-fit-viewport 类名', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        fitViewport: true,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-fit-viewport');
  });

  it('返回按钮与事件触发', async () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '详情页',
        showBack: true,
      },
      attachTo: document.body,
    });

    const backBtn = wrapper.find('.at-page-container__back-btn');
    expect(backBtn.exists()).toBe(true);

    await backBtn.trigger('click');
    expect(wrapper.emitted('back')).toBeTruthy();
    expect(wrapper.emitted('back')!.length).toBe(1);
  });

  it('面包屑导航自动渲染', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        breadcrumb: [
          { label: '首页', path: '/home' },
          { label: '系统管理', path: '/system' },
          { label: '用户管理' },
        ],
      },
      attachTo: document.body,
    });

    const breadcrumb = wrapper.find('.at-page-container__breadcrumb');
    expect(breadcrumb.exists()).toBe(true);
    expect(breadcrumb.text()).toContain('首页');
    expect(breadcrumb.text()).toContain('系统管理');
    expect(breadcrumb.text()).toContain('用户管理');
  });

  it('插槽渲染：extra 与 tabs 插槽', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '控制台',
      },
      slots: {
        extra: '<button class="extra-btn">新建项目</button>',
        tabs: '<div class="custom-tabs">Tab 1 | Tab 2</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.extra-btn').exists()).toBe(true);
    expect(wrapper.find('.custom-tabs').exists()).toBe(true);
  });

  it('吸顶毛玻璃 (headerBlur=true)：页头具有 has-blur 类名', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '毛玻璃页头',
        headerBlur: true,
      },
      attachTo: document.body,
    });

    const header = wrapper.find('.at-page-container__header');
    expect(header.classes()).toContain('has-blur');
  });

  it('滚动位移感知悬浮投影 (.is-elevated)：滚动大于 0 附加类名，回到顶部移除', async () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '可滚动页面',
        fitViewport: true,
      },
      slots: {
        default: '<div style="height: 1000px">长内容</div>',
      },
      attachTo: document.body,
    });

    const header = wrapper.find('.at-page-container__header');
    const content = wrapper.find('.at-page-container__content');

    expect(header.classes()).not.toContain('is-elevated');

    // 模拟滚动超过 0
    Object.defineProperty(content.element, 'scrollTop', {
      value: 50,
      writable: true,
      configurable: true,
    });
    await content.trigger('scroll');
    expect(header.classes()).toContain('is-elevated');

    // 模拟滚动回顶部
    Object.defineProperty(content.element, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });
    await content.trigger('scroll');
    expect(header.classes()).not.toContain('is-elevated');
  });

  it('弱感应自动路由面包屑 (autoBreadcrumb=true)：根据 $route.matched 自动提炼', () => {
    const mockRoute = {
      path: '/system/user/detail',
      matched: [
        { path: '/', meta: {} }, // 无 title，应过滤
        { path: '/system', meta: { title: '系统设置' } },
        { path: '/system/user', meta: { title: '用户中心' } },
        { path: '/system/user/detail', meta: { title: '用户详情' } }, // 最后一项，当前页面
      ],
    };

    wrapper = mount(AtengPageContainer, {
      props: {
        autoBreadcrumb: true,
      },
      global: {
        mocks: {
          $route: mockRoute,
        },
      },
      attachTo: document.body,
    });

    const breadcrumb = wrapper.find('.at-page-container__breadcrumb');
    expect(breadcrumb.exists()).toBe(true);
    expect(breadcrumb.text()).toContain('系统设置');
    expect(breadcrumb.text()).toContain('用户中心');
    expect(breadcrumb.text()).toContain('用户详情');

    const items = wrapper.findAllComponents({ name: 'ElBreadcrumbItem' });
    expect(items.length).toBe(3);
    // 第一项带跳转链接，具有 is-link 类名
    expect(items[0].find('.el-breadcrumb__inner').classes()).toContain('is-link');
    // 最后一项作为当前页面不带跳转，没有 is-link 类名
    expect(items[2].find('.el-breadcrumb__inner').classes()).not.toContain('is-link');
  });

  it('自定义路由字段与解析器逃生舱：breadcrumbTitleKey 与 breadcrumbResolver', () => {
    const mockRoute = {
      path: '/custom',
      matched: [
        { path: '/custom/a', meta: { customLabel: '自定义A' } },
        { path: '/custom/b', meta: { customLabel: '自定义B' } },
      ],
    };

    // 1. 测试 breadcrumbTitleKey
    wrapper = mount(AtengPageContainer, {
      props: {
        autoBreadcrumb: true,
        breadcrumbTitleKey: 'meta.customLabel',
      },
      global: {
        mocks: {
          $route: mockRoute,
        },
      },
      attachTo: document.body,
    });
    expect(wrapper.find('.at-page-container__breadcrumb').text()).toContain('自定义A');

    wrapper.unmount();

    // 2. 测试 breadcrumbResolver
    wrapper = mount(AtengPageContainer, {
      props: {
        autoBreadcrumb: true,
        breadcrumbResolver: (matched: unknown[]) => {
          return [{ label: `总计${matched.length}层`, path: '/all' }, { label: '逃生舱自定义' }];
        },
      },
      global: {
        mocks: {
          $route: mockRoute,
        },
      },
      attachTo: document.body,
    });
    const text = wrapper.find('.at-page-container__breadcrumb').text();
    expect(text).toContain('总计2层');
    expect(text).toContain('逃生舱自定义');
  });

  it('环境宿主弹性防卫：无 Vue Router 运行时开启 autoBreadcrumb 不崩溃且优雅降级', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '无路由容器',
        autoBreadcrumb: true,
      },
      global: {
        mocks: {
          $route: undefined,
        },
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-page-container');
    expect(wrapper.find('.at-page-container__breadcrumb').exists()).toBe(false);
  });

  it('脱壳全屏交互 (showFullscreen=true) 与 ESC 快捷键退出', async () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '脱壳全屏页面',
        showFullscreen: true,
      },
      attachTo: document.body,
    });

    const fullscreenBtn = wrapper.find('.at-page-container__fullscreen-btn');
    expect(fullscreenBtn.exists()).toBe(true);
    expect(fullscreenBtn.attributes('title')).toBe('视口脱壳全屏');

    // 触发全屏
    await fullscreenBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-fullscreen');
    expect(wrapper.emitted('fullscreen')).toBeTruthy();
    expect(fullscreenBtn.attributes('title')).toBe('退出全屏 (ESC)');

    // 验证脱壳瞬移到 document.body 顶层
    const innerFullscreen = document.body.querySelector('.at-page-container__inner.is-fullscreen');
    expect(innerFullscreen).not.toBeNull();

    // 按下 ESC 键退出全屏
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escEvent);
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).not.toContain('is-fullscreen');
  });

  it('全屏防穿透滚动锁 (lockScroll=true)：全屏锁定 body，退出全屏与卸载时确定性还原', async () => {
    document.body.style.overflow = 'auto';

    wrapper = mount(AtengPageContainer, {
      props: {
        title: '滚动锁页面',
        showFullscreen: true,
        lockScroll: true,
      },
      attachTo: document.body,
    });

    const fullscreenBtn = wrapper.find('.at-page-container__fullscreen-btn');
    await fullscreenBtn.trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    // 再次点击还原
    await fullscreenBtn.trigger('click');
    expect(document.body.style.overflow).toBe('auto');

    // 再次进入全屏后直接卸载组件，验证确定性清理
    await fullscreenBtn.trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    wrapper.unmount();
    wrapper = null;
    expect(document.body.style.overflow).toBe('auto');
  });

  it('沉浸式滚动折叠页头 (collapseHeaderOnScroll=true)：向下滚动收起，回滚展开', async () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '折叠页头页面',
        fitViewport: true,
        collapseHeaderOnScroll: true,
      },
      slots: {
        default: '<div style="height: 1200px">长文档内容</div>',
      },
      attachTo: document.body,
    });

    const header = wrapper.find('.at-page-container__header');
    const content = wrapper.find('.at-page-container__content');

    expect(header.classes()).not.toContain('is-scroll-collapsed');

    // 模拟向下大幅滚动（超过页头默认高度 60px）
    Object.defineProperty(content.element, 'scrollTop', {
      value: 120,
      writable: true,
      configurable: true,
    });
    await content.trigger('scroll');

    expect(header.classes()).toContain('is-scroll-collapsed');
    expect(wrapper.emitted('header-collapse')).toBeTruthy();
    expect(wrapper.emitted('header-collapse')![0]).toEqual([true]);

    // 模拟向上回滚
    Object.defineProperty(content.element, 'scrollTop', {
      value: 50,
      writable: true,
      configurable: true,
    });
    await content.trigger('scroll');

    expect(header.classes()).not.toContain('is-scroll-collapsed');
    expect(wrapper.emitted('header-collapse')![1]).toEqual([false]);
  });
});

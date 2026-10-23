/**
 * AtengCard 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengCard } from '../src/components/card';

describe('AtengCard 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：包含标题、副标题与正文', () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '销售统计',
        subTitle: '近30天指标概览',
        tooltip: '每日凌晨自动统计刷新',
      },
      slots: {
        default: '<div class="chart-content">图表内容</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-card');
    expect(wrapper.classes()).toContain('is-bordered');
    expect(wrapper.find('.at-card__title').text()).toBe('销售统计');
    expect(wrapper.find('.at-card__sub-title').text()).toBe('近30天指标概览');
    expect(wrapper.find('.chart-content').exists()).toBe(true);
  });

  it('一键折叠交互 (collapsible)', async () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '可折叠卡片',
        collapsible: true,
      },
      slots: {
        default: '<p class="secret-text">隐藏数据</p>',
      },
      attachTo: document.body,
    });

    const foldBtn = wrapper.find('.at-card__action-btn');
    expect(foldBtn.exists()).toBe(true);

    // 点击收起
    await foldBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-collapsed');
    expect(wrapper.emitted('collapse')).toBeTruthy();

    // 再次点击展开
    await foldBtn.trigger('click');
    expect(wrapper.classes()).not.toContain('is-collapsed');
  });

  it('全屏最大化交互 (fullscreenable) 与 ESC 退出', async () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '全屏看板',
        fullscreenable: true,
      },
      attachTo: document.body,
    });

    const fullscreenBtn = wrapper.find('.at-card__action-btn');
    expect(fullscreenBtn.exists()).toBe(true);

    // 触发全屏
    await fullscreenBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-fullscreen');
    expect(wrapper.emitted('fullscreen')).toBeTruthy();

    // 按下 ESC 键退出全屏
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).not.toContain('is-fullscreen');
  });

  it('全屏防穿透滚动锁 (lockScroll=true)：全屏时 body 溢出隐藏，退出全屏后还原', async () => {
    document.body.style.overflow = 'auto';

    wrapper = mount(AtengCard, {
      props: {
        title: '全屏卡片',
        fullscreenable: true,
        lockScroll: true,
      },
      attachTo: document.body,
    });

    const fullscreenBtn = wrapper.find('.at-card__action-btn');
    await fullscreenBtn.trigger('click');
    expect(wrapper.classes()).toContain('is-fullscreen');
    expect(document.body.style.overflow).toBe('hidden');

    // 再次点击还原
    await fullscreenBtn.trigger('click');
    expect(wrapper.classes()).not.toContain('is-fullscreen');
    expect(document.body.style.overflow).toBe('auto');
  });

  it('多卡片并发全屏引用计数：所有卡片均退出后才恢复 body 滚动状态', async () => {
    document.body.style.overflow = 'scroll';

    const wrapper1 = mount(AtengCard, {
      props: {
        title: '卡片1',
        fullscreenable: true,
        lockScroll: true,
      },
      attachTo: document.body,
    });

    const wrapper2 = mount(AtengCard, {
      props: {
        title: '卡片2',
        fullscreenable: true,
        lockScroll: true,
      },
      attachTo: document.body,
    });

    // 卡片1 全屏
    await wrapper1.find('.at-card__action-btn').trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    // 卡片2 全屏
    await wrapper2.find('.at-card__action-btn').trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    // 卡片1 退出全屏，此时卡片2仍在全屏，body 依然保持 hidden
    await wrapper1.find('.at-card__action-btn').trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    // 卡片2 退出全屏，所有卡片退出，body 恢复为 scroll
    await wrapper2.find('.at-card__action-btn').trigger('click');
    expect(document.body.style.overflow).toBe('scroll');

    wrapper1.unmount();
    wrapper2.unmount();
  });

  it('组件销毁时的滚动锁确定性清理：卡片处于全屏时卸载，安全释放 body 锁', async () => {
    document.body.style.overflow = 'visible';

    const cardWrapper = mount(AtengCard, {
      props: {
        title: '全屏卸载卡片',
        fullscreenable: true,
        lockScroll: true,
      },
      attachTo: document.body,
    });

    await cardWrapper.find('.at-card__action-btn').trigger('click');
    expect(document.body.style.overflow).toBe('hidden');

    // 直接卸载组件，模拟路由切换
    cardWrapper.unmount();
    expect(document.body.style.overflow).toBe('visible');
  });

  it('ESC 退出快捷键防冲突与受控开关 (escExit)', async () => {
    wrapper = mount(AtengCard, {
      props: {
        title: 'ESC 控制卡片',
        fullscreenable: true,
        escExit: false,
      },
      attachTo: document.body,
    });

    await wrapper.find('.at-card__action-btn').trigger('click');
    expect(wrapper.classes()).toContain('is-fullscreen');

    // escExit=false 时按下 ESC，不退出全屏
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escEvent);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('is-fullscreen');

    // 动态启用 escExit=true
    await wrapper.setProps({ escExit: true });

    // 模拟子浮层处理了 ESC 并阻止默认行为 (defaultPrevented)
    const interceptedEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    interceptedEvent.preventDefault();
    window.dispatchEvent(interceptedEvent);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('is-fullscreen');

    // 正常未被拦截的 ESC，触发退出
    const normalEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(normalEvent);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('is-fullscreen');
  });

  it('加载状态遮罩 (loading=true)', () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '加载中卡片',
        loading: true,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-loading');
    expect(wrapper.find('.at-card__loading-mask').exists()).toBe(true);
    expect(wrapper.find('.at-card__spinner').exists()).toBe(true);
  });

  it('局部刷新操作与动效派发 (showRefresh=true & @refresh)', async () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '仪表盘指标',
        showRefresh: true,
        refreshTooltip: '点击同步最新指标',
      },
      attachTo: document.body,
    });

    const refreshBtn = wrapper.find('.at-card__refresh-btn');
    expect(refreshBtn.exists()).toBe(true);
    expect(refreshBtn.attributes('title')).toBe('点击同步最新指标');

    // 触发刷新
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh')).toBeTruthy();
    expect(refreshBtn.classes()).toContain('is-refreshing');
  });

  it('单行紧凑页签插槽 (#tabs & tabsPosition="top")', () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '分段统计',
        tabsPosition: 'top',
      },
      slots: {
        tabs: '<div class="custom-tabs">本日/本周/本月</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-card__header-tabs.is-top').exists()).toBe(true);
    expect(wrapper.find('.custom-tabs').text()).toBe('本日/本周/本月');
    expect(wrapper.find('.at-card__header').classes()).toContain('tabs-pos-top');
  });

  it('次行沉降页签插槽 (#tabs & tabsPosition="bottom")', () => {
    wrapper = mount(AtengCard, {
      props: {
        title: '复杂看板',
        tabsPosition: 'bottom',
      },
      slots: {
        tabs: '<div class="sub-row-tabs">次行沉降多标签页</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-card__header-tabs.is-bottom').exists()).toBe(true);
    expect(wrapper.find('.sub-row-tabs').text()).toBe('次行沉降多标签页');
    expect(wrapper.find('.at-card__header').classes()).toContain('tabs-pos-bottom');
  });
});

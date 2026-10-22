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
});

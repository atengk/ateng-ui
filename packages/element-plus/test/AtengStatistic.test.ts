/**
 * AtengStatistic 统计指标组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengStatistic } from '../src/components/statistic';

describe('AtengStatistic 统计指标与数字滚动组件交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('静态渲染与千分位格式化：无动画模式下即时呈现千分位与前后缀', async () => {
    const wrapper = mount(AtengStatistic, {
      props: {
        title: '总营业额',
        value: 1234567.89,
        prefix: '¥',
        suffix: '元',
        duration: 0,
      },
    });

    expect(wrapper.classes()).toContain('at-statistic');
    expect(wrapper.find('.at-statistic__title').text()).toBe('总营业额');
    expect(wrapper.find('.at-statistic__prefix').text()).toBe('¥');
    expect(wrapper.find('.at-statistic__suffix').text()).toBe('元');
    expect(wrapper.find('.at-statistic__number').text()).toBe('1,234,567.89');

    wrapper.unmount();
  });

  it('精度格式化：精准保留指定 precision 位数', async () => {
    const wrapper = mount(AtengStatistic, {
      props: {
        value: 88,
        precision: 2,
        duration: 0,
      },
    });

    expect(wrapper.find('.at-statistic__number').text()).toBe('88.00');

    await wrapper.setProps({ value: 12.3456, precision: 3 });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.at-statistic__number').text()).toBe('12.346');

    wrapper.unmount();
  });

  it('红绿涨跌微标：中国大陆市场红涨绿跌与国际配色反转', async () => {
    // 1. 默认红涨
    const wrapperUp = mount(AtengStatistic, {
      props: {
        value: 100,
        trend: 'up',
        trendValue: '+15.8%',
        duration: 0,
      },
    });

    const trendEl = wrapperUp.find('.at-statistic__trend');
    expect(trendEl.exists()).toBe(true);
    expect(trendEl.classes()).toContain('at-statistic__trend--danger');
    expect(trendEl.text()).toContain('+15.8%');
    wrapperUp.unmount();

    // 2. 国际反转：绿涨
    const wrapperInverse = mount(AtengStatistic, {
      props: {
        value: 100,
        trend: 'up',
        trendValue: '+15.8%',
        trendColorInverse: true,
        duration: 0,
      },
    });

    const trendInverseEl = wrapperInverse.find('.at-statistic__trend');
    expect(trendInverseEl.classes()).toContain('at-statistic__trend--success');
    wrapperInverse.unmount();
  });

  it('骨架屏状态切换：loading: true 时呈现 ElSkeleton 骨架屏', async () => {
    const wrapper = mount(AtengStatistic, {
      props: {
        title: '活跃用户数',
        value: 9999,
        loading: true,
      },
    });

    expect(wrapper.find('.el-skeleton').exists()).toBe(true);
    expect(wrapper.find('.at-statistic__number').exists()).toBe(false);

    await wrapper.setProps({ loading: false });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.el-skeleton').exists()).toBe(false);
    expect(wrapper.find('.at-statistic__number').exists()).toBe(true);

    wrapper.unmount();
  });

  it('命令式动画重启与 Expose 契约：restart 方法与 displayValue', async () => {
    const wrapper = mount(AtengStatistic, {
      props: {
        value: 500,
        duration: 100,
      },
    });

    expect(typeof wrapper.vm.restart).toBe('function');
    expect(wrapper.vm.displayValue).toBeDefined();

    wrapper.vm.restart();
    await wrapper.vm.$nextTick();

    wrapper.unmount();
  });
});

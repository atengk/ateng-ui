/**
 * AtengPageSkeleton 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengPageSkeleton } from '../src/components/page-skeleton';

describe('AtengPageSkeleton 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('表格模态预设 (type=table)：加载中渲染模拟搜索栏与多行表格', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'table',
        rows: 3,
      },
      slots: {
        default: '<div class="real-table">真实表格数据</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-page-skeleton');
    expect(wrapper.find('.at-skeleton-table').exists()).toBe(true);
    expect(wrapper.find('.at-skeleton-table__query').exists()).toBe(true);
    expect(wrapper.findAll('.at-skeleton-table__row').length).toBe(3);
    // loading 状态下真实内容不可见
    expect(wrapper.find('.real-table').exists()).toBe(false);
  });

  it('表格模态高拟真参数化 (columnWidths)：自定义表格列宽与列数', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'table',
        rows: 2,
        columnWidths: [180, '30%', 120, '40%'],
      },
      attachTo: document.body,
    });

    const header = wrapper.find('.at-skeleton-table__header');
    expect(header.exists()).toBe(true);
    const headerCols = header.findAll('.el-skeleton__item');
    expect(headerCols.length).toBe(4);
    expect(headerCols[0].attributes('style')).toContain('width: 180px');
    expect(headerCols[1].attributes('style')).toContain('width: 30%');
    expect(headerCols[2].attributes('style')).toContain('width: 120px');
    expect(headerCols[3].attributes('style')).toContain('width: 40%');

    const firstRow = wrapper.findAll('.at-skeleton-table__row')[0];
    const rowCols = firstRow.findAll('.el-skeleton__item');
    expect(rowCols.length).toBe(4);
    expect(rowCols[0].attributes('style')).toContain('width: 180px');
    expect(rowCols[1].attributes('style')).toContain('width: 30%');
    expect(rowCols[2].attributes('style')).toContain('width: 120px');
    expect(rowCols[3].attributes('style')).toContain('width: 40%');
  });

  it('表格模态高拟真参数化 (showPagination)：默认不渲染，开启后渲染假分页占位', async () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'table',
      },
      attachTo: document.body,
    });

    // 默认 showPagination 为 false
    expect(wrapper.find('.at-skeleton-table__pagination').exists()).toBe(false);

    // 开启 showPagination: true
    await wrapper.setProps({ showPagination: true });
    expect(wrapper.find('.at-skeleton-table__pagination').exists()).toBe(true);
    expect(wrapper.find('.at-skeleton-pagination-total').exists()).toBe(true);
    expect(wrapper.findAll('.at-skeleton-pagination-btn').length).toBeGreaterThan(0);
  });

  it('表格模态高拟真参数化 (showHeader)：支持隐藏顶部检索区以适应纯表格', async () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'table',
        showHeader: false,
      },
      attachTo: document.body,
    });

    // 隐藏顶部搜索区
    expect(wrapper.find('.at-skeleton-table__query').exists()).toBe(false);
    // 表头和数据行依然正常渲染
    expect(wrapper.find('.at-skeleton-table__header').exists()).toBe(true);
    expect(wrapper.findAll('.at-skeleton-table__row').length).toBe(5);

    // 动态切回 true 时渲染
    await wrapper.setProps({ showHeader: true });
    expect(wrapper.find('.at-skeleton-table__query').exists()).toBe(true);
  });

  it('表单模态预设 (type=form)：加载中渲染表单栅格骨架', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'form',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-skeleton-form').exists()).toBe(true);
    expect(wrapper.find('.at-skeleton-form__actions').exists()).toBe(true);
  });

  it('详情模态预设 (type=detail)：渲染详情结构骨架', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'detail',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-skeleton-detail').exists()).toBe(true);
  });

  it('卡片模态预设 (type=card)：渲染卡片网格骨架', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'card',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-skeleton-card-grid').exists()).toBe(true);
  });

  it('仪表盘模态预设 (type=dashboard)：渲染 4 张指标卡与双图表区块骨架', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
        type: 'dashboard',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-skeleton-dashboard').exists()).toBe(true);
    expect(wrapper.find('.at-skeleton-dashboard__stats').exists()).toBe(true);
    expect(wrapper.findAll('.at-skeleton-stat-card').length).toBe(4);
    expect(wrapper.find('.at-skeleton-dashboard__charts').exists()).toBe(true);
    expect(wrapper.findAll('.at-skeleton-chart-card').length).toBe(2);
  });

  it('完全自定义骨架屏插槽 (slot: skeleton)：优先渲染自定义插槽内容', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: true,
      },
      slots: {
        skeleton: '<div class="my-custom-skeleton">自定义波浪骨架</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.my-custom-skeleton').exists()).toBe(true);
    expect(wrapper.find('.at-skeleton-table').exists()).toBe(false);
  });

  it('加载完成态 (loading=false)：渲染真实业务视图', () => {
    wrapper = mount(AtengPageSkeleton, {
      props: {
        loading: false,
      },
      slots: {
        default: '<div class="real-view">真实业务界面</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-page-skeleton__wrapper').exists()).toBe(false);
    expect(wrapper.find('.real-view').exists()).toBe(true);
  });
});

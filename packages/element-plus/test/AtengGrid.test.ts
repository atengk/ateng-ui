/**
 * AtengGrid 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengGrid } from '../src/components/grid';

describe('AtengGrid 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：默认标签、类名与自适应 CSS Grid 样式', () => {
    wrapper = mount(AtengGrid, {
      slots: {
        default: '<div class="item">Item 1</div><div class="item">Item 2</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-grid');
    expect(wrapper.element.tagName.toLowerCase()).toBe('div');
    expect(wrapper.findAll('.item').length).toBe(2);

    const el = wrapper.element as HTMLElement;
    expect(el.style.display).toBe('grid');
    expect(el.style.containerType).toBe('inline-size');
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(260px, 1fr))');
    expect(el.style.rowGap).toBe('16px');
    expect(el.style.columnGap).toBe('16px');
  });

  it('自定义 minItemWidth：支持纯数字与带单位字符串', async () => {
    wrapper = mount(AtengGrid, {
      props: {
        minItemWidth: 320,
      },
      attachTo: document.body,
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(320px, 1fr))');

    await wrapper.setProps({
      minItemWidth: '20rem',
    });
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(20rem, 1fr))');
  });

  it('灵活间距配置：支持单值、双值数组与独立覆盖', async () => {
    // 1. 数组间距 [rowGap, colGap]
    wrapper = mount(AtengGrid, {
      props: {
        gap: [12, 24],
      },
      attachTo: document.body,
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.rowGap).toBe('12px');
    expect(el.style.columnGap).toBe('24px');

    // 2. 独立 rowGap 与 colGap 覆盖
    await wrapper.setProps({
      gap: 16,
      rowGap: '32px',
      colGap: '40px',
    });
    expect(el.style.rowGap).toBe('32px');
    expect(el.style.columnGap).toBe('40px');
  });

  it('显式固定列数覆盖 (cols)', () => {
    wrapper = mount(AtengGrid, {
      props: {
        cols: 4,
        minItemWidth: 400, // 此时 cols 优先级高于 minItemWidth
      },
      attachTo: document.body,
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('对齐与分布配置 (align / justify)', () => {
    wrapper = mount(AtengGrid, {
      props: {
        align: 'center',
        justify: 'space-between',
      },
      attachTo: document.body,
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyItems).toBe('space-between');
  });

  it('自定义根 HTML 标签 (tag)', () => {
    wrapper = mount(AtengGrid, {
      props: {
        tag: 'ul',
      },
      slots: {
        default: '<li>List item</li>',
      },
      attachTo: document.body,
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe('ul');
    expect(wrapper.classes()).toContain('at-grid');
  });
});

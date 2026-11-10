/**
 * AtengPrintSeal 电子印章组件单元测试。
 *
 * 验证纯矢量 SVG 印章渲染、旋转倾斜矩阵、透明度印泥质感、防伪编码与图片模式。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengPrintSeal from '../src/components/AtengPrintSeal.vue';

describe('AtengPrintSeal', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('默认以 SVG 矢量模式挂载，并包含公司名称、五角星与印章标题', () => {
    wrapper = mount(AtengPrintSeal, {
      props: {
        company: '北京航天精工动力设备厂',
        title: '财务专用章',
        code: '91110108MA01234567',
      },
    });

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);

    const text = wrapper.text();
    expect(text).toContain('北京航天精工动力设备厂');
    expect(text).toContain('财务专用章');
    expect(text).toContain('91110108MA01234567');

    const star = wrapper.find('polygon');
    expect(star.exists()).toBe(true);
  });

  it('应用自然倾斜旋转 (rotate) 与印泥透明度 (opacity)', () => {
    wrapper = mount(AtengPrintSeal, {
      props: {
        rotate: -15,
        opacity: 0.8,
        color: '#b91c1c',
      },
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.transform).toContain('rotate(-15deg)');
    expect(el.style.opacity).toBe('0.8');
    expect(el.style.pointerEvents).toBe('none');
  });

  it('支持图片贴图模式 (src)', () => {
    wrapper = mount(AtengPrintSeal, {
      props: {
        type: 'image',
        src: 'https://example.com/seal.png',
        rotate: 5,
      },
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/seal.png');
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('支持绝对定位坐标传参 (top, right, bottom, left)', () => {
    wrapper = mount(AtengPrintSeal, {
      props: {
        position: 'absolute',
        bottom: '20px',
        right: '30px',
        zIndex: 99,
      },
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.position).toBe('absolute');
    expect(el.style.bottom).toBe('20px');
    expect(el.style.right).toBe('30px');
    expect(el.style.zIndex).toBe('99');
  });
});

/**
 * AtengFooterBar 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengFooterBar } from '../src/components/footer-bar';

describe('AtengFooterBar 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：默认 sticky 模式，包含操作按钮与边框', () => {
    wrapper = mount(AtengFooterBar, {
      slots: {
        default: '<button class="submit-btn">提交</button>',
        extra: '<span class="status-tip">已自动保存草稿</span>',
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.exists()).toBe(true);
    expect(bar.classes()).toContain('is-sticky');
    expect(bar.classes()).toContain('is-bordered');
    expect(wrapper.find('.submit-btn').exists()).toBe(true);
    expect(wrapper.find('.status-tip').exists()).toBe(true);
  });

  it('fixed 模式与防遮挡占位垫块 (placeholder)', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: true,
        height: 60,
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.classes()).toContain('is-fixed');
    expect(bar.attributes('style')).toContain('position: fixed');

    // 占位垫块
    const placeholder = wrapper.find('.at-footer-bar__placeholder');
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.attributes('style')).toContain('height: 60px');
  });

  it('关闭 placeholder 时不渲染占位块', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: false,
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-footer-bar__placeholder').exists()).toBe(false);
  });
});

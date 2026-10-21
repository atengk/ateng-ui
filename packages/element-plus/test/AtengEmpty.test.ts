/**
 * AtengEmpty 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, defineComponent } from 'vue';
import { ElButton } from 'element-plus';
import { AtengEmpty } from '../src/components/empty';
import type { AtengEmptyStatus } from '../src/components/empty/types';

describe('AtengEmpty 组件规范与渲染测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('默认状态：渲染 empty 语义态、默认文案与空数据矢量插画', () => {
    wrapper = mount(AtengEmpty, { attachTo: document.body });

    expect(wrapper.classes()).toContain('at-empty');
    expect(wrapper.classes()).toContain('at-empty--empty');
    expect(wrapper.text()).toContain('暂无数据');

    const svg = wrapper.find('.at-empty-illustration--empty');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('width')).toBe('160');
    expect(svg.attributes('height')).toBe('160');
  });

  const statuses: Array<{
    status: AtengEmptyStatus;
    expectedText: string;
    expectedClass: string;
  }> = [
    {
      status: 'search',
      expectedText: '未找到匹配结果',
      expectedClass: 'at-empty-illustration--search',
    },
    {
      status: '403',
      expectedText: '抱歉，您暂无访问该页面的权限',
      expectedClass: 'at-empty-illustration--403',
    },
    {
      status: 'network-error',
      expectedText: '网络连接异常，请检查网络后重试',
      expectedClass: 'at-empty-illustration--network-error',
    },
    {
      status: '500',
      expectedText: '服务开小差了，请稍后重试',
      expectedClass: 'at-empty-illustration--500',
    },
  ];

  for (const item of statuses) {
    it(`语义状态 [${item.status}]：正确呈现语义类名、对应默认文案与专用矢量插画`, () => {
      wrapper = mount(AtengEmpty, {
        props: { status: item.status },
        attachTo: document.body,
      });

      expect(wrapper.classes()).toContain(`at-empty--${item.status}`);
      expect(wrapper.text()).toContain(item.expectedText);
      expect(wrapper.find(`.${item.expectedClass}`).exists()).toBe(true);
    });
  }

  it('支持自定义 description 属性覆盖默认文案', () => {
    wrapper = mount(AtengEmpty, {
      props: {
        status: 'search',
        description: '未能搜到符合条件的人员信息，请尝试更换关键词',
      },
      attachTo: document.body,
    });

    expect(wrapper.text()).toContain('未能搜到符合条件的人员信息，请尝试更换关键词');
    expect(wrapper.text()).not.toContain('未找到匹配结果');
  });

  it('支持自定义 imageSize 调整插画尺寸', () => {
    wrapper = mount(AtengEmpty, {
      props: {
        status: '403',
        imageSize: 220,
      },
      attachTo: document.body,
    });

    const svg = wrapper.find('.at-empty-illustration--403');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('width')).toBe('220');
    expect(svg.attributes('height')).toBe('220');
  });

  it('支持传入 image 外链图片优先展示自定义图片', () => {
    const customImg = 'https://example.com/custom-empty.png';
    wrapper = mount(AtengEmpty, {
      props: {
        image: customImg,
        imageSize: 180,
      },
      attachTo: document.body,
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(customImg);
    const imgWrapper = wrapper.find('.el-empty__image');
    expect((imgWrapper.element as HTMLElement).style.width).toBe('180px');
    expect(wrapper.find('.at-empty-illustration').exists()).toBe(false);
  });

  it('支持 #default 底部操作区插槽并可触发交互', async () => {
    const onRetry = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { onRetry };
      },
      render() {
        return h(
          AtengEmpty,
          { status: 'network-error' },
          {
            default: () => [
              h(ElButton, { id: 'retry-btn', type: 'primary', onClick: onRetry }, () => '重新加载'),
            ],
          },
        );
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#retry-btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('重新加载');

    await btn.trigger('click');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('支持 #description 插槽完全自定义文案结构', () => {
    wrapper = mount(AtengEmpty, {
      slots: {
        description: () => h('span', { class: 'custom-desc' }, 'VIP专属页面，暂未开放'),
      },
      attachTo: document.body,
    });

    const customDesc = wrapper.find('.custom-desc');
    expect(customDesc.exists()).toBe(true);
    expect(customDesc.text()).toBe('VIP专属页面，暂未开放');
  });

  it('支持 #image 插槽自定义插画结构', () => {
    wrapper = mount(AtengEmpty, {
      slots: {
        image: () => h('div', { class: 'custom-illustration' }, '🎨 自定义插画'),
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.custom-illustration').exists()).toBe(true);
    expect(wrapper.find('.custom-illustration').text()).toBe('🎨 自定义插画');
    expect(wrapper.find('.at-empty-illustration').exists()).toBe(false);
  });
});

/**
 * AtengAnchor 电梯楼层导航锚点容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengAnchor, type AtengAnchorItem } from '../src/components/anchor';

describe('AtengAnchor 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  const mockItems: AtengAnchorItem[] = [
    {
      href: '#section-1',
      title: '第 1 节 快速起步',
      children: [
        { href: '#section-1-1', title: '1.1 环境安装' },
        { href: '#section-1-2', title: '1.2 配置文件' },
      ],
    },
    {
      href: '#section-2',
      title: '第 2 节 核心架构',
    },
    {
      href: '#section-3',
      title: '第 3 节 生产治理',
    },
  ];

  it('基础渲染与树形小节解析：正确递归渲染一级与二级锚点项', () => {
    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-anchor');
    expect(wrapper.classes()).toContain('is-vertical');
    expect(wrapper.classes()).toContain('has-ink');

    const links = wrapper.findAll('.at-anchor__link');
    // 包含 1, 1-1, 1-2, 2, 3 共 5 个链接
    expect(links).toHaveLength(5);
    expect(links[0].text()).toBe('第 1 节 快速起步');
    expect(links[1].text()).toBe('1.1 环境安装');
    expect(links[2].text()).toBe('1.2 配置文件');
    expect(links[3].text()).toBe('第 2 节 核心架构');
    expect(links[4].text()).toBe('第 3 节 生产治理');

    // 子小节包含 is-sub 类名
    const subItems = wrapper.findAll('.at-anchor__item.is-sub');
    expect(subItems).toHaveLength(2);
  });

  it('点击锚点触发平滑定位与事件派发', async () => {
    // 构造带 id 的目标 DOM
    const sec1 = document.createElement('div');
    sec1.id = 'section-1';
    document.body.appendChild(sec1);

    const sec2 = document.createElement('div');
    sec2.id = 'section-2';
    document.body.appendChild(sec2);

    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
        targetOffset: 20,
      },
      attachTo: document.body,
    });

    const links = wrapper.findAll('.at-anchor__link');

    // 点击第二个一级项 (#section-2)
    await links[3].trigger('click');

    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('update:currentAnchor')).toBeTruthy();
    expect(wrapper.emitted('update:currentAnchor')![0]).toEqual(['#section-2']);
    expect(wrapper.emitted('change')).toBeTruthy();
    expect(wrapper.emitted('change')![0]).toEqual(['#section-2']);

    // 对应链接附加 is-active 类名
    expect(links[3].classes()).toContain('is-active');
  });

  it('显式滚动容器逃生舱 (container) 与局部滚动定位', async () => {
    // 创建局部滚动容器与内部目标
    const scrollBox = document.createElement('div');
    scrollBox.id = 'custom-scroll-box';
    scrollBox.style.overflowY = 'auto';
    scrollBox.style.height = '400px';

    const target = document.createElement('div');
    target.id = 'section-3';
    scrollBox.appendChild(target);
    document.body.appendChild(scrollBox);

    const scrollToMock = vi.fn();
    scrollBox.scrollTo = scrollToMock;

    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
        container: '#custom-scroll-box',
        targetOffset: 16,
      },
      attachTo: document.body,
    });

    const links = wrapper.findAll('.at-anchor__link');
    // 点击 #section-3
    await links[4].trigger('click');

    expect(scrollToMock).toHaveBeenCalled();
  });

  it('智能向上探测祖先滚动容器：自动识别 .at-page-container__content 局部滚动宿主', async () => {
    // 构造模拟 AtengPageContainer 局部内容滚动宿主
    const pageContent = document.createElement('div');
    pageContent.className = 'at-page-container__content';
    pageContent.style.overflowY = 'auto';

    const targetSec = document.createElement('div');
    targetSec.id = 'section-2';
    pageContent.appendChild(targetSec);
    document.body.appendChild(pageContent);

    const scrollToSpy = vi.fn();
    pageContent.scrollTo = scrollToSpy;

    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
      },
      attachTo: pageContent,
    });

    const links = wrapper.findAll('.at-anchor__link');
    // 点击 #section-2
    await links[3].trigger('click');

    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('水平排列模式 (direction="horizontal")', () => {
    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
        direction: 'horizontal',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('is-horizontal');
    expect(wrapper.classes()).not.toContain('is-vertical');
  });

  it('受控双向绑定 (v-model:currentAnchor)：外部驱动当前激活小节', async () => {
    const currentAnchor = ref('#section-1');

    const TestComponent = defineComponent({
      components: { AtengAnchor },
      setup() {
        return { currentAnchor, mockItems };
      },
      template: `
        <AtengAnchor
          v-model:current-anchor="currentAnchor"
          :items="mockItems"
        />
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const links = wrapper.findAll('.at-anchor__link');

    expect(links[0].classes()).toContain('is-active');
    expect(links[3].classes()).not.toContain('is-active');

    // 动态修改激活值
    currentAnchor.value = '#section-2';
    await wrapper.vm.$nextTick();

    expect(links[0].classes()).not.toContain('is-active');
    expect(links[3].classes()).toContain('is-active');
  });

  it('确定性生命周期治理：组件销毁时注销滚动监听与取消 rAF', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    wrapper = mount(AtengAnchor, {
      props: {
        items: mockItems,
      },
      attachTo: document.body,
    });

    wrapper.unmount();
    wrapper = null;

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

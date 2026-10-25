/**
 * AtengLayout 基础无状态布局架构套件单元测试。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref, h } from 'vue';
import {
  AtengLayout,
  AtengHeader,
  AtengAside,
  AtengContent,
  AtengFooter,
} from '../src/components/layout';

describe('AtengLayout Suite', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('1. AtengLayout 默认以纵向 section 渲染，无 has-aside 类名', () => {
    wrapper = mount(AtengLayout, {
      slots: {
        default: () => [h('div', 'Content')],
      },
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe('section');
    expect(wrapper.classes()).toContain('at-layout');
    expect(wrapper.classes()).not.toContain('has-aside');
    expect(wrapper.text()).toBe('Content');
  });

  it('2. AtengLayout 包含 AtengAside 子组件时，自动追加 has-aside 类名并切换排版方向', async () => {
    const TestComponent = defineComponent({
      components: { AtengLayout, AtengHeader, AtengAside, AtengContent, AtengFooter },
      template: `
        <AtengLayout>
          <AtengHeader>Header</AtengHeader>
          <AtengLayout>
            <AtengAside>Aside</AtengAside>
            <AtengContent>Content</AtengContent>
          </AtengLayout>
          <AtengFooter>Footer</AtengFooter>
        </AtengLayout>
      `,
    });

    wrapper = mount(TestComponent);

    const layouts = wrapper.findAllComponents(AtengLayout);
    expect(layouts.length).toBe(2);

    // 外层没有 Aside，是纵向
    expect(layouts[0].classes()).not.toContain('has-aside');
    // 内层包含 Aside，自动识别并添加 has-aside
    expect(layouts[1].classes()).toContain('has-aside');
  });

  it('3. AtengLayout 显式声明 direction 时具有最高优先级', () => {
    const TestComponent = defineComponent({
      components: { AtengLayout, AtengAside, AtengContent },
      template: `
        <AtengLayout direction="vertical">
          <AtengAside>Aside</AtengAside>
          <AtengContent>Content</AtengContent>
        </AtengLayout>
      `,
    });

    wrapper = mount(TestComponent);
    const layout = wrapper.findComponent(AtengLayout);
    expect(layout.classes()).not.toContain('has-aside');
    expect(layout.attributes('style')).toContain('flex-direction: column');
  });

  it('4. AtengHeader 渲染高度、自定义背景与自定义 tag', () => {
    wrapper = mount(AtengHeader, {
      props: {
        height: 80,
        background: '#123456',
        tag: 'div',
      },
      slots: {
        default: () => 'Top Nav',
      },
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe('div');
    expect(wrapper.classes()).toContain('at-header');
    expect(wrapper.text()).toBe('Top Nav');
    expect(wrapper.attributes('style')).toContain('height: 80px');
    expect(wrapper.attributes('style')).toContain('background-color: #123456');
  });

  it('5. AtengContent 渲染主体插槽内容与 flex 自适应撑满', () => {
    wrapper = mount(AtengContent, {
      props: {
        background: '#f0f2f5',
        tag: 'main',
      },
      slots: {
        default: () => 'Main Body',
      },
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe('main');
    expect(wrapper.classes()).toContain('at-content');
    expect(wrapper.text()).toBe('Main Body');
  });

  it('6. AtengFooter 渲染高度与自定义标签', () => {
    wrapper = mount(AtengFooter, {
      props: {
        height: '60px',
        tag: 'footer',
      },
      slots: {
        default: () => 'Copyright 2026',
      },
    });

    expect(wrapper.element.tagName.toLowerCase()).toBe('footer');
    expect(wrapper.classes()).toContain('at-footer');
    expect(wrapper.attributes('style')).toContain('height: 60px');
    expect(wrapper.text()).toBe('Copyright 2026');
  });

  it('7. AtengAside 支持受控折叠、触发器点击与自定义插槽', async () => {
    const TestComponent = defineComponent({
      components: { AtengAside },
      setup() {
        const collapsed = ref(false);
        return { collapsed };
      },
      template: `
        <AtengAside
          v-model:collapsed="collapsed"
          collapsible
          width="240px"
          collapsedWidth="64px"
        >
          <div class="menu">Sidebar Menu</div>
        </AtengAside>
      `,
    });

    wrapper = mount(TestComponent);
    const aside = wrapper.findComponent(AtengAside);

    expect(aside.classes()).toContain('at-aside');
    expect(aside.classes()).not.toContain('is-collapsed');
    expect(aside.attributes('style')).toContain('width: 240px');

    // 点击默认底部折叠触发条
    const trigger = aside.find('.at-aside__trigger');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger('click');

    expect(wrapper.vm.collapsed).toBe(true);
    expect(aside.classes()).toContain('is-collapsed');
    expect(aside.attributes('style')).toContain('width: 64px');

    // 再次点击复原
    await trigger.trigger('click');
    expect(wrapper.vm.collapsed).toBe(false);
    expect(aside.attributes('style')).toContain('width: 240px');
  });

  it('8. AtengAside 支持自定义 #trigger 插槽', async () => {
    const TestComponent = defineComponent({
      components: { AtengAside },
      setup() {
        const collapsed = ref(false);
        return { collapsed };
      },
      template: `
        <AtengAside v-model:collapsed="collapsed" collapsible>
          <div>Body</div>
          <template #trigger="{ collapsed: isCol, toggle }">
            <button class="my-trigger" @click="toggle">{{ isCol ? 'Expand' : 'Collapse' }}</button>
          </template>
        </AtengAside>
      `,
    });

    wrapper = mount(TestComponent);
    const customBtn = wrapper.find('.my-trigger');
    expect(customBtn.text()).toBe('Collapse');

    await customBtn.trigger('click');
    expect(wrapper.vm.collapsed).toBe(true);
    expect(customBtn.text()).toBe('Expand');
  });
});

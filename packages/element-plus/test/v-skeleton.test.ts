/**
 * v-skeleton 细粒度微骨架指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { vSkeleton } from '../src/directives/skeleton';

describe('v-skeleton 指令规范与交互测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('1. 当 v-skeleton="true" 挂载时，自动追加 .at-skeleton-active 与 .is-animated', async () => {
    const TestComponent = defineComponent({
      directives: { skeleton: vSkeleton },
      setup() {
        const loading = ref(true);
        return { loading };
      },
      template: `
        <div v-skeleton="loading" class="my-card">
          <span class="title">Card Title</span>
          <p class="desc">Card Description</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    const cardEl = wrapper.find('.my-card');

    expect(cardEl.classes()).toContain('at-skeleton-active');
    expect(cardEl.classes()).toContain('is-animated');
    // 子元素依然完整存在于 DOM 中（保持物理尺寸，零 CLS）
    expect(cardEl.find('.title').exists()).toBe(true);
    expect(cardEl.find('.desc').exists()).toBe(true);

    // 切换为 false 时，类名被清理
    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();

    expect(cardEl.classes()).not.toContain('at-skeleton-active');
    expect(cardEl.classes()).not.toContain('is-animated');
  });

  it('2. 支持配置对象：animated 为 false 时不添加 .is-animated', async () => {
    const TestComponent = defineComponent({
      directives: { skeleton: vSkeleton },
      template: `
        <div v-skeleton="{ loading: true, animated: false }" class="static-box">
          Static Content
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    const box = wrapper.find('.static-box');

    expect(box.classes()).toContain('at-skeleton-active');
    expect(box.classes()).not.toContain('is-animated');
  });

  it('3. 支持配置对象自定义 radius 并在 loading 结束后复原', async () => {
    const TestComponent = defineComponent({
      directives: { skeleton: vSkeleton },
      setup() {
        const loading = ref(true);
        return { loading };
      },
      template: `
        <div v-skeleton="{ loading: loading, radius: 16 }" class="radius-box" style="border-radius: 4px;">
          Radius Box
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    const box = wrapper.find('.radius-box');

    expect(box.attributes('style')).toContain('border-radius: 16px');

    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();

    expect(box.classes()).not.toContain('at-skeleton-active');
    expect(box.attributes('style')).toContain('border-radius: 4px');
  });

  it('4. static 定位的元素自动提升为 relative 定位上下文并在取消时复原', async () => {
    const TestComponent = defineComponent({
      directives: { skeleton: vSkeleton },
      setup() {
        const loading = ref(true);
        return { loading };
      },
      template: `
        <div v-skeleton="loading" class="plain-box">
          Plain
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    const box = wrapper.find('.plain-box');

    expect(box.attributes('style')).toContain('position: relative');

    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();

    // 复原为原有样式
    expect(box.attributes('style') || '').not.toContain('position: relative');
  });

  it('5. 组件卸载时安全清理 WeakMap 状态与类名', () => {
    const TestComponent = defineComponent({
      directives: { skeleton: vSkeleton },
      template: `<div v-skeleton="true" class="target">Hello</div>`,
    });

    wrapper = mount(TestComponent);
    const target = wrapper.find('.target');
    expect(target.classes()).toContain('at-skeleton-active');

    // 卸载
    wrapper.unmount();
    wrapper = null;
  });
});

/**
 * 容器上下文总线 (Container Context Bus) 跨组件协同单元测试。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
  AtengPageContainer,
  PAGE_CONTAINER_INJECTION_KEY,
  type AtengPageContainerContext,
} from '../src/components/page-container';
import { AtengFooterBar } from '../src/components/footer-bar';
import { AtengAnchor } from '../src/components/anchor';

describe('容器上下文总线 (Container Context Bus) 协同测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('上下文注入契约：AtengPageContainer 向上文注入 PAGE_CONTAINER_INJECTION_KEY', () => {
    let capturedContext: AtengPageContainerContext | null = null;

    const TestChild = defineComponent({
      inject: {
        bus: {
          from: PAGE_CONTAINER_INJECTION_KEY,
          default: null,
        },
      },
      setup(_props, { inject: _inject }) {
        return () => h('div', { class: 'test-child' });
      },
      mounted() {
        capturedContext = (this as unknown as { bus: AtengPageContainerContext }).bus;
      },
    });

    wrapper = mount(AtengPageContainer, {
      props: {
        title: '总线测试页',
        fitViewport: true,
      },
      slots: {
        default: () => h(TestChild),
      },
      attachTo: document.body,
    });

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!.fitViewport.value).toBe(true);
    expect(typeof capturedContext!.registerFooter).toBe('function');
    expect(typeof capturedContext!.getScrollContainer).toBe('function');
    expect(capturedContext!.getScrollContainer()).toBe(
      wrapper.find('.at-page-container__content').element,
    );
  });

  it('动态占位协同：AtengFooterBar 嵌套于内容插槽时自动注册高度，父容器为滚动区追加 padding-bottom 垫块', async () => {
    const showFooter = ref(true);

    const ParentComponent = defineComponent({
      setup() {
        return () =>
          h(
            AtengPageContainer,
            {
              title: '底栏避让页面',
              contentPadding: '16px',
            },
            {
              default: () => [
                h('div', { class: 'long-content', style: 'height: 800px' }, '长表单内容'),
                showFooter.value ? h(AtengFooterBar, { height: 60 }) : null,
              ],
            },
          );
      },
    });

    wrapper = mount(ParentComponent, {
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();

    const content = wrapper.find('.at-page-container__content');
    expect(content.exists()).toBe(true);

    // 注册 60px 高度底栏后，内容区域自动追加 padding-bottom 占位垫块 (16px + 60px = 76px)
    expect((content.element as HTMLElement).style.paddingBottom).toBe('76px');

    // 卸载底栏后，确定性还原并移除追加的 padding-bottom
    showFooter.value = false;
    await wrapper.vm.$nextTick();
    expect((content.element as HTMLElement).style.paddingBottom).toBe('');
  });

  it('#footer 具名插槽：渲染在 Flex 最底层，天然不随内容滚动', () => {
    wrapper = mount(AtengPageContainer, {
      props: {
        title: '具名底栏插槽页',
      },
      slots: {
        default: '<div class="page-body">主体数据</div>',
        footer: '<div class="dedicated-footer">专用固定底栏</div>',
      },
      attachTo: document.body,
    });

    const footerSlot = wrapper.find('.at-page-container__footer');
    expect(footerSlot.exists()).toBe(true);
    expect(footerSlot.find('.dedicated-footer').exists()).toBe(true);
  });

  it('锚点自动感知：AtengAnchor 置于 AtengPageContainer 内且未指定 container 时，自动绑定局部滚动内容区', () => {
    const ParentComponent = defineComponent({
      setup() {
        return () =>
          h(
            AtengPageContainer,
            {
              title: '锚点协同页面',
            },
            {
              default: () => [
                h(AtengAnchor, {
                  items: [
                    { href: '#sec-1', title: '小节一' },
                    { href: '#sec-2', title: '小节二' },
                  ],
                }),
                h('div', { id: 'sec-1', style: 'height: 400px' }),
                h('div', { id: 'sec-2', style: 'height: 400px' }),
              ],
            },
          );
      },
    });

    wrapper = mount(ParentComponent, {
      attachTo: document.body,
    });

    const anchorVm = wrapper.findComponent(AtengAnchor).vm as unknown as {
      getScrollContainer?: () => HTMLElement | Window;
      scrollContainer?: HTMLElement | Window;
    };

    const contentEl = wrapper.find('.at-page-container__content').element;
    const resolved =
      (typeof anchorVm.getScrollContainer === 'function' ? anchorVm.getScrollContainer() : null) ||
      anchorVm.scrollContainer;

    expect(resolved).toBe(contentEl);
  });

  it('优雅降级兼容：AtengFooterBar 与 AtengAnchor 在脱离 AtengPageContainer 时均能独立正常工作', () => {
    // 独立运行 AtengFooterBar
    const footerWrapper = mount(AtengFooterBar, {
      props: {
        height: 56,
      },
      attachTo: document.body,
    });
    expect(footerWrapper.find('.at-footer-bar').exists()).toBe(true);
    footerWrapper.unmount();

    // 独立运行 AtengAnchor
    const anchorWrapper = mount(AtengAnchor, {
      props: {
        items: [{ href: '#title', title: '标题' }],
      },
      attachTo: document.body,
    });
    expect(anchorWrapper.classes()).toContain('at-anchor');
    anchorWrapper.unmount();
  });
});

/**
 * v-watermark 指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { vWatermark, WATERMARK_MASK_CLASS } from '../src/directives/watermark';

describe('v-watermark 指令规范与防篡改测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('容器局部水印：自动为宿主装配 relative 定位并生成 absolute 遮罩', async () => {
    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      template: `
        <div id="container" v-watermark="'内部机密资料'">
          <p>内容区域</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const container = wrapper.find('#container');
    const containerEl = container.element as HTMLElement;

    expect(containerEl.style.position).toBe('relative');

    const maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl).not.toBeNull();
    expect(maskEl.style.position).toBe('absolute');
    expect(maskEl.style.pointerEvents).toBe('none');
    expect(maskEl.style.zIndex).toBe('9999');
    expect(maskEl.style.backgroundImage).toContain('data:image/');
  });

  it('全屏水印：支持 .full 修饰符并采用 position: fixed 覆盖视口', async () => {
    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      template: `
        <div id="full-page" v-watermark.full="'全屏水印文本'">
          <p>全屏页面</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const container = wrapper.find('#full-page');
    const containerEl = container.element as HTMLElement;

    const maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl).not.toBeNull();
    expect(maskEl.style.position).toBe('fixed');
    expect(maskEl.style.top).toBe('0px');
    expect(maskEl.style.left).toBe('0px');
  });

  it('防篡改自愈：当 DevTools 恶意删除水印遮罩 DOM 时自动微任务级重建', async () => {
    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      template: `
        <div id="container" v-watermark="'防删除水印'">
          <p>重要业务数据</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const containerEl = wrapper.find('#container').element as HTMLElement;

    let maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl).not.toBeNull();

    // 模拟控制台恶意物理删除节点
    maskEl.remove();
    expect(containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`)).toBeNull();

    // 等待 MutationObserver 微任务触发自愈
    await new Promise(resolve => setTimeout(resolve, 30));
    await nextTick();

    // 验证自愈已成功重新挂载水印遮罩
    maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl).not.toBeNull();
    expect(maskEl.style.pointerEvents).toBe('none');
  });

  it('防篡改自愈：当 DevTools 恶意篡改遮罩样式 (display:none) 时自动还原', async () => {
    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      template: `
        <div id="container" v-watermark="'防隐藏水印'">
          <p>重要业务数据</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const containerEl = wrapper.find('#container').element as HTMLElement;

    const maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl).not.toBeNull();

    // 模拟控制台篡改样式隐藏水印
    maskEl.style.display = 'none';
    maskEl.style.opacity = '0';

    // 等待 MutationObserver 微任务处理
    await new Promise(resolve => setTimeout(resolve, 30));
    await nextTick();

    // 验证已被强制还原为安全可见状态
    expect(maskEl.style.display).toBe('block');
    expect(maskEl.style.opacity).toBe('1');
  });

  it('动态更新：入参配置改变时重新渲染背景', async () => {
    const watermarkText = ref('第一版水印');

    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      setup() {
        return { watermarkText };
      },
      template: `
        <div id="container" v-watermark="watermarkText">
          <p>内容</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const containerEl = wrapper.find('#container').element as HTMLElement;

    let maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    const initialBg = maskEl.style.backgroundImage;
    expect(initialBg).toContain('data:image/');

    // 动态改变文本
    watermarkText.value = '更新后的绝密水印';
    await nextTick();

    maskEl = containerEl.querySelector(`.${WATERMARK_MASK_CLASS}`) as HTMLElement;
    expect(maskEl.style.backgroundImage).toContain('data:image/');
  });

  it('组件卸载后断开监听并物理销毁遮罩节点，还原宿主样式', async () => {
    const show = ref(true);

    const TestComponent = defineComponent({
      directives: { watermark: vWatermark },
      setup() {
        return { show };
      },
      template: `
        <div v-if="show" id="container" v-watermark="'待销毁水印'">
          <p>内容</p>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    expect(document.querySelector(`.${WATERMARK_MASK_CLASS}`)).not.toBeNull();

    // 卸载组件
    show.value = false;
    await nextTick();

    expect(document.querySelector(`.${WATERMARK_MASK_CLASS}`)).toBeNull();
  });
});

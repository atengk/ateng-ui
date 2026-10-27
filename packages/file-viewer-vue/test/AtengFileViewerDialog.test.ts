/**
 * AtengFileViewerDialog 声明式弹窗与 previewFile 命令式挂载/销毁契约测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AtengFileViewerDialog from '../src/components/AtengFileViewerDialog.vue';
import { previewFile, FileViewer } from '../src/utils/preview';

describe('AtengFileViewerDialog 声明式全屏弹窗契约测试 (#138)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('默认 visible 为 false 时不挂载弹窗，受控为 true 时挂载并展示标题', async () => {
    const wrapper = mount(AtengFileViewerDialog, {
      props: {
        modelValue: false,
        appendToBody: false,
        url: 'https://example.com/test.docx',
        fileName: '测试文档.docx',
      },
    });

    expect(wrapper.find('.at-file-viewer-dialog__overlay').exists()).toBe(false);

    // 受控打开
    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.find('.at-file-viewer-dialog__overlay').exists()).toBe(true);
    expect(wrapper.find('.at-file-viewer-dialog__title').text()).toContain('测试文档.docx');

    wrapper.unmount();
  });

  it('点击关闭按钮或按下 ESC 键触发 close 与 update:modelValue 事件', async () => {
    const wrapper = mount(AtengFileViewerDialog, {
      props: {
        modelValue: true,
        appendToBody: false,
        url: 'https://example.com/demo.pdf',
        closeOnPressEscape: true,
      },
    });

    await nextTick();

    // 1. 点击关闭按钮
    const closeBtn = wrapper.find('.at-file-viewer-dialog__btn--close');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();

    // 2. 模拟 ESC 按键
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escEvent);

    expect(wrapper.emitted('close')!.length).toBeGreaterThanOrEqual(2);

    wrapper.unmount();
  });

  it('支持全屏状态切换与内部 AtengFileViewer 实例方法透传', async () => {
    const wrapper = mount(AtengFileViewerDialog, {
      props: {
        modelValue: true,
        appendToBody: false,
        url: 'https://example.com/sheet.xlsx',
        fullscreen: false,
      },
    });

    await nextTick();

    const content = wrapper.find('.at-file-viewer-dialog__content');
    expect(content.classes()).not.toContain('is-fullscreen');

    // 调用全屏切换
    wrapper.vm.toggleFullscreen();
    await nextTick();

    expect(content.classes()).toContain('is-fullscreen');
    expect(wrapper.emitted('update:fullscreen')).toBeTruthy();

    // 验证方法代理
    expect(typeof wrapper.vm.zoomIn).toBe('function');
    expect(typeof wrapper.vm.setPage).toBe('function');
    expect(typeof wrapper.vm.download).toBe('function');

    wrapper.unmount();
  });

  it('支持自定义 #header 插槽定制', async () => {
    const wrapper = mount(AtengFileViewerDialog, {
      props: {
        modelValue: true,
        appendToBody: false,
        title: '企业自研文档',
      },
      slots: {
        header: `
          <template #header="{ title, close }">
            <div class="custom-header">
              <span>自定义标题: {{ title }}</span>
              <button class="custom-close-btn" @click="close">关闭窗口</button>
            </div>
          </template>
        `,
      },
    });

    await nextTick();

    expect(wrapper.find('.custom-header').exists()).toBe(true);
    expect(wrapper.find('.custom-header').text()).toContain('企业自研文档');

    await wrapper.find('.custom-close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });
});

describe('FileViewer.preview / previewFile 命令式函数挂载与彻底销毁契约测试 (#138)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('previewFile 动态在 body 创建 DOM 节点并挂载，调用 close / destroy 后 100% 确定性销毁', async () => {
    const onClose = vi.fn();
    const onClosed = vi.fn();

    // 1. 命令式调用
    const handle = previewFile({
      url: 'https://example.com/command.pdf',
      fileName: '命令式文档.pdf',
      onClose,
      onClosed,
    });

    await nextTick();

    // 验证 DOM 已动态注入
    const host = document.querySelector('.at-file-viewer-preview-host');
    expect(host).toBeTruthy();
    expect(document.querySelector('.at-file-viewer-dialog__title')?.textContent).toContain(
      '命令式文档.pdf',
    );

    // 2. 命令式关闭并立即销毁
    handle.close();
    expect(onClose).toHaveBeenCalledTimes(1);

    handle.destroy();
    expect(onClosed).toHaveBeenCalledTimes(1);

    // 3. 验证宿主 DOM 节点已从 document.body 彻底移除，零幽灵残留
    expect(document.querySelector('.at-file-viewer-preview-host')).toBeNull();
  });

  it('FileViewer.preview 便捷门面对象保持一致的命令式语义', async () => {
    const handle = FileViewer.preview({
      url: 'https://example.com/facade.docx',
      fileName: '门面测试.docx',
    });

    await nextTick();
    expect(document.querySelector('.at-file-viewer-dialog__title')?.textContent).toContain(
      '门面测试.docx',
    );

    handle.destroy();
    expect(document.querySelector('.at-file-viewer-preview-host')).toBeNull();
  });
});

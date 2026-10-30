/**
 * @atengk/editor-vue 媒体资产上传拦截 SPI、骨架占位与微浮层单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理挂载容器与 body；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证 uploadHandler 异步置换、Base64 降级、异常回滚及微浮层。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  AtengEditor,
  AtengImageBubbleMenu,
  AtengLinkBubbleMenu,
  type AtengEditorInstance,
  type UploadHandler,
} from '../src';

describe('媒体资产上传拦截 SPI 与微浮层 (Asset Upload & Bubble Menus)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const extractEditor = (inst: AtengEditorInstance): Editor => {
    const raw = (inst.editor as unknown as { value?: Editor })?.value ?? inst.editor;
    return raw as unknown as Editor;
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('声明式 uploadHandler 成功异步决议并将骨架占位平滑置换为图片节点', async () => {
    let resolvePromise: (value: { url: string; alt: string }) => void = () => {};
    const deferredPromise = new Promise<{ url: string; alt: string }>(resolve => {
      resolvePromise = resolve;
    });

    const mockUploadHandler: UploadHandler = vi.fn(() => deferredPromise);

    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>前置内容</p>',
        uploadHandler: mockUploadHandler,
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);
    expect(editor).toBeTruthy();

    const mockFile = new File(['mock-binary-data'], 'test-avatar.png', { type: 'image/png' });

    // 1. 调用 uploadImage 发起上传
    instance.uploadImage(mockFile);
    expect(mockUploadHandler).toHaveBeenCalledWith(mockFile);

    // 2. 决议异步上传 Promise
    resolvePromise({
      url: 'https://cdn.example.com/test-avatar.png',
      alt: '用户头像',
    });

    // 等待微任务与 Vue 渲染周期
    await new Promise(resolve => setTimeout(resolve, 20));
    await nextTick();

    // 3. 验证触发了 uploadSuccess 事件
    const emittedSuccess = wrapper.emitted('uploadSuccess');
    expect(emittedSuccess).toBeTruthy();
    expect(emittedSuccess?.[0][0]).toMatchObject({
      url: 'https://cdn.example.com/test-avatar.png',
      alt: '用户头像',
      file: mockFile,
    });

    // 4. 验证 HTML 内容中成功置换为真实图片节点
    const html = instance.getHTML();
    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.example.com/test-avatar.png"');
    expect(html).toContain('alt="用户头像"');
  });

  it('未提供 uploadHandler 时自动优雅降级为 Base64 Data URL 嵌入', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>Base64 测试</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    // 模拟 FileReader
    const fakeBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: ((e: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => {
          this.onload?.({ target: { result: fakeBase64 } });
        }, 5);
      }
    }

    // @ts-expect-error 模拟测试环境 FileReader
    globalThis.FileReader = MockFileReader;

    try {
      const mockFile = new File(['pixel'], 'dot.png', { type: 'image/png' });
      instance.uploadImage(mockFile);

      await new Promise(resolve => setTimeout(resolve, 30));
      await nextTick();

      const emittedSuccess = wrapper.emitted('uploadSuccess');
      expect(emittedSuccess).toBeTruthy();
      expect(emittedSuccess?.[0][0]).toMatchObject({
        url: fakeBase64,
        alt: 'dot.png',
      });

      const html = instance.getHTML();
      expect(html).toContain(fakeBase64);
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('uploadHandler 异常失败时触发 uploadError 并清理骨架占位块', async () => {
    const uploadError = new Error('网络连接中断 (504 Gateway Timeout)');
    const mockFailedUploadHandler: UploadHandler = vi.fn().mockRejectedValue(uploadError);

    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>故障保护测试</p>',
        uploadHandler: mockFailedUploadHandler,
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    const mockFile = new File(['data'], 'corrupted.jpg', { type: 'image/jpeg' });
    instance.uploadImage(mockFile);

    await new Promise(resolve => setTimeout(resolve, 20));
    await nextTick();

    // 验证 uploadError 事件触发
    const emittedError = wrapper.emitted('uploadError');
    expect(emittedError).toBeTruthy();
    expect(emittedError?.[0][0]).toEqual(uploadError);
    expect(emittedError?.[0][1]).toBe(mockFile);

    // 验证文档未受污染，未插入破损的 img 节点
    const html = instance.getHTML();
    expect(html).not.toContain('<img');
    expect(html).toBe('<p>故障保护测试</p>');
  });

  it('支持挂载 AtengImageBubbleMenu 并通过对齐与删除指令操控图片', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p><img src="https://example.com/sample.png" alt="示例" /></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    // 挂载独立的 AtengImageBubbleMenu 组件
    const menuWrapper = mount(AtengImageBubbleMenu, {
      props: {
        editor,
      },
    });

    await nextTick();
    expect(menuWrapper.find('.at-editor-image-menu').exists()).toBe(true);

    // 模拟光标选中图片并执行居中对齐
    editor.chain().focus().setTextAlign('center').run();
    await nextTick();

    const html = instance.getHTML();
    expect(html).toContain('text-align: center');

    menuWrapper.unmount();
  });

  it('支持挂载 AtengLinkBubbleMenu 并响应编辑与取消超链接', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p><a href="https://example.com">外部链接</a></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const linkMenuWrapper = mount(AtengLinkBubbleMenu, {
      props: {
        editor,
      },
    });

    await nextTick();
    expect(linkMenuWrapper.find('.at-editor-link-menu').exists()).toBe(true);

    // 验证在光标折叠在链接文字内部（未高亮选中文本）时，点击移除超链接成功剥除 <a> 标签
    editor.commands.setTextSelection(2);
    expect(editor.state.selection.from).toBe(editor.state.selection.to);
    const unlinkBtn = linkMenuWrapper.find('button[aria-label="移除超链接"]');
    expect(unlinkBtn.exists()).toBe(true);
    await unlinkBtn.trigger('click');
    await nextTick();

    const html = instance.getHTML();
    expect(html).not.toContain('<a href');
    expect(html).toContain('外部链接');

    linkMenuWrapper.unmount();
  });

  it('验证 AtengEditor 的 #image-menu 与 #link-menu 插槽支持 100% UI 定制反转', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue:
          '<p><img src="https://example.com/slot.png" /><a href="https://test.com">测试</a></p>',
      },
      slots: {
        'image-menu': () => h('div', { class: 'custom-image-menu-slot' }, '自定义图片菜单插槽'),
        'link-menu': () => h('div', { class: 'custom-link-menu-slot' }, '自定义链接菜单插槽'),
      },
    });

    await nextTick();
    expect(wrapper.find('.custom-image-menu-slot').exists()).toBe(true);
    expect(wrapper.find('.custom-link-menu-slot').exists()).toBe(true);
  });
});

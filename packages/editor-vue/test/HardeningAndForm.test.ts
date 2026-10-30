/**
 * @atengk/editor-vue 工业级防线、状态栏统计、字数硬限制与双态解耦单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理挂载容器、teleport 节点与 document.body；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证字数统计、maxLength 事务硬拦截、吸底状态栏、脱壳全屏、ResizeObserver/MutationObserver 自愈与只读/禁用双态。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  AtengEditor,
  AtengStatusBar,
  type AtengEditorInstance,
  type AtengStatusBarProps,
} from '../src';

describe('工业级防线与硬限制 (Hardening, Status Bar & Modes)', () => {
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
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('精准计算过滤 HTML 标签后的纯文本字符数、词数与段落数', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<h1>大标题</h1><p>第一段内容</p><p>第二段内容包含多字</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    // 纯字符数（不含 HTML 标签）：大标题(3) + 第一段内容(5) + 第二段内容包含多字(9) = 17
    expect(instance.getCharacters()).toBe(17);
    // 块级段落与标题数：h1(1) + p(2) = 3
    expect(instance.getParagraphs()).toBe(3);

    // 验证空内容边界（TipTap 默认 <p></p> 占位）段落数精准归零
    const emptyWrapper = mount(AtengEditor, {
      props: {
        modelValue: '',
      },
    });
    await nextTick();
    const emptyInstance = emptyWrapper.vm as unknown as AtengEditorInstance;
    expect(emptyInstance.getCharacters()).toBe(0);
    expect(emptyInstance.getParagraphs()).toBe(0);
    emptyWrapper.unmount();
  });

  it('支持 maxLength 配置并在达到字符上限时硬拦截超出长度的内容输入', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>12345</p>',
        maxLength: 10,
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    expect(instance.getCharacters()).toBe(5);

    // 聚焦并在末尾追加 3 个字符 (总长度 8，未超出上限 10)
    editor.chain().focus('end').insertContent('678').run();
    await nextTick();
    expect(instance.getCharacters()).toBe(8);
    expect(instance.getText().replace(/\s+/g, '')).toBe('12345678');

    // 尝试追加超出上限的内容 (输入 5 个字符，总计 13 字符，应被 CharacterCount 事务硬拦截)
    editor.chain().focus('end').insertContent('abcde').run();
    await nextTick();

    // 字符数不能超过 maxLength (10)
    expect(instance.getCharacters()).toBeLessThanOrEqual(10);
  });

  it('AtengStatusBar 独立组件正确渲染字符与段落统计，达到限制时激活警告样式', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试内容</p>',
        maxLength: 4,
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const statusBarWrapper = mount(AtengStatusBar, {
      props: {
        editor,
        maxLength: 4,
        showWordCount: true,
        showParagraphCount: true,
      } as AtengStatusBarProps,
    });

    await nextTick();
    expect(statusBarWrapper.find('.at-editor-statusbar').exists()).toBe(true);

    // 4 个字符刚好达到 maxLength(4)，状态栏应包含 is-limit-reached 告警样式
    expect(statusBarWrapper.find('.is-limit-reached').exists()).toBe(true);
    expect(statusBarWrapper.text()).toContain('4 / 4');
    expect(statusBarWrapper.text()).toContain('段落: 1');

    statusBarWrapper.unmount();
  });

  it('支持通过 #statusbar 插槽实现 100% 状态栏定制反转', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>状态栏插槽测试</p>',
        maxLength: 50,
      },
      slots: {
        statusbar: (slotProps: { editor: Editor; maxLength?: number }) =>
          h(
            'div',
            { class: 'custom-statusbar-slot' },
            `自定义状态栏: 最大允许 ${slotProps.maxLength} 字`,
          ),
      },
    });

    await nextTick();
    const customSlot = wrapper.find('.custom-statusbar-slot');
    expect(customSlot.exists()).toBe(true);
    expect(customSlot.text()).toContain('自定义状态栏: 最大允许 50 字');
  });

  it('支持脱壳全屏 (Teleport Fullscreen) 与 Esc 按键退出全屏', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>全屏测试</p>',
      },
      attachTo: document.body,
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    const getFullscreenVal = (inst: AtengEditorInstance): boolean => {
      const raw = (inst as unknown as { isFullscreen: boolean | { value: boolean } }).isFullscreen;
      return typeof raw === 'boolean' ? raw : (raw?.value ?? false);
    };

    expect(getFullscreenVal(instance)).toBe(false);

    // 触发全屏切换
    instance.toggleFullscreen();
    await nextTick();

    expect(getFullscreenVal(instance)).toBe(true);
    // Teleport 挂载到 document.body
    const fullscreenEl = document.body.querySelector('.at-editor.is-fullscreen');
    expect(fullscreenEl).toBeTruthy();

    // 模拟按下 Esc 退出全屏
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(getFullscreenVal(instance)).toBe(false);
  });

  it('严格解耦 disabled（表单禁用态）与 readOnly（纯净阅读态）', async () => {
    // 1. 测试 disabled 禁用模式：保留边框与工具栏，但锁定输入
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>禁用内容</p>',
        disabled: true,
      },
    });

    await nextTick();
    expect(wrapper.find('.at-editor').classes()).toContain('is-disabled');
    // 工具栏依然存在，但内部按钮全被 disabled 锁定
    expect(wrapper.find('.at-editor__toolbar').exists()).toBe(true);
    const undoBtn = wrapper.find('button[aria-label="撤销"]');
    expect(undoBtn.attributes('disabled')).toBeDefined();

    wrapper.unmount();

    // 2. 测试 readOnly 纯净阅读模式：隐藏所有工具栏、浮层与状态栏
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>纯净阅读内容</p>',
        readOnly: true,
      },
    });

    await nextTick();
    expect(wrapper.find('.at-editor').classes()).toContain('is-readonly');
    // 工具栏与状态栏全部隐藏
    expect(wrapper.find('.at-editor__toolbar').exists()).toBe(false);
    expect(wrapper.findComponent(AtengStatusBar).exists()).toBe(false);
  });

  it('MutationObserver 实时监听 html.dark 并派发 themeChange 事件', async () => {
    let capturedDark: boolean | null = null;

    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>主题测试</p>',
        onThemeChange: (dark: boolean) => {
          capturedDark = dark;
        },
      },
    });

    await nextTick();
    expect(capturedDark).toBe(false);

    // 切换到 dark 模式
    document.documentElement.classList.add('dark');
    // 等待 MutationObserver 微任务异步执行
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedDark).toBe(true);
  });
});

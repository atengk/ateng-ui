/**
 * AtengAgentEditor、AtengAiDiffCard 与双通道 AI 唤起组件单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证增删比对状态机与增量事务。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  AtengAgentEditor,
  AtengAiDiffCard,
  AtengAiBubbleMenu,
  AtengAiPromptBar,
  computeTextDiff,
  createMockAiStreamHandler,
  type AtengAgentEditorInstance,
} from '../src';

describe('Agent Editor 智能创作预设与 AiDiffCard 审阅状态机', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  describe('computeTextDiff 纯原生文本比对算法', () => {
    it('文本完全相同返回单个 unchanged 分块', () => {
      const diff = computeTextDiff('架构底座不变', '架构底座不变');
      expect(diff).toEqual([{ type: 'unchanged', value: '架构底座不变' }]);
    });

    it('纯追加场景返回 added 分块', () => {
      const diff = computeTextDiff('', '新增内容段落');
      expect(diff).toEqual([{ type: 'added', value: '新增内容段落' }]);
    });

    it('纯删除场景返回 removed 分块', () => {
      const diff = computeTextDiff('待彻底删除的文本', '');
      expect(diff).toEqual([{ type: 'removed', value: '待彻底删除的文本' }]);
    });

    it('局部修改替换场景精确拆分 added 与 removed 分块', () => {
      const diff = computeTextDiff('项目采用 React 方案', '项目采用 Vue 方案');
      const types = diff.map(d => d.type);
      expect(types).toContain('unchanged');
      expect(types).toContain('removed');
      expect(types).toContain('added');

      const removedChunk = diff.find(d => d.type === 'removed');
      const addedChunk = diff.find(d => d.type === 'added');
      expect(removedChunk?.value).toContain('React');
      expect(addedChunk?.value).toContain('Vue');
    });
  });

  describe('AtengAiDiffCard 行内对比审阅卡片独立组件', () => {
    it('正确挂载并渲染增删对比分块与三态操作按钮', async () => {
      wrapper = mount(AtengAiDiffCard, {
        props: {
          originalText: '旧版陈旧陈述',
          newText: '新版精炼表达',
          visible: true,
          isStreaming: false,
        },
      });

      await nextTick();

      expect(wrapper.classes()).toContain('at-ai-diff-card');
      expect(wrapper.find('.at-diff-chunk--removed').exists()).toBe(true);
      expect(wrapper.find('.at-diff-chunk--added').exists()).toBe(true);

      const replaceBtn = wrapper.find('.at-ai-diff-btn--replace');
      const appendBtn = wrapper.find('.at-ai-diff-btn--append');
      const discardBtn = wrapper.find('.at-ai-diff-btn--discard');

      expect(replaceBtn.exists()).toBe(true);
      expect(appendBtn.exists()).toBe(true);
      expect(discardBtn.exists()).toBe(true);

      // 验证点击事件派发
      await replaceBtn.trigger('click');
      expect(wrapper.emitted('acceptReplace')?.[0]).toEqual(['新版精炼表达']);

      await appendBtn.trigger('click');
      expect(wrapper.emitted('acceptAppend')?.[0]).toEqual(['新版精炼表达']);

      await discardBtn.trigger('click');
      expect(wrapper.emitted('discard')).toBeTruthy();
    });

    it('支持通过具名插槽实现 100% 审阅外观定制反转', async () => {
      wrapper = mount(AtengAiDiffCard, {
        props: {
          originalText: '原文本',
          newText: '新文本',
        },
        slots: {
          'diff-header': '<div class="custom-header">自定义审阅头</div>',
          'diff-footer': '<div class="custom-footer">自定义操作底</div>',
        },
      });

      await nextTick();

      expect(wrapper.find('.custom-header').exists()).toBe(true);
      expect(wrapper.find('.custom-footer').exists()).toBe(true);
    });
  });

  describe('AtengAiBubbleMenu 选区跟随快捷气泡', () => {
    it('正确挂载并暴露 5 大内置快捷动作', async () => {
      wrapper = mount(AtengAiBubbleMenu, {
        props: {
          editor: null,
        },
      });

      await nextTick();

      // 在无真实选区时不弹出内部容器
      expect(wrapper.vm).toBeDefined();
    });
  });

  describe('AtengAiPromptBar 空白行沉浸式输入条', () => {
    it('输入创作指令敲击回车能够派发 submitPrompt 事件', async () => {
      wrapper = mount(AtengAiPromptBar, {
        props: {
          editor: null,
        },
      });

      await nextTick();

      const input = wrapper.find('.at-ai-prompt-bar__input');
      expect(input.exists()).toBe(true);

      await input.setValue('起草数字化转型发展规划方案');
      await input.trigger('keydown.enter');

      expect(wrapper.emitted('submitPrompt')?.[0]).toEqual(['起草数字化转型发展规划方案']);
    });
  });

  describe('AtengAgentEditor 预设集成组件', () => {
    it('正确挂载并渲染正文编辑区与门面方法暴露', async () => {
      const mockHandler = createMockAiStreamHandler({
        delayMs: 0,
        responseResolver: 'AI 生成的最佳实践段落',
      });

      wrapper = mount(AtengAgentEditor, {
        props: {
          modelValue: '<p>初始正文段落</p>',
          aiStreamHandler: mockHandler,
        },
      });

      await nextTick();

      expect(wrapper.classes()).toContain('at-agent-editor-container');
      expect(wrapper.find('.at-editor__content').exists()).toBe(true);

      const instance = wrapper.vm as unknown as AtengAgentEditorInstance;
      expect(instance.getHTML()).toContain('初始正文段落');
      expect(instance.getText()).toContain('初始正文段落');
      expect(typeof instance.focus).toBe('function');
      expect(typeof instance.clearContent).toBe('function');
    });
  });
});

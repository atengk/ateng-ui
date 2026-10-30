/**
 * AI 智能体通信 SPI、离线打字机仿真器与 Decoration 光标扩展单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，断言无头通信协议与打字机状态机。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import {
  createMockAiStreamHandler,
  defaultMockAiStreamHandler,
  AiStreamingExtension,
  aiStreamingPluginKey,
  useAiStream,
  type AiStreamPayload,
} from '../src';

describe('AI 智能体无头 SPI 与离线打字机体系 (Agent AI Stream & Typing Cursor)', () => {
  let activeEditor: Editor | null = null;
  let activeScope: EffectScope | null = null;

  afterEach(() => {
    if (activeEditor) {
      activeEditor.destroy();
      activeEditor = null;
    }
    if (activeScope) {
      activeScope.stop();
      activeScope = null;
    }
    document.body.innerHTML = '';
  });

  describe('createMockAiStreamHandler 纯前端离线仿真器', () => {
    it('正确按字符流式吐出预设文本，单测 delayMs: 0 极速秒级完成', async () => {
      const handler = createMockAiStreamHandler({
        delayMs: 0,
        responseResolver: '测试离线打字机文本',
      });

      const payload: AiStreamPayload = {
        prompt: '帮我润色一段文字',
      };

      const stream = handler(payload);
      expect(Symbol.asyncIterator in stream).toBe(true);

      let accumulated = '';
      for await (const chunk of stream as AsyncIterable<string>) {
        accumulated += chunk;
      }

      expect(accumulated).toBe('测试离线打字机文本');
    });

    it('根据 action 自动派发富文本领域语义化 mock 文本', async () => {
      const handler = createMockAiStreamHandler({ delayMs: 0 });

      const polishPayload: AiStreamPayload = {
        prompt: '优化行文',
        selection: '待优化语句',
        action: 'polish',
      };
      const expandPayload: AiStreamPayload = {
        prompt: '扩写方案',
        action: 'expand',
      };

      let polishText = '';
      for await (const chunk of handler(polishPayload) as AsyncIterable<string>) {
        polishText += chunk;
      }
      expect(polishText).toContain('【智能润色建议】');
      expect(polishText).toContain('待优化语句');

      let expandText = '';
      for await (const chunk of handler(expandPayload) as AsyncIterable<string>) {
        expandText += chunk;
      }
      expect(expandText).toContain('【智能扩写结果】');
    });

    it('严格响应 AbortSignal 并即时中断异步迭代，抛出 AbortError', async () => {
      const controller = new AbortController();
      const handler = createMockAiStreamHandler({
        delayMs: 15,
        responseResolver: '这是一个很长的测试文本用来验证中断',
      });

      const payload: AiStreamPayload = {
        prompt: '测试中断',
        signal: controller.signal,
      };

      const stream = handler(payload) as AsyncIterable<string>;
      let receivedCount = 0;

      await expect(async () => {
        for await (const chunk of stream) {
          receivedCount += chunk.length;
          if (receivedCount >= 2) {
            controller.abort();
          }
        }
      }).rejects.toThrow('This operation was aborted');

      expect(receivedCount).toBeGreaterThanOrEqual(2);
      expect(receivedCount).toBeLessThan(16);
    });

    it('支持注入 simulateError 模拟异常并正常抛出', async () => {
      const handler = createMockAiStreamHandler({
        simulateError: true,
        errorMessage: '模型网关繁忙，请稍后重试',
      });

      expect(() => {
        handler({ prompt: '测试异常' });
      }).toThrow('模型网关繁忙，请稍后重试');
    });

    it('默认导出 defaultMockAiStreamHandler 实例且可用', async () => {
      expect(typeof defaultMockAiStreamHandler).toBe('function');
    });
  });

  describe('AiStreamingExtension 与 ProseMirror Decoration 渲染', () => {
    it('调用 startAiStreaming 能够成功激活状态并在视图层渲染打字机闪烁光标', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>前序段落内容</p>',
      });

      const pluginStateBefore = aiStreamingPluginKey.getState(activeEditor.state);
      expect(pluginStateBefore?.active).toBe(false);

      // 启动打字机流式生成态
      activeEditor.commands.startAiStreaming();

      const pluginStateAfter = aiStreamingPluginKey.getState(activeEditor.state);
      expect(pluginStateAfter?.active).toBe(true);

      // 断言 DOM 中被插入了打字机光标 Widget
      const cursorDom = container.querySelector('.at-editor-ai-cursor');
      expect(cursorDom).not.toBeNull();
      expect(cursorDom?.textContent).toContain('▎');
    });

    it('调用 updateAiStreamingText 能够动态同步流式累积文本至 Decoration', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>起始正文</p>',
      });

      activeEditor.commands.startAiStreaming();
      activeEditor.commands.updateAiStreamingText('正在流式吐字...');

      const pluginState = aiStreamingPluginKey.getState(activeEditor.state);
      expect(pluginState?.text).toBe('正在流式吐字...');

      const streamingDom = container.querySelector('.at-editor-ai-streaming');
      expect(streamingDom).not.toBeNull();
      expect(streamingDom?.textContent).toContain('正在流式吐字...');
    });

    it('cancelAiStreaming 确定性清理所有 Decoration，原文档内容保持不变', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>未受污染的原始文档</p>',
      });

      activeEditor.commands.startAiStreaming();
      activeEditor.commands.updateAiStreamingText('待取消的临时文本');

      expect(container.querySelector('.at-editor-ai-streaming')).not.toBeNull();

      // 取消流式态
      activeEditor.commands.cancelAiStreaming();

      const pluginState = aiStreamingPluginKey.getState(activeEditor.state);
      expect(pluginState?.active).toBe(false);
      expect(container.querySelector('.at-editor-ai-streaming')).toBeNull();
      expect(activeEditor.getText()).toBe('未受污染的原始文档');
    });

    it('finishAiStreaming({ applyText: true }) 在单次事务中原子合入文档树，保全历史栈', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p></p>',
      });

      activeEditor.commands.startAiStreaming({ from: 1, to: 1 });
      activeEditor.commands.updateAiStreamingText('AI 生成并采纳的正式段落');

      activeEditor.commands.finishAiStreaming({ applyText: true });

      const pluginState = aiStreamingPluginKey.getState(activeEditor.state);
      expect(pluginState?.active).toBe(false);
      expect(container.querySelector('.at-editor-ai-streaming')).toBeNull();
      expect(activeEditor.getText()).toContain('AI 生成并采纳的正式段落');
    });
  });

  describe('useAiStream 无头响应式状态机 Hook', () => {
    it('驱动 Mock 仿真器流式打字并响应式维护 isStreaming 与 streamingText', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>起点</p>',
      });

      activeScope = effectScope();
      let streamState: ReturnType<typeof useAiStream> | null = null;

      activeScope.run(() => {
        streamState = useAiStream({
          editor: activeEditor,
          handler: createMockAiStreamHandler({
            delayMs: 0,
            responseResolver: '响应式全自动打字测试',
          }),
        });
      });

      expect(streamState).not.toBeNull();
      expect(streamState!.isStreaming.value).toBe(false);
      expect(streamState!.streamingText.value).toBe('');

      const promise = streamState!.startStream({
        prompt: '开始测试',
      });

      expect(streamState!.isStreaming.value).toBe(true);

      const result = await promise;
      expect(result).toBe('响应式全自动打字测试');
      expect(streamState!.isStreaming.value).toBe(false);
      expect(streamState!.streamingText.value).toBe('响应式全自动打字测试');
    });

    it('支持调用 stopStream 提前手动中断正在进行中的流式生成', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>起点</p>',
      });

      activeScope = effectScope();
      let streamState: ReturnType<typeof useAiStream> | null = null;

      activeScope.run(() => {
        streamState = useAiStream({
          editor: activeEditor,
          handler: createMockAiStreamHandler({
            delayMs: 25,
            responseResolver: '一段需要稍等才能生成完的长文本内容',
          }),
        });
      });

      const streamPromise = streamState!.startStream({
        prompt: '测试中止',
      });

      await nextTick();
      expect(streamState!.isStreaming.value).toBe(true);

      // 主动调用 stopStream
      streamState!.stopStream();

      await expect(streamPromise).rejects.toThrow(/aborted/i);
      expect(streamState!.isStreaming.value).toBe(false);
    });

    it('作用域销毁时 (onScopeDispose) 确定性触发 abort 令牌', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      activeEditor = new Editor({
        element: container,
        extensions: [StarterKit, AiStreamingExtension],
        content: '<p>起点</p>',
      });

      const scope = effectScope();
      let streamState: ReturnType<typeof useAiStream> | null = null;

      scope.run(() => {
        streamState = useAiStream({
          editor: activeEditor,
          handler: createMockAiStreamHandler({
            delayMs: 30,
            responseResolver: '销毁测试文本',
          }),
        });
      });

      const streamPromise = streamState!.startStream({
        prompt: '挂起任务',
      });

      // 模拟组件销毁卸载
      scope.stop();

      await expect(streamPromise).rejects.toThrow();
      expect(streamState!.isStreaming.value).toBe(false);
    });
  });
});

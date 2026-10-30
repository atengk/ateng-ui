/**
 * @atengk/editor-vue AI 流式通信与打字机状态机无头 Hook (useAiStream)。
 *
 * 遵循 L1 无头响应式层与确定性生命周期防线：
 * 1. 纯 Vue 3.5 响应式驱动，零外部 UI 弹窗强绑定；
 * 2. 自动纳管 AbortController，在组件销毁或调用 stopStream 时 100% 确定性中断；
 * 3. 驱动底层 AiStreamingExtension 的 Decoration 闪烁光标与流式文本渲染；
 * 4. 防御并发重入竞态，确保前序未决流安全终止后再开启新流。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { shallowRef, readonly, isRef, toValue, onScopeDispose } from 'vue';
import type { ShallowRef, MaybeRefOrGetter } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { AiStreamHandler, AiStreamPayload } from '../types';
import { defaultMockAiStreamHandler } from '../utils/ai-mock';

export interface UseAiStreamOptions {
  /**
   * TipTap 原生 Editor 实例引用。
   */
  editor?: MaybeRefOrGetter<Editor | null | undefined>;

  /**
   * AI 流式通信 SPI 处理函数。缺省时自动使用内置纯前端离线仿真器。
   */
  handler?: MaybeRefOrGetter<AiStreamHandler | undefined>;

  /**
   * 是否在流式打字期间自动驱动底层 ProseMirror Decoration 渲染闪烁光标。
   * @default true
   */
  useDecoration?: boolean;

  /**
   * 流式生成正常完成时的回调函数。
   */
  onFinish?: (fullText: string) => void;

  /**
   * 流式生成发生异常或被中断时的回调函数。
   */
  onError?: (error: Error) => void;
}

export interface UseAiStreamReturn {
  /**
   * 当前是否正处于流式生成中。
   */
  isStreaming: Readonly<ShallowRef<boolean>>;

  /**
   * 当前流式累积输出的全部文本。
   */
  streamingText: Readonly<ShallowRef<string>>;

  /**
   * 流式生成过程中捕获的错误对象（成功时为 null）。
   */
  error: Readonly<ShallowRef<Error | null>>;

  /**
   * 触发开启 AI 流式打字生成。
   *
   * @param payload 创作意图载荷入参
   * @returns 最终生成的完整文本 Promise
   */
  startStream: (payload: AiStreamPayload) => Promise<string>;

  /**
   * 主动终止或取消当前未完成的流式任务。
   */
  stopStream: () => void;
}

/**
 * 纯 Vue 3.5 无头 AI 流式通信状态机 Hook。
 */
export function useAiStream(options: UseAiStreamOptions = {}): UseAiStreamReturn {
  const {
    editor: editorOption,
    handler: handlerOption,
    useDecoration = true,
    onFinish,
    onError,
  } = options;

  const isStreaming = shallowRef<boolean>(false);
  const streamingText = shallowRef<string>('');
  const error = shallowRef<Error | null>(null);

  let activeAbortController: AbortController | null = null;

  /**
   * 停止当前流式请求并清理状态。
   */
  const stopStream = (): void => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    isStreaming.value = false;

    // 清理编辑器的 Decoration
    const ed = toValue(editorOption);
    if (ed && useDecoration && ed.commands && 'cancelAiStreaming' in ed.commands) {
      ed.commands.cancelAiStreaming();
    }
  };

  /**
   * 开启流式打字生成。
   */
  const startStream = async (payload: AiStreamPayload): Promise<string> => {
    // 1. 若当前已有活跃流，先优雅终止防竞态
    stopStream();

    error.value = null;
    streamingText.value = '';
    isStreaming.value = true;

    // 2. 初始化中断令牌
    const controller = new AbortController();
    activeAbortController = controller;

    // 若外部传入了 signal，双向联动
    if (payload.signal) {
      payload.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const mergedPayload: AiStreamPayload = {
      ...payload,
      signal: controller.signal,
    };

    // 3. 获取 SPI 处理函数（防御 Vue toValue 对普通函数的无参执行陷阱）与 Editor 实例
    const activeHandler =
      (isRef(handlerOption) ? handlerOption.value : handlerOption) ?? defaultMockAiStreamHandler;
    const ed = toValue(editorOption);

    // 启动 ProseMirror Decoration
    if (ed && useDecoration && ed.commands && 'startAiStreaming' in ed.commands) {
      ed.commands.startAiStreaming();
    }

    let accumulated = '';

    try {
      const streamOrPromise = activeHandler(mergedPayload);
      const stream = await Promise.resolve(streamOrPromise);

      if (!stream) {
        throw new Error('AiStreamHandler 未返回有效的流式数据');
      }

      // 处理 AsyncIterable 协议
      if (typeof stream === 'object' && Symbol.asyncIterator in stream) {
        for await (const chunk of stream) {
          if (controller.signal.aborted) break;

          accumulated += chunk;
          streamingText.value = accumulated;

          // 增量同步更新 Decoration
          if (ed && useDecoration && ed.commands && 'updateAiStreamingText' in ed.commands) {
            ed.commands.updateAiStreamingText(accumulated);
          }
        }
      } else if (stream instanceof ReadableStream) {
        // 处理 Web ReadableStream 协议
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk =
            typeof value === 'string' ? value : decoder.decode(value, { stream: true });
          accumulated += textChunk;
          streamingText.value = accumulated;

          if (ed && useDecoration && ed.commands && 'updateAiStreamingText' in ed.commands) {
            ed.commands.updateAiStreamingText(accumulated);
          }
        }
      }

      if (controller.signal.aborted) {
        const abortErr = new Error('AI stream was aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      isStreaming.value = false;
      activeAbortController = null;

      if (onFinish) {
        onFinish(accumulated);
      }

      return accumulated;
    } catch (err) {
      const typedErr = err instanceof Error ? err : new Error(String(err));
      error.value = typedErr;
      isStreaming.value = false;
      activeAbortController = null;

      if (onError && typedErr.name !== 'AbortError') {
        onError(typedErr);
      }

      throw typedErr;
    }
  };

  // 4. 确定性生命周期清理：销毁时无条件中断悬挂请求
  onScopeDispose(() => {
    stopStream();
  });

  return {
    isStreaming: readonly(isStreaming),
    streamingText: readonly(streamingText),
    error: readonly(error),
    startStream,
    stopStream,
  };
}

/**
 * @atengk/editor-vue 纯前端离线打字机仿真器 (Mock SPI)。
 *
 * 遵循 L2 专用扩展层与测试自洽三项铁律：
 * 1. 100% 运行于纯前端与 Node 内存环境，零外部物理网络调用；
 * 2. 模拟逐字/逐词流式增量发射，支持精确配置打字延迟（delayMs）；
 * 3. 严格监听并响应 AbortSignal，支持随生命周期或用户决策即时中断；
 * 4. 内置异常注入开关，用于健壮性与对抗性测试守护。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { AiStreamHandler, AiStreamPayload, MockAiStreamHandlerOptions } from '../types';

/**
 * 根据 payload 的意图动作动态生成有意义的默认模拟响应内容。
 */
function getDefaultMockResponse(payload: AiStreamPayload): string {
  if (payload.action === 'polish') {
    const base = payload.selection || payload.prompt || '原文本内容';
    return `【智能润色建议】：针对“${base.slice(0, 30)}”进行了精炼优化，句意更加通顺严谨，符合企业级正式行文规范。`;
  }
  if (payload.action === 'expand') {
    return '【智能扩写结果】：基于现有核心论点，进一步补充了实施背景、技术指标、验收准则及分阶段推进计划等关键细节。';
  }
  if (payload.action === 'shorten') {
    return '【精炼提要】：本文核心阐述了纯前端解耦架构与确定性离线守护体系。';
  }
  if (payload.action === 'translate') {
    const targetLang = payload.targetLanguage || 'English';
    return `[Translated to ${targetLang}]: Enterprise-grade headless architecture and zero-bloat editor presets.`;
  }
  if (payload.action === 'summarize') {
    return '1. 洋葱拓扑分层；2. 纯前端通信 SPI 解耦；3. 离线全自洽打字机单测守护。';
  }
  return `【AI 生成内容】：针对“${payload.prompt || '创作指令'}”，我们推荐采用 L2 专用扩展层纯无头设计，确保向后兼容与极致性能。`;
}

/**
 * 创建纯前端打字机离线仿真器 SPI 处理函数。
 *
 * @param options 仿真器配置选项
 * @returns 符合 AiStreamHandler SPI 契约的流式生成函数
 */
export function createMockAiStreamHandler(
  options: MockAiStreamHandlerOptions = {},
): AiStreamHandler {
  const {
    delayMs = 30,
    responseResolver,
    simulateError = false,
    errorMessage = 'AI 流式生成被模拟中断',
  } = options;

  return (payload: AiStreamPayload = { prompt: '' }): AsyncIterable<string> => {
    // 立即检查外部取消信号
    if (payload?.signal?.aborted) {
      const abortError = new Error('This operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }

    if (simulateError) {
      throw new Error(errorMessage);
    }

    const fullResponse =
      typeof responseResolver === 'function'
        ? responseResolver(payload)
        : typeof responseResolver === 'string'
          ? responseResolver
          : getDefaultMockResponse(payload);

    return {
      [Symbol.asyncIterator]: async function* () {
        const characters = Array.from(fullResponse);

        for (const char of characters) {
          // 检查迭代过程中的中途取消信号
          if (payload.signal?.aborted) {
            const abortError = new Error('This operation was aborted');
            abortError.name = 'AbortError';
            throw abortError;
          }

          if (delayMs > 0) {
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => {
                if (payload.signal?.aborted) {
                  const abortErr = new Error('This operation was aborted');
                  abortErr.name = 'AbortError';
                  reject(abortErr);
                } else {
                  resolve();
                }
              }, delayMs);

              // 注册 abort 监听以便在等待时立即中断
              if (payload.signal) {
                const onAbort = () => {
                  clearTimeout(timer);
                  payload.signal?.removeEventListener('abort', onAbort);
                  const abortErr = new Error('This operation was aborted');
                  abortErr.name = 'AbortError';
                  reject(abortErr);
                };
                payload.signal.addEventListener('abort', onAbort, { once: true });
              }
            });
          }

          yield char;
        }
      },
    };
  };
}

/**
 * 默认纯前端离线打字机仿真器实例（30ms/字渐进式吐字）。
 */
export const defaultMockAiStreamHandler: AiStreamHandler = createMockAiStreamHandler({
  delayMs: 30,
});

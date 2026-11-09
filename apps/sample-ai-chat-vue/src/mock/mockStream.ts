/**
 * @atengk/ai-chat-vue 1:1 展厅全真离线流式模拟器。
 *
 * 零真实外网调用、零 API Key 依赖，模拟真实大模型打字机分块流。
 *
 * @author Ateng
 * @since 2026-11-09
 */

/**
 * 模拟大模型流式输出文本分块。
 *
 * @param prompt 用户提问提示词
 * @param onChunk 接收到新文本块的回调
 * @param signal 外部取消中断信号
 */
export async function simulateAiStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const chunks: string[] = [
    '收到您的提问：“',
    prompt,
    '”。\n\n',
    '作为 @atengk/ai-chat-vue 企业级基础设施套件，我已通过纯原生双模流式管道与您建立全双工长连接。\n',
    '本会话运行于离线端到端自验沙箱中，具备以下核心能力：\n',
    '1. 响应式无头状态机与生命周期受管清理；\n',
    '2. 原生 CSS 变量与微样式隔离（零 Element Plus 物理硬依赖）；\n',
    '3. 实时打字机增量累加与平滑视口锚定；\n',
    '4. 支持主动中止 (Abort) 与随时原位清空。\n\n',
    '请随时在输入框中体验更多提问与交互！',
  ];

  for (const chunk of chunks) {
    if (signal.aborted) {
      break;
    }
    // 模拟网络分块间隔延迟 (30ms ~ 60ms)
    await new Promise(resolve => setTimeout(resolve, 40));
    if (signal.aborted) {
      break;
    }
    onChunk(chunk);
  }
}

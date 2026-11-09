/**
 * @atengk/ai-chat-vue 1:1 展厅全真离线流式模拟器。
 *
 * 零真实外网调用、零 API Key 依赖，模拟真实大模型打字机分块流与 DeepSeek R1 深度思考链。
 *
 * @author Ateng
 * @since 2026-11-09
 */

/**
 * 模拟大模型流式输出文本分块（包含思考链与正式正文）。
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
  const isReasoningPrompt =
    prompt.includes('思考') ||
    prompt.includes('Reasoning') ||
    prompt.includes('DeepSeek') ||
    prompt.includes('R1') ||
    prompt.includes('为什么');

  let chunks: string[] = [];

  if (isReasoningPrompt) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 收到用户关于深度逻辑的探询：“',
      prompt,
      '”；\n',
      '2. 启动系统级架构模型推理引擎，正在检索架构决策记录（ADR-0009 与 ADR-0043）...\n',
      '3. 分析四层洋葱拓扑结构：L0(纯原生TS底座) -> L1(无头响应式层) -> L2(专业扩展层) -> L3(UI表现层)；\n',
      '4. 校验单向依赖约束：L2 严禁反向依赖 L3，零 Element Plus 依赖；\n',
      '5. 梳理完毕，组织清晰地道的技术结论。\n',
      '</th',
      'ink>\n\n',
      '### 深度分析答复\n\n',
      '针对您关注的问题：“**',
      prompt,
      '**”，核心推演结论如下：\n\n',
      '1. **架构纯净性**：@atengk/ai-chat-vue 作为 L2 专业扩展层，严格遵循四层洋葱拓扑，仅依赖 L0 底座与 L1 无头状态机，通过纯原生 CSS 变量与具名插槽反转解耦具体 UI 库；\n',
      '2. **流式多路解复用**：内置的 `ReasoningDemuxer` 有限状态机支持在数据到达瞬间流式拆解 `<think>` 标签，正文输出时自动完成思考折叠并记录耗时；\n',
      '3. **企业级韧性**：全链路支持 AbortSignal 即时中断、销毁清理与断点重试。\n\n',
      '以上思考过程已为您自动折叠归档，随时可点击上方思考栏展开回溯！',
    ];
  } else {
    chunks = [
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
  }

  for (const chunk of chunks) {
    if (signal.aborted) {
      break;
    }
    // 模拟网络分块间隔延迟 (30ms ~ 50ms)
    await new Promise(resolve => setTimeout(resolve, 35));
    if (signal.aborted) {
      break;
    }
    onChunk(chunk);
  }
}

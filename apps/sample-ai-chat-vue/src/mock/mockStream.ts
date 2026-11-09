/**
 * @atengk/ai-chat-vue 1:1 展厅全真离线流式模拟器。
 *
 * 零真实外网调用、零 API Key 依赖，模拟真实大模型打字机分块流与 DeepSeek R1 深度思考链、
 * Markdown/KaTeX 数学公式、多语言代码块与 Mermaid 架构图。
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
  const isComplexSample =
    prompt.includes('综合') ||
    prompt.includes('数学') ||
    prompt.includes('代码') ||
    prompt.includes('架构') ||
    prompt.includes('Mermaid') ||
    prompt.includes('KaTeX');

  const isReasoningPrompt =
    !isComplexSample &&
    (prompt.includes('思考') ||
      prompt.includes('Reasoning') ||
      prompt.includes('DeepSeek') ||
      prompt.includes('R1') ||
      prompt.includes('为什么'));

  let chunks: string[] = [];

  if (isComplexSample) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 收到全场景综合用例评估请求：“',
      prompt,
      '”；\n',
      '2. 正在提取数学物理模型、拓扑数据与多语言示例代码；\n',
      '3. 生成 GFM 表格对比四层拓扑指标；\n',
      '4. 构建 Mermaid 领域渲染流程 DAG 图。\n',
      '</th',
      'ink>\n\n',
      '# 高保真渲染体系综合全景演示\n\n',
      '为您展示 `@atengk/ai-chat-vue` 工业级 Markdown、KaTeX 数学排版与 Mermaid 动态渲染能力：\n\n',
      '### 一、KaTeX 数学公式与货币符号\n\n',
      '在狭义相对论中，质能等价关系式由爱因斯坦提出为 $E=mc^2$。在正态分布中，高斯积分等于：\n\n',
      '$$\n',
      '\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n',
      '$$\n\n',
      '同时系统具备货币符号防误伤保护：本组件单价 $99，促销折扣 $20，结账不会被错误解析为公式。\n\n',
      '### 二、四层洋葱拓扑指标 (GFM 表格)\n\n',
      '| 模块层级 | 代表子包 | 核心技术栈 | 依赖约束 |\n',
      '| :--- | :--- | :--- | :--- |\n',
      '| **L0 底座** | `@atengk/core` | 纯原生 TypeScript | 零 Vue 依赖，跨框架中立 |\n',
      '| **L1 无头** | `@atengk/vue` | Vue 3.5 Composables | 零 UI 组件依赖 |\n',
      '| **L2 扩展** | `@atengk/ai-chat-vue` | markdown-it / katex / prismjs | 零 Element Plus 依赖 |\n',
      '| **L3 表现** | `@atengk/element-plus` | Element Plus 2.x | 宿主业务表现与布局 |\n\n',
      '### 三、多语言代码块与一键复制\n\n',
      '```typescript\n',
      'import { useAiChat, ReasoningDemuxer } from "@atengk/ai-chat-vue";\n\n',
      '// 1. 初始化无头 AI 会话状态机\n',
      'const { messages, sendMessage, isStreaming } = useAiChat({\n',
      '  streamUrl: "/api/v1/chat/completions",\n',
      '});\n\n',
      '// 2. 发起对话请求\n',
      'await sendMessage("请生成一份系统拓扑架构图");\n',
      '```\n\n',
      '### 四、Mermaid 架构流程图 (动态按需懒加载)\n\n',
      '```mermaid\n',
      'flowchart TD\n',
      '  A[终端用户提问] -->|SSE 长连接| B[ReasoningDemuxer 解复用]\n',
      '  B -->|思考过程流| C[AtengReasoningBlock 计时折叠]\n',
      '  B -->|正文 Markdown 流| D[AtengMarkdownRenderer]\n',
      '  D -->|普通文本与 KaTeX| E[DOM 增量渲染]\n',
      '  D -->|代码块| F[AtengCodeBlock + Prism]\n',
      '  D -->|Mermaid 语法| G[动态 import 懒加载]\n',
      '```\n\n',
      '以上所有内容均在离线沙箱中端到端生成，零外部网络与真实 API Key 依赖！',
    ];
  } else if (isReasoningPrompt) {
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
      '3. **高保真渲染流水线**：集成 `markdown-it`、`katex`、`prismjs` 与动态按需 `mermaid`，流式吐出无损排版；\n',
      '4. **企业级韧性**：全链路支持 AbortSignal 即时中断、销毁清理与断点重试。\n\n',
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
      '4. 完整 KaTeX 数学公式、Prism 语法高亮与 Mermaid 流程图；\n',
      '5. 支持主动中止 (Abort) 与随时原位清空。\n\n',
      '请随时在输入框中体验更多提问与交互！',
    ];
  }

  for (const chunk of chunks) {
    if (signal.aborted) {
      break;
    }
    // 模拟网络分块间隔延迟 (20ms ~ 35ms)
    await new Promise(resolve => setTimeout(resolve, 25));
    if (signal.aborted) {
      break;
    }
    onChunk(chunk);
  }
}

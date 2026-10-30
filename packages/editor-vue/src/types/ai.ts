/**
 * @atengk/editor-vue AI 智能体协同创作协议与 SPI 契约定义。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层与纯前端解耦原则：
 * 严禁在组件库内硬编码任何后端模型提供商、私有端点或 Token 凭据。
 *
 * @author Ateng
 * @since 2026-10-30
 */

/**
 * AI 智能体请求入参载荷契约。
 */
export interface AiStreamPayload {
  /**
   * 用户输入的提示词或具体创作指令（如“润色为更正式的公文语调”）。
   */
  prompt: string;

  /**
   * 当前划选的选区文本内容（若从空白行呼起则可为空）。
   */
  selection?: string;

  /**
   * 编辑器当前全文或前后文参考上下文。
   */
  context?: string;

  /**
   * 快捷意图操作动作标识。
   */
  action?:
    | 'polish' // 润色与语病纠错
    | 'expand' // 扩写丰富细节
    | 'shorten' // 缩短精炼摘要
    | 'summarize' // 提炼核心要点
    | 'translate' // 多语言转译
    | 'continue' // 依据上文续写
    | string;

  /**
   * 目标翻译语言（当 action === 'translate' 时有效，如 'en'、'zh-CN'）。
   */
  targetLanguage?: string;

  /**
   * 支持随组件销毁、失焦或用户主动取消确定性中断请求流的 AbortSignal。
   */
  signal?: AbortSignal;
}

/**
 * 解耦后端提供商的纯前端流式通信协议 SPI 处理函数契约。
 *
 * 业务系统可自由对接 SSE、WebSocket、自研大模型网关或公网 SDK。
 * 允许返回 AsyncIterable<string> 或 ReadableStream<string>（或它们的 Promise 包装）。
 */
export type AiStreamHandler = (
  payload: AiStreamPayload,
) =>
  | AsyncIterable<string>
  | ReadableStream<string>
  | Promise<AsyncIterable<string> | ReadableStream<string>>;

/**
 * 纯前端打字机延迟仿真器配置选项。
 */
export interface MockAiStreamHandlerOptions {
  /**
   * 每个分块/字符的打字发射间隔延迟毫秒数。
   * 单测中建议设置为 0 以实现秒级离线自洽断言，演示展厅中建议 25~35ms 模拟真实感。
   * @default 30
   */
  delayMs?: number;

  /**
   * 静态固定响应文本或根据 payload 动态返回响应文本的处理函数。
   */
  responseResolver?: string | ((payload: AiStreamPayload) => string);

  /**
   * 是否模拟网络或模型异常，用于对抗性极限边界与容错测试。
   * @default false
   */
  simulateError?: boolean;

  /**
   * 模拟异常时抛出的错误文案。
   * @default 'AI 流式生成被模拟中断'
   */
  errorMessage?: string;
}

/**
 * 行内流式打字 ProseMirror 装饰层状态接口。
 */
export interface AiStreamingState {
  /**
   * 当前是否处于流式打字中。
   */
  active: boolean;

  /**
   * 流式生成区域在文档中的起始绝对坐标。
   */
  from: number;

  /**
   * 流式生成区域在文档中的结束绝对坐标。
   */
  to: number;

  /**
   * 当前已累积生成的文本内容。
   */
  text: string;

  /**
   * 原始被替换的选区文本（用于行内 Diff 对比审阅）。
   */
  originalText?: string;
}

/**
 * 打字机流式扩展配置选项。
 */
export interface AiStreamingOptions {
  /**
   * 打字机光标闪烁类名，默认 'at-editor-ai-cursor'。
   */
  cursorClass?: string;

  /**
   * 流式生成高亮呼吸动效类名，默认 'at-editor-ai-streaming'。
   */
  streamingClass?: string;
}

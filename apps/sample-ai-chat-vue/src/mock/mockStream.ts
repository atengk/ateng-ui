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
  const isArtifactGen =
    prompt.includes('生成 Vue') || prompt.includes('v1 产物') || prompt.includes('生成用户卡片');
  const isArtifactUpgrade =
    prompt.includes('迭代升级') || prompt.includes('v2 版本') || prompt.includes('带状态与动效');

  const isWeatherQuery =
    !isArtifactGen && !isArtifactUpgrade && (prompt.includes('天气') || prompt.includes('weather'));
  const isWeatherResult =
    !isArtifactGen &&
    !isArtifactUpgrade &&
    (prompt.includes('晴朗') || prompt.includes('22°C') || prompt.includes('空气质量良好'));
  const isDangerQuery =
    !isArtifactGen &&
    !isArtifactUpgrade &&
    (prompt.includes('删库') ||
      prompt.includes('删表') ||
      prompt.includes('drop_table') ||
      prompt.includes('删除生产'));
  const isDangerApprovedResult =
    !isArtifactGen &&
    !isArtifactUpgrade &&
    (prompt.includes('droppedTable') || prompt.includes('sys_operation_log'));
  const isDangerRejectedResult =
    !isArtifactGen && !isArtifactUpgrade && (prompt.includes('已拒绝') || prompt.includes('拒批'));

  const isComplexSample =
    !isArtifactGen &&
    !isArtifactUpgrade &&
    !isWeatherQuery &&
    !isWeatherResult &&
    !isDangerQuery &&
    !isDangerApprovedResult &&
    !isDangerRejectedResult &&
    (prompt.includes('综合') ||
      prompt.includes('数学') ||
      prompt.includes('代码') ||
      prompt.includes('架构') ||
      prompt.includes('Mermaid') ||
      prompt.includes('KaTeX'));

  const isReasoningPrompt =
    !isComplexSample &&
    !isArtifactGen &&
    !isArtifactUpgrade &&
    !isWeatherQuery &&
    !isWeatherResult &&
    !isDangerQuery &&
    !isDangerApprovedResult &&
    !isDangerRejectedResult &&
    (prompt.includes('思考') ||
      prompt.includes('Reasoning') ||
      prompt.includes('DeepSeek') ||
      prompt.includes('R1') ||
      prompt.includes('为什么'));

  let chunks: string[] = [];

  if (isArtifactGen) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 收到独立交付物组件开发请求：“',
      prompt,
      '”；\n',
      '2. 正在提取 Vue 3.5 SFC 结构，设计纯原生基础用户卡片；\n',
      '3. 标记产物 identifier="user-card-comp", language="vue"；\n',
      '4. 触发流式 <artifact> 标签并吐出 v1 初版源码。\n',
      '</th',
      'ink>\n\n',
      '为您设计并交付了 **用户资料卡片组件 (v1 初版)**：\n',
      '<artifact identifier="user-card-comp" title="用户资料卡片组件" language="vue">\n',
      '<template>\n',
      '  <div class="user-card">\n',
      '    <div class="user-card__header">\n',
      '      <h3>{{ user.name }}</h3>\n',
      '      <span class="badge">{{ user.role }}</span>\n',
      '    </div>\n',
      '    <p class="user-card__bio">{{ user.bio }}</p>\n',
      '    <button class="btn" @click="handleFollow">关注作者</button>\n',
      '  </div>\n',
      '</template>\n\n',
      '<script setup lang="ts">\n',
      'interface User {\n',
      '  name: string;\n',
      '  role: string;\n',
      '  bio: string;\n',
      '}\n\n',
      'defineProps<{\n',
      '  user: User;\n',
      '}>();\n\n',
      'const emit = defineEmits<{\n',
      '  (e: "follow"): void;\n',
      '}>();\n\n',
      'const handleFollow = (): void => {\n',
      '  emit("follow");\n',
      '};\n',
      '</',
      'script>\n',
      '</artifact>\n\n',
      '已为您在右侧【Artifacts 产物工作台】加载该组件，您可以点击卡片展开侧边栏查看源码与复制！',
    ];
  } else if (isArtifactUpgrade) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 识别到对已存在产物 identifier="user-card-comp" 的迭代需求；\n',
      '2. 在保留前置版本不可变历史的前提下，演进至版本 v2；\n',
      '3. 增加头像渲染、已关注状态响应式切换、私信按钮与 scoped 样式；\n',
      '4. 触发 <artifact> 标签闭合并生成新切片。\n',
      '</th',
      'ink>\n\n',
      '已对用户卡片组件进行了 **v2 增强版迭代升级**：\n',
      '<artifact identifier="user-card-comp" title="用户资料卡片组件 (v2 交互增强版)" language="vue">\n',
      '<template>\n',
      '  <div class="user-card" :class="{ \'user-card--followed\': isFollowed }">\n',
      '    <div class="user-card__header">\n',
      '      <img :src="user.avatar || \'/default-avatar.png\'" class="avatar" alt="avatar" />\n',
      '      <div class="meta">\n',
      '        <h3>{{ user.name }}</h3>\n',
      '        <span class="badge">{{ user.role }}</span>\n',
      '      </div>\n',
      '    </div>\n',
      '    <p class="user-card__bio">{{ user.bio }}</p>\n',
      '    <div class="user-card__actions">\n',
      '      <button class="btn btn--primary" @click="toggleFollow">\n',
      '        {{ isFollowed ? "已关注 ✓" : "+ 关注作者" }}\n',
      '      </button>\n',
      '      <button class="btn btn--outline" @click="sendDirectMessage">\n',
      '        发送私信\n',
      '      </button>\n',
      '    </div>\n',
      '  </div>\n',
      '</template>\n\n',
      '<script setup lang="ts">\n',
      'import { ref } from "vue";\n\n',
      'interface User {\n',
      '  name: string;\n',
      '  role: string;\n',
      '  bio: string;\n',
      '  avatar?: string;\n',
      '}\n\n',
      'defineProps<{\n',
      '  user: User;\n',
      '}>();\n\n',
      'const isFollowed = ref(false);\n\n',
      'const toggleFollow = (): void => {\n',
      '  isFollowed.value = !isFollowed.value;\n',
      '};\n\n',
      'const sendDirectMessage = (): void => {\n',
      '  alert("私信窗口已唤起");\n',
      '};\n',
      '</',
      'script>\n\n',
      '<style scoped>\n',
      '.user-card { padding: 18px; border-radius: 8px; border: 1px solid var(--at-chat-border, #e2e8f0); }\n',
      '.user-card--followed { background-color: rgba(16, 185, 129, 0.05); border-color: #10b981; }\n',
      '.user-card__header { display: flex; align-items: center; gap: 12px; }\n',
      '.avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }\n',
      '.user-card__actions { display: flex; gap: 8px; margin-top: 14px; }\n',
      '.btn { padding: 6px 14px; font-size: 13px; border-radius: 6px; cursor: pointer; }\n',
      '.btn--primary { background: #2563eb; color: #fff; border: none; }\n',
      '.btn--outline { background: transparent; border: 1px solid #cbd5e1; }\n',
      '</style>\n',
      '</artifact>\n\n',
      'v2 版本已推送到产物工作台！您可以点击上方卡片，并在侧边栏顶栏切换到 **【比对 (Diff)】** 视图，通过 Monaco Editor 高保真查看前后两个版本的代码增删差异！',
    ];
  } else if (isWeatherQuery) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 识别到实时气象数据查询意图：“',
      prompt,
      '”；\n',
      '2. 匹配到已注册系统工具：get_weather（模式：auto 自动执行）；\n',
      '3. 构造工具调用入参：{ city: "北京" }；\n',
      '4. 触发流式工具调用标签。<tool_call>；\n',
      '</th',
      'ink>\n\n',
      '正在连接国家气象卫星监测站获取实时观测数据...\n',
      '<tool_call>{"callId":"call_weather_bj","name":"get_weather","arguments":{"city":"北京"}}</tool_call>',
    ];
  } else if (isWeatherResult) {
    chunks = [
      '根据气象数据中心接口实时回传的观测指标：\n\n',
      '- **监测城市**：北京市海淀区观测站\n',
      '- **当前天气**：晴天 ☀️\n',
      '- **环境温度**：22°C (人体体感舒适)\n',
      '- **相对湿度**：45%\n',
      '- **空气质量指数**：AQI 28 (优)\n\n',
      '今日风和日丽，微风拂面，非常适合各类户外团队活动与休闲漫步！',
    ];
  } else if (isDangerQuery) {
    chunks = [
      '<th',
      'ink>\n',
      '1. 捕获到高风险数据库结构变更指令：“',
      prompt,
      '”；\n',
      '2. 匹配到工具：drop_database_table，该工具标注为 mode: confirm（需人工审批）；\n',
      '3. 触发人机协同审批 (HITL) 安全挂起机制，流式生成在途冻结，等待用户显式授权。\n',
      '</th',
      'ink>\n\n',
      '⚠️ 检测到该指令涉及生产数据库高危表删除操作，已触发系统级人机协同审批 (HITL) 安全防线：\n',
      '<tool_call>{"callId":"call_danger_drop","name":"drop_database_table","arguments":{"database":"production_db","table":"sys_operation_log","reason":"定期归档冷备释放物理磁盘空间"}}</tool_call>',
    ];
  } else if (isDangerApprovedResult) {
    chunks = [
      '### ✅ 人机审批授权执行成功\n\n',
      '已收到操作人员的【允许执行】指令，安全沙箱已完成执行并生成审计流水：\n',
      '- **目标表**：`production_db.sys_operation_log`\n',
      '- **执行状态**：`DROPPED & ARCHIVED` (已安全封存至冷备归档库)\n',
      '- **释放空间**：`120,530` 行记录 (约 45.8 MB 物理磁盘空间)\n',
      '- **审计流水号**：`SEC-AUDIT-20261109-8891`\n\n',
      '本次操作已纳入特权审计链条，生产服务运行平稳正常。',
    ];
  } else if (isDangerRejectedResult) {
    chunks = [
      '### 🛑 操作已被人工驳回安全拦截\n\n',
      '已收到您的【拒绝执行】指令，高危操作已在执行前被立即原位熔断：\n',
      '> **拒批说明**：',
      prompt.replace('[用户已拒绝执行工具 drop_database_table]: ', ''),
      '\n\n',
      '生产数据库未发生任何结构或数据变更，审计系统已记录本次驳回事件以供安全复盘。',
    ];
  } else if (isComplexSample) {
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

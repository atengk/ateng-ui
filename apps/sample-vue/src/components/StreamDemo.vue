<script setup lang="ts">
/**
 * sample-vue SSE 大模型打字机流式响应自验卡片组件。
 *
 * 演示 useStream 在大模型打字机输出、SSE 事件增量解析、
 * 手动中止 (abort)、清空重置 (reset) 与异常拦截的端到端交互。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { useStream } from '@atengk/vue';
import { createStreamClient } from '@atengk/core';

// 1. 模拟交互状态与日志
const logs = ref<string[]>([]);
const promptInput = ref<string>('请简要介绍 @atengk/vue 的设计理念与架构优势');
const simulateError = ref<boolean>(false);
const tokenDelay = ref<number>(45);
const receivedEventCount = ref<number>(0);

const addLog = (msg: string): void => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 25) {
    logs.value.pop();
  }
};

// 2. 预设提示词快捷选项
const promptPresets = [
  '请简要介绍 @atengk/vue 的设计理念与架构优势',
  'Vue 3.5 响应式解构入参对于通用 Composables 有何重大意义？',
  '请为企业级前端工程编写一段关于防御性健壮性的技术宣言',
];

const setPrompt = (text: string): void => {
  promptInput.value = text;
};

// 3. 构建自洽纯前端 Mock 流式服务端实现（模拟后端 SSE 文本打字机流）
const sampleKnowledgeBase: Record<string, string[]> = {
  default: [
    '【Ateng UI 智能生成】\n\n',
    '@atengk/vue 坚持',
    '“纯无头响应式基础设施（Headless Layer）”',
    '的设计定位。\n\n',
    '它具备以下核心工业级优势：\n',
    '1. 零 UI 侵入：绝对不直接调用或绑定任何 UI 弹窗组件；\n',
    '2. 强类型单向流：核心状态机全部只读导出（readonly），杜绝就地突变；\n',
    '3. 双重时序竞态防御：结合物理 AbortSignal 级联与单调序列号过滤；\n',
    '4. 确定性生命周期回收：挂载于 tryOnScopeDispose，组件注销时自动断连；\n',
    '5. 原生优先与极致轻量：零 lodash/moment 等臃肿全量依赖。\n\n',
    '已全面就绪赋能现代企业级高并发系统研发！',
  ],
};

const customFetch: typeof fetch = async (_input, init): Promise<Response> => {
  const signal = init?.signal;
  const encoder = new TextEncoder();
  const tokens = sampleKnowledgeBase.default;
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (signal?.aborted) {
        controller.close();
        return;
      }

      if (index < tokens.length) {
        // 模拟第 4 块切片遭遇网络中断异常
        if (simulateError.value && index === 4) {
          controller.error(new Error('503 Service Unavailable (模拟上游大模型节点超载熔断)'));
          return;
        }

        await new Promise(resolve => setTimeout(resolve, tokenDelay.value));
        if (signal?.aborted) {
          controller.close();
          return;
        }

        const chunkText = `event: delta\nid: evt-${index + 1}\ndata: ${tokens[index]}\n\n`;
        controller.enqueue(encoder.encode(chunkText));
        index++;
      } else {
        // 发送标准完成标识
        controller.enqueue(encoder.encode('event: done\ndata: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
};

const mockClient = createStreamClient({
  fetch: customFetch as unknown as typeof fetch,
});

// 4. 实例化 useStream 状态机
const stream = useStream('/api/v1/chat/stream', {
  streamClient: mockClient,
  method: 'POST',
  body: () => ({ prompt: promptInput.value }),
  onMessage: (data, evt) => {
    receivedEventCount.value += 1;
    if (receivedEventCount.value % 3 === 0) {
      addLog(`[接收数据帧] 事件: ${evt?.event ?? 'message'}, 数据分块长度: ${data.length}`);
    }
  },
  onDone: fullText => {
    addLog(`[流式生成完毕] 完整内容已成功传输，总字数: ${fullText.length}`);
  },
  onError: err => {
    addLog(`[流式异常拦截] 捕获到传输中断异常: ${String(err)}`);
  },
});

// 5. 用户交互动作
const handleStart = async (): Promise<void> => {
  if (stream.isStreaming.value) return;
  receivedEventCount.value = 0;
  addLog(`[发起请求] 正在建立 SSE 增量连接，提示词: "${promptInput.value.slice(0, 20)}..."`);
  try {
    await stream.start();
  } catch {
    // 异常已由 onError 监听
  }
};

const handleAbort = (): void => {
  stream.abort();
  addLog('[主动操作] 用户点击手动中断，流传输已终止');
};

const handleReset = (): void => {
  stream.reset();
  receivedEventCount.value = 0;
  addLog('[主动操作] 状态机已完全重置');
};
</script>

<template>
  <section class="card">
    <h2>10. SSE 大模型打字机流式响应自验 (useStream)</h2>
    <p class="desc">
      响应式桥接 StreamClient，提供纯 Web 原生 ReadableStream 与 SSE
      规范解析、大模型打字机文本增量累积、手动中断与生命周期确定性断连。
    </p>

    <!-- 状态指示条 -->
    <div class="meta-bar">
      <div class="meta-item">
        <span>流式连接状态:</span>
        <span :class="['status-tag', stream.isStreaming.value ? 'status-active' : 'status-idle']">
          {{ stream.isStreaming.value ? 'Streaming (传输中)' : 'Idle (就绪)' }}
        </span>
      </div>
      <div class="meta-item">
        <span>累积字数:</span>
        <strong>{{ stream.text.value.length }} 字</strong>
      </div>
      <div class="meta-item">
        <span>已收事件帧:</span>
        <strong>{{ receivedEventCount }} 帧</strong>
      </div>
      <div class="meta-item">
        <span>最新事件 ID:</span>
        <code>{{ stream.event.value?.id || '无' }}</code>
      </div>
    </div>

    <!-- 快捷提示词选择 -->
    <div class="prompt-suggestions">
      <button
        v-for="(preset, idx) in promptPresets"
        :key="idx"
        class="pill-btn"
        :disabled="stream.isStreaming.value"
        @click="setPrompt(preset)"
      >
        {{ preset }}
      </button>
    </div>

    <!-- 提示词输入框与操作栏 -->
    <div class="prompt-bar">
      <input
        v-model="promptInput"
        type="text"
        class="prompt-input"
        placeholder="请输入需要大模型流式解答的问题..."
        :disabled="stream.isStreaming.value"
      />
      <div class="actions-row">
        <button
          class="btn"
          :disabled="stream.isStreaming.value || !promptInput.trim()"
          @click="handleStart"
        >
          {{ stream.isStreaming.value ? '正在生成打字中...' : '开始流式生成 (start)' }}
        </button>

        <button class="btn btn-danger" :disabled="!stream.isStreaming.value" @click="handleAbort">
          手动中断 (abort)
        </button>

        <button class="btn btn-secondary" @click="handleReset">清空 (reset)</button>
      </div>
    </div>

    <!-- 模拟参数配置 -->
    <div class="config-row">
      <div class="config-item">
        <label>
          <input v-model="simulateError" type="checkbox" :disabled="stream.isStreaming.value" />
          模拟在途中途故障 (测试 onError 容错拦截)
        </label>
      </div>
      <div class="config-item">
        <label>打字速率:</label>
        <select v-model.number="tokenDelay" :disabled="stream.isStreaming.value">
          <option :value="20">20ms/token (极速)</option>
          <option :value="45">45ms/token (舒适打字机)</option>
          <option :value="100">100ms/token (慢速分析)</option>
        </select>
      </div>
    </div>

    <!-- 打字机动态渲染窗口 -->
    <div class="typewriter-window">
      <div class="terminal-header">
        <span class="terminal-dot dot-red"></span>
        <span class="terminal-dot dot-yellow"></span>
        <span class="terminal-dot dot-green"></span>
        <span class="terminal-title">ateng-llm-stream-terminal</span>
      </div>
      <div class="typewriter-content">
        <span v-if="!stream.text.value && !stream.isStreaming.value" style="color: #64748b">
          [终端就绪] 点击上方“开始流式生成”按钮，即可体验大模型打字机增量响应效果...
        </span>
        <span v-else>{{ stream.text.value }}</span>
        <span v-if="stream.isStreaming.value" class="cursor-blink"></span>
      </div>
    </div>

    <!-- 实时交互日志 -->
    <div class="log-box">
      <div v-if="logs.length === 0" class="log-item">
        [就绪] 暂无操作日志，请点击“开始流式生成 (start)”...
      </div>
      <div v-for="(log, idx) in logs" :key="idx" class="log-item">
        {{ log }}
      </div>
    </div>
  </section>
</template>

<style scoped src="./stream-demo.css"></style>

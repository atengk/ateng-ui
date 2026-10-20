<script setup lang="ts">
/**
 * sample-vue 异步时序竞态双重防御自验卡片组件。
 *
 * 演示 useLatest 对高频搜索与快慢请求并发时序倒挂的“物理中断 + 逻辑过期”双重协同防御机制。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { onUnmounted, ref } from 'vue';
import { useLatest } from '@atengk/vue';

// 日志跟踪条目
interface LogEntry {
  id: number;
  time: string;
  type: 'info' | 'abort' | 'success';
  text: string;
}

const logs = ref<LogEntry[]>([]);
let logId = 0;

const addLog = (type: LogEntry['type'], text: string) => {
  logs.value.unshift({
    id: ++logId,
    time: new Date().toLocaleTimeString(),
    type,
    text,
  });
  if (logs.value.length > 20) {
    logs.value.pop();
  }
};

// 模拟支持 AbortSignal 的网络请求函数
const simulateAsyncFetch = async (
  signal: AbortSignal,
  title: string,
  delay: number,
): Promise<string> => {
  addLog('info', `[发起请求] ${title} (预计耗时: ${delay}ms)`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      addLog('success', `[请求就绪] ${title} 物理耗时结束`);
      resolve(`[生效数据] ${title} (延时: ${delay}ms, 时间: ${new Date().toLocaleTimeString()})`);
    }, delay);

    // 监听物理切断事件
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      addLog('abort', `[物理中断] ${title} 接收到 AbortSignal (${signal.reason})`);
      reject(new Error(`Aborted: ${signal.reason}`));
    });
  });
};

// 实例化 useLatest 状态机
const latestMachine = useLatest<string, [string, number]>(simulateAsyncFetch, {
  initialData: '暂无数据 (等待触发)',
  onSuccess: (data, [title]) => {
    addLog('success', `[UI采纳回调] onSuccess 触发: ${title}`);
  },
  onError: (err, [title]) => {
    addLog('abort', `[UI错误回调] onError 捕获: ${title} -> ${String(err)}`);
  },
});

// 并发对抗演示：先发慢请求 (600ms)，紧随其后发快请求 (150ms)
let battleTimer: ReturnType<typeof setTimeout> | null = null;

const runConcurrencyBattle = async () => {
  addLog('info', '=== 启动时序倒挂并发对抗 ===');
  // 1. 发起先发慢请求 A (600ms)
  latestMachine.run('请求A_慢速 (先发 600ms)', 600);

  // 2. 延迟 80ms 后发起后发快请求 B (150ms)
  if (battleTimer !== null) {
    clearTimeout(battleTimer);
  }
  battleTimer = setTimeout(() => {
    latestMachine.run('请求B_快速 (后发 150ms)', 150);
    battleTimer = null;
  }, 80);
};

onUnmounted(() => {
  if (battleTimer !== null) {
    clearTimeout(battleTimer);
    battleTimer = null;
  }
});

// 快速输入搜索演示
const searchInput = ref('');
const handleInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  searchInput.value = val;
  if (!val.trim()) return;
  // 模拟搜索延时随机波动 (100ms ~ 500ms)
  const randomDelay = Math.floor(Math.random() * 400) + 100;
  latestMachine.run(`搜索词 "${val}"`, randomDelay);
};

// 手动取消
const handleCancel = () => {
  latestMachine.cancel();
  addLog('abort', '[手动取消] cancel() 已触发，在途请求物理切断且未决回调废弃');
};

// 本地乐观更新
const handleOptimisticMutate = () => {
  latestMachine.mutate(prev => `[本地乐观修改] ${prev} @ ${new Date().toLocaleTimeString()}`);
  addLog('info', '[本地更新] mutate() 触发成功');
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
};
</script>

<template>
  <section class="card">
    <h2>5. 异步时序竞态双重防御自验 (useLatest)</h2>
    <p class="desc">
      采用“物理中断 +
      逻辑过期”双重协同防御机制：后发快请求到达时，即使先发慢请求稍后完成，其结果也将被确定性丢弃，彻底根绝数据时序倒挂脏写。
    </p>

    <!-- 操作与控制栏 -->
    <div class="demo-grid">
      <div class="control-box">
        <h3>快慢请求并发对抗 (时序倒挂防御)</h3>
        <p class="desc">
          先发慢请求 A (600ms)，80ms 后触发快请求 B (150ms)。观察慢请求被中断与作废过程：
        </p>
        <button
          class="btn btn-primary"
          :disabled="latestMachine.loading.value"
          @click="runConcurrencyBattle"
        >
          并发触发：慢请求(600ms) + 快请求(150ms)
        </button>
      </div>

      <div class="control-box">
        <h3>连续输入高频搜索模拟</h3>
        <p class="desc">快速连续敲击键盘输入，旧请求专属 AbortSignal 将即时切断：</p>
        <input
          :value="searchInput"
          type="text"
          placeholder="快速连续打字测试时序防御..."
          class="input-sm"
          @input="handleInput"
        />
        <div class="btn-group">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!latestMachine.loading.value"
            @click="handleCancel"
          >
            中断在途 (cancel)
          </button>
          <button class="btn btn-secondary btn-sm" @click="handleOptimisticMutate">
            乐观修改 (mutate)
          </button>
        </div>
      </div>
    </div>

    <!-- 状态指示条 -->
    <div class="meta-bar">
      <div>
        状态机:
        <span
          :class="['status-tag', latestMachine.loading.value ? 'status-active' : 'status-idle']"
        >
          {{ latestMachine.loading.value ? 'Loading (执行中...)' : 'Idle (就绪)' }}
        </span>
      </div>
      <div>
        异常状态:
        <span>{{ latestMachine.error.value ? String(latestMachine.error.value) : '无异常' }}</span>
      </div>
    </div>

    <!-- 渲染结果面板 -->
    <div class="result-panel">
      <span class="label">当前 UI 响应式采纳数据 (只读 data):</span>
      <div class="result-view">{{ latestMachine.data.value }}</div>
    </div>

    <!-- 实时双重防御事件诊断日志 -->
    <div class="log-panel">
      <div class="btn-group" style="justify-content: space-between; align-items: center">
        <span class="label">双重防御实时事件流日志 (Abort 捕获 & 序列号时序流转):</span>
        <button class="btn btn-secondary btn-xs" @click="clearLogs">清空日志</button>
      </div>
      <div class="log-console">
        <div v-for="log in logs" :key="log.id" :class="['log-item', log.type]">
          [{{ log.time }}] {{ log.text }}
        </div>
        <div v-if="logs.length === 0" style="color: #64748b; font-style: italic">
          (暂无事件日志，点击上方按钮触发)
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./latest-demo.css"></style>

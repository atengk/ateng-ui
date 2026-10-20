<script setup lang="ts">
/**
 * sample-vue WebSocket 全双工长连接状态机自验卡片组件。
 *
 * 演示 useWebSocket 在连接就绪状态机、双向心跳保活检测、假死切断、
 * 指数退避自动重连、全双工数据帧收发与组件作用域销毁时确定性资源清理。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { onUnmounted, ref } from 'vue';
import { useWebSocket } from '@atengk/vue';

// 1. 模拟交互状态与日志
const logs = ref<string[]>([]);
const messageInput = ref<string>('你好，WebSocket 服务端！');
const mockZombieHeartbeat = ref<boolean>(false);
const broadcastTimer = ref<ReturnType<typeof setInterval> | null>(null);

const addLog = (msg: string): void => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 25) {
    logs.value.pop();
  }
};

// 2. 模拟前端独立自洽 Mock WebSocket 构造工厂
class BrowserMockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState: number = BrowserMockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  static activeInstance: BrowserMockWebSocket | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    BrowserMockWebSocket.activeInstance = this;

    // 模拟握手耗时 120ms 后成功连接
    setTimeout(() => {
      if (this.readyState === BrowserMockWebSocket.CONNECTING) {
        this.readyState = BrowserMockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 120);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== BrowserMockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    // 模拟服务端心跳 ping/pong 应答
    if (data === 'ping' || data === JSON.stringify('ping')) {
      if (mockZombieHeartbeat.value) {
        // 故意静默不回 pong，模拟服务端假死
        return;
      }
      setTimeout(() => {
        if (this.readyState === BrowserMockWebSocket.OPEN) {
          this.onmessage?.({ data: 'pong' } as MessageEvent);
        }
      }, 50);
      return;
    }

    // 模拟业务数据回显 (Echo)
    setTimeout(() => {
      if (this.readyState === BrowserMockWebSocket.OPEN) {
        let parsed: unknown = data;
        try {
          if (typeof data === 'string') {
            parsed = JSON.parse(data);
          }
        } catch {
          // 原样字符串
        }
        const reply = JSON.stringify({
          type: 'echo_reply',
          echoData: parsed,
          serverTimestamp: new Date().toLocaleTimeString(),
        });
        this.onmessage?.({ data: reply } as MessageEvent);
      }
    }, 100);
  }

  close(code = 1000, reason = ''): void {
    this.readyState = BrowserMockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = BrowserMockWebSocket.CLOSED;
      this.onclose?.({ code, reason, wasClean: true } as CloseEvent);
    }, 50);
  }

  simulateCrash(): void {
    this.readyState = BrowserMockWebSocket.CLOSED;
    this.onerror?.(new Event('error'));
    this.onclose?.({
      code: 1006,
      reason: 'Abnormal Closure (模拟网络闪断)',
      wasClean: false,
    } as CloseEvent);
  }
}

// 3. 实例化 useWebSocket 状态机
interface ServerPayload {
  type: string;
  echoData?: unknown;
  serverTimestamp?: string;
  broadcastNotice?: string;
}

const ws = useWebSocket<ServerPayload>('ws://localhost:8080/ws/dashboard', {
  autoConnect: true,
  webSocketFactory: (url, protocols) =>
    new BrowserMockWebSocket(url, protocols) as unknown as WebSocket,
  heartbeat: {
    enabled: true,
    interval: 8000, // 为便于快速演示，缩短心跳周期为 8 秒
    timeout: 3000, // 3 秒无 pong 判定假死断开
    pingMessage: 'ping',
    pongMessage: 'pong',
  },
  reconnect: {
    enabled: true,
    baseDelay: 800,
    maxRetries: 5,
  },
  bufferWhileConnecting: true,
  onConnected: () => {
    addLog('[连接建立] WebSocket 长连接握手成功 (status: OPEN)');
    startBroadcastSimulation();
  },
  onDisconnected: evt => {
    addLog(`[连接关闭] 关闭码: ${evt.code}, 原因: ${evt.reason || '正常关闭'}`);
    stopBroadcastSimulation();
  },
  onError: () => {
    addLog('[连接异常] 捕获到底层 WebSocket 网络错误事件');
  },
  onMessage: payload => {
    addLog(`[收到推送] 类型: ${payload?.type ?? 'unknown'}, 数据: ${JSON.stringify(payload)}`);
  },
  onReconnect: (attempt, delay) => {
    addLog(`[触发重连] 正在发起第 ${attempt} 次退避自动重连，延迟: ${delay}ms...`);
  },
});

// 4. 定时模拟服务端主动广播推送
const startBroadcastSimulation = (): void => {
  stopBroadcastSimulation();
  broadcastTimer.value = setInterval(() => {
    if (
      ws.isOpen.value &&
      BrowserMockWebSocket.activeInstance?.readyState === BrowserMockWebSocket.OPEN
    ) {
      const noticePayload = JSON.stringify({
        type: 'cluster_broadcast',
        broadcastNotice: `在线节点监控正常，负载: ${(Math.random() * 20 + 20).toFixed(1)}%`,
        serverTimestamp: new Date().toLocaleTimeString(),
      });
      BrowserMockWebSocket.activeInstance.onmessage?.({ data: noticePayload } as MessageEvent);
    }
  }, 6000);
};

const stopBroadcastSimulation = (): void => {
  if (broadcastTimer.value) {
    clearInterval(broadcastTimer.value);
    broadcastTimer.value = null;
  }
};

onUnmounted(() => {
  stopBroadcastSimulation();
});

// 5. 用户操作动作
const handleManualOpen = async (): Promise<void> => {
  addLog('[主动操作] 正在发起建立 WebSocket 连接...');
  try {
    await ws.open();
  } catch {
    // 异常已由 onError 监听
  }
};

const handleManualClose = (): void => {
  addLog('[主动操作] 用户点击主动关闭连接');
  ws.close();
};

const handleSend = (): void => {
  if (!messageInput.value.trim()) return;
  addLog(`[发送上行] 发送数据: "${messageInput.value}"`);
  ws.send({ text: messageInput.value, clientTime: Date.now() });
};

const handleSimulateCrash = (): void => {
  addLog('[模拟故障] 模拟底层网络物理异常断开 (触发指数退避自动重连机制)...');
  BrowserMockWebSocket.activeInstance?.simulateCrash();
};
</script>

<template>
  <section class="card">
    <h2>11. WebSocket 全双工长连接心跳状态机自验 (useWebSocket)</h2>
    <p class="desc">
      响应式桥接
      WebSocketClient，提供连接状态机映射（CONNECTING/OPEN/CLOSING/CLOSED）、全双工数据帧收发、应用层双向心跳假死熔断、指数退避自动重连与离线缓冲。
    </p>

    <!-- 状态指示条 -->
    <div class="meta-bar">
      <div class="meta-item">
        <span>连接状态机 (status):</span>
        <span :class="['status-tag', `status-${ws.status.value.toLowerCase()}`]">
          {{ ws.status.value }}
        </span>
      </div>
      <div class="meta-item">
        <span>isOpen:</span>
        <strong>{{ ws.isOpen.value ? 'true (已就绪)' : 'false' }}</strong>
      </div>
      <div class="meta-item">
        <span>isClosed:</span>
        <strong>{{ ws.isClosed.value ? 'true (已断开)' : 'false' }}</strong>
      </div>
      <div class="meta-item">
        <span>当前重连尝试次数:</span>
        <strong>{{ ws.reconnectAttempt.value }} 次</strong>
      </div>
    </div>

    <!-- 模拟参数配置 -->
    <div class="config-row">
      <div class="config-item">
        <label>
          <input v-model="mockZombieHeartbeat" type="checkbox" />
          模拟服务端假死不回 pong (测试心跳超时 3s 自动熔断与重连)
        </label>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="actions-row">
        <button
          class="btn"
          :disabled="ws.isOpen.value || ws.status.value === 'CONNECTING'"
          @click="handleManualOpen"
        >
          连接 (connect / open)
        </button>

        <button class="btn btn-secondary" :disabled="!ws.isOpen.value" @click="handleManualClose">
          主动断开 (close)
        </button>

        <button class="btn btn-danger" :disabled="!ws.isOpen.value" @click="handleSimulateCrash">
          模拟异常断线 (测试指数退避自动重连)
        </button>
      </div>
    </div>

    <!-- 发送上行数据 -->
    <div class="send-bar">
      <input
        v-model="messageInput"
        type="text"
        class="input-box"
        placeholder="输入上行全双工消息..."
        @keyup.enter="handleSend"
      />
      <button class="btn" :disabled="!messageInput.trim()" @click="handleSend">
        {{ ws.isOpen.value ? '发送上行消息' : '离线入队缓冲 (send)' }}
      </button>
    </div>

    <!-- 最新推送数据预览 -->
    <div class="data-preview">
      <div class="preview-title">最近一次接收数据 (只读 data 状态):</div>
      <pre class="json-code">{{
        JSON.stringify(ws.data.value, null, 2) || '(暂未接收到数据帧)'
      }}</pre>
    </div>

    <!-- 实时交互日志 -->
    <div class="log-box">
      <div v-if="logs.length === 0" class="log-item">
        [就绪] WebSocket 自验组件已挂载，正在等待建立长连接...
      </div>
      <div v-for="(log, idx) in logs" :key="idx" class="log-item">
        {{ log }}
      </div>
    </div>
  </section>
</template>

<style scoped src="./websocket-demo.css"></style>

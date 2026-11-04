/**
 * Web 原生流式打字机与全双工 WebSocket 长连接矩阵场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { createWebSocketClient, type WebSocketStatus } from '@atengk/core';
import { sampleStreamClient, mockWebSocketServer } from '../client';

/**
 * 渲染流式与 WebSocket 看板 HTML 模板。
 */
export function renderStreamWsCard(): string {
  return `
    <!-- 卡片 9: AI 流式响应与打字机输出 -->
    <div class="dashboard-card" id="card-stream">
      <div class="card-title">
        <span>9. AI 流式响应门面 (StreamClient)</span>
        <span style="font-size: 12px; color: #0284c7;">原生 fetch & SSE</span>
      </div>
      <p class="card-desc">纯 Web 原生 ReadableStream 与打字机流式消费，零 Axios 依赖，支持即时 AbortSignal 级联中断与断线重连。</p>
      <div class="actions-row">
        <button class="btn btn-primary" id="btn-stream-start">启动打字机输出</button>
        <button class="btn btn-danger" id="btn-stream-abort">中途即刻中断</button>
      </div>
      <div class="log-box" id="log-stream" style="min-height: 100px;">// 点击上方按钮查看 AI 打字机增量输出...</div>
    </div>

    <!-- 卡片 14: WebSocketClient 全双工长连接矩阵 -->
    <div class="dashboard-card full-width" id="card-websocket">
      <div class="card-title">
        <span>14. WebSocket 全双工长连接客户端 (WebSocketClient)</span>
        <span style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
          <span id="ws-status-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; display: inline-block;"></span>
          <strong id="ws-status-text">CLOSED</strong>
        </span>
      </div>
      <p class="card-desc">纯原生全双工通信底座，集成双向心跳保活、Pong 超时假死切断、指数退避自动重连、受控容量离线缓冲队列与强类型主题订阅分发。</p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
        <div><strong>心跳保活:</strong> <span id="ws-heartbeat-status">未启动</span> | 已收到Pong: <span id="ws-pong-count">0</span> 次</div>
        <div><strong>指数退避重连:</strong> 第 <span id="ws-reconnect-attempt">0</span> 次重试 | 延迟: <span id="ws-reconnect-delay">0ms</span></div>
        <div><strong>离线发送缓冲:</strong> <span id="ws-buffer-count">0</span> / 5 条 (FIFO受控)</div>
      </div>

      <div class="input-row" style="margin-top: 10px; gap: 8px; align-items: center;">
        <input class="input-control" id="input-ws-url" placeholder="留空使用内置离线 Mock；可输入真实地址如 ws://localhost:8080/ws 或 wss://echo.websocket.events" style="flex: 1;" />
        <span id="ws-mode-badge" style="display: inline-flex; align-items: center; padding: 6px 12px; font-size: 12px; font-weight: 500; border-radius: 4px; background: #e0e7ff; color: #4338ca; white-space: nowrap;">当前: 离线 Mock</span>
      </div>

      <div class="actions-row" style="flex-wrap: wrap; gap: 8px;">
        <button class="btn btn-primary" id="btn-ws-connect">建立连接</button>
        <button class="btn btn-danger" id="btn-ws-disconnect">主动断开 (close)</button>
        <button class="btn" style="background: #f59e0b; color: white;" id="btn-ws-simulate-disconnect">模拟异常闪断 (1006)</button>
        <button class="btn" style="background: #8b5cf6; color: white;" id="btn-ws-toggle-drop-pong">模拟服务端假死 (停回Pong)</button>
        <button class="btn" style="background: #64748b; color: white;" id="btn-ws-clear-log">清空日志</button>
      </div>

      <div class="input-row" style="flex-wrap: wrap; gap: 8px;">
        <input class="input-control" id="input-ws-chat" placeholder="输入聊天内容..." value="你好，WebSocket！" style="flex: 1; min-width: 200px;" />
        <button class="btn btn-success" id="btn-ws-send-chat">发送主题消息 (chat)</button>
        <button class="btn" style="background: #0ea5e9; color: white;" id="btn-ws-send-quote">订阅实时行情 (quote)</button>
      </div>

      <div class="log-box" id="log-ws" style="height: 180px; overflow-y: auto;">// WebSocket 全双工通信与主题订阅日志流...</div>
    </div>
  `;
}

/**
 * 初始化流式与 WebSocket 场景交互事件。
 */
export function initStreamWsScenario(): void {
  // 1. AI 流式响应与打字机
  const logStream = document.getElementById('log-stream');
  let streamAbortController: AbortController | null = null;

  document.getElementById('btn-stream-start')?.addEventListener('click', async () => {
    if (streamAbortController) {
      streamAbortController.abort();
    }
    streamAbortController = new AbortController();

    if (logStream) {
      logStream.textContent = '[连接建立] 正在接收大模型增量 SSE 数据流...\n\n';
    }

    try {
      await sampleStreamClient.subscribe('/api/llm/stream', {
        signal: streamAbortController.signal,
        onMessage: (data, event) => {
          if (logStream) {
            logStream.textContent += data;
            logStream.scrollTop = logStream.scrollHeight;
            if (event?.id) {
              logStream.title = `最新事件ID: ${event.id}`;
            }
          }
        },
        onDone: () => {
          if (logStream) {
            logStream.textContent += '\n\n[流已正常结束] 打字机接收完成！';
          }
        },
      });
    } catch (err) {
      if (logStream) {
        logStream.textContent += `\n[流式错误] ${String(err)}`;
      }
    }
  });

  document.getElementById('btn-stream-abort')?.addEventListener('click', () => {
    if (streamAbortController) {
      streamAbortController.abort();
      streamAbortController = null;
      if (logStream) {
        logStream.textContent += '\n\n[用户操作] 已通过 AbortSignal 即刻中断流读取与网络连接！';
      }
    }
  });

  // 2. WebSocket 全双工长连接客户端
  const logWs = document.getElementById('log-ws');
  const dotEl = document.getElementById('ws-status-dot');
  const statusTextEl = document.getElementById('ws-status-text');
  const heartbeatStatusEl = document.getElementById('ws-heartbeat-status');
  const pongCountEl = document.getElementById('ws-pong-count');
  const reconnectAttemptEl = document.getElementById('ws-reconnect-attempt');
  const reconnectDelayEl = document.getElementById('ws-reconnect-delay');
  const bufferCountEl = document.getElementById('ws-buffer-count');
  const btnDropPong = document.getElementById('btn-ws-toggle-drop-pong');
  const inputWsUrl = document.getElementById('input-ws-url') as HTMLInputElement | null;
  const wsModeBadge = document.getElementById('ws-mode-badge');
  const inputChat = document.getElementById('input-ws-chat') as HTMLInputElement | null;

  let pongCount = 0;
  let wsClient: ReturnType<typeof createWebSocketClient> | null = null;

  const appendLog = (msg: string) => {
    if (logWs) {
      const time = new Date().toLocaleTimeString();
      logWs.textContent += `\n[${time}] ${msg}`;
      logWs.scrollTop = logWs.scrollHeight;
    }
  };

  const updateModeBadge = () => {
    if (!wsModeBadge) return;
    const rawUrl = inputWsUrl?.value?.trim() || '';
    const isRealUrl = rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://');
    if (isRealUrl) {
      wsModeBadge.textContent = '当前: 真实物理网络';
      wsModeBadge.style.background = '#dcfce7';
      wsModeBadge.style.color = '#15803d';
    } else {
      wsModeBadge.textContent = '当前: 离线 Mock';
      wsModeBadge.style.background = '#e0e7ff';
      wsModeBadge.style.color = '#4338ca';
    }
  };

  inputWsUrl?.addEventListener('input', updateModeBadge);

  const updateStatusUI = (status: WebSocketStatus, code?: number) => {
    if (!dotEl || !statusTextEl) return;
    switch (status) {
      case 'OPEN':
        dotEl.style.backgroundColor = '#10b981';
        statusTextEl.textContent = 'OPEN (已连接)';
        statusTextEl.style.color = '#10b981';
        break;
      case 'CONNECTING':
        dotEl.style.backgroundColor = '#3b82f6';
        statusTextEl.textContent = 'CONNECTING (连接/握手中)';
        statusTextEl.style.color = '#3b82f6';
        break;
      case 'CLOSING':
        dotEl.style.backgroundColor = '#f59e0b';
        statusTextEl.textContent = 'CLOSING (关闭中)';
        statusTextEl.style.color = '#f59e0b';
        break;
      case 'CLOSED':
      default:
        dotEl.style.backgroundColor = '#94a3b8';
        statusTextEl.textContent = code ? `CLOSED (code=${code})` : 'CLOSED (已断开)';
        statusTextEl.style.color = '#64748b';
        break;
    }
  };

  const getOrCreateClient = (): ReturnType<typeof createWebSocketClient> => {
    if (wsClient) {
      return wsClient;
    }

    const rawUrl = inputWsUrl?.value?.trim() || '';
    const isRealUrl = rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://');
    const targetUrl = isRealUrl ? rawUrl : 'ws://mock.ateng.local/ws';
    updateModeBadge();

    wsClient = createWebSocketClient({
      url: targetUrl,
      webSocketFactory: isRealUrl ? undefined : mockWebSocketServer.factory,
      heartbeat: {
        enabled: true,
        interval: 4000,
        timeout: 2000,
      },
      reconnect: {
        enabled: true,
        baseDelay: 1000,
        factor: 1.5,
        maxDelay: 5000,
        maxRetries: 5,
      },
      bufferWhileConnecting: true,
      maxBufferSize: 5,
    });

    wsClient.on('open', () => {
      updateStatusUI('OPEN');
      if (heartbeatStatusEl) heartbeatStatusEl.textContent = '正常保活中 (4s周期)';
      if (reconnectAttemptEl) reconnectAttemptEl.textContent = '0';
      if (reconnectDelayEl) reconnectDelayEl.textContent = '0ms';
      if (bufferCountEl && wsClient) bufferCountEl.textContent = String(wsClient.getBufferSize());
      appendLog(`【连接成功】WebSocket 握手就绪 (${targetUrl})！心跳保活启动，冲刷离线队列`);
    });

    wsClient.on('close', event => {
      updateStatusUI('CLOSED', event.code);
      if (heartbeatStatusEl) heartbeatStatusEl.textContent = '已停止';
      appendLog(`【连接关闭】code=${event.code}, reason=${event.reason || 'none'}`);
    });

    wsClient.on('reconnect', (attempt, delay) => {
      updateStatusUI('CONNECTING');
      if (reconnectAttemptEl) reconnectAttemptEl.textContent = String(attempt);
      if (reconnectDelayEl) reconnectDelayEl.textContent = `${delay}ms`;
      appendLog(`【自动重连】触发第 ${attempt} 次指数退避重连，等待延迟 ${delay}ms...`);
    });

    wsClient.on('message', data => {
      if (data === 'pong') {
        pongCount += 1;
        if (pongCountEl) pongCountEl.textContent = String(pongCount);
        appendLog('【心跳响应】收到对端 Pong 探针应答，连接健康续命');
      } else {
        appendLog(`【接收消息】${typeof data === 'string' ? data : '[二进制数据]'}`);
      }
    });

    wsClient.subscribe<{ user: string; text: string; time?: string }>('chat', payload => {
      appendLog(`【主题:chat】[${payload.user}]: ${payload.text} (${payload.time || ''})`);
    });

    wsClient.subscribe<{ symbol: string; price: number; time?: string }>('quote', payload => {
      appendLog(
        `【主题:quote】${payload.symbol} 最新行情: $${payload.price} (${payload.time || ''})`,
      );
    });

    return wsClient;
  };

  document.getElementById('btn-ws-connect')?.addEventListener('click', () => {
    if (wsClient) {
      appendLog('【重置客户端】销毁旧实例，重新绑定连接...');
      wsClient.destroy();
      wsClient = null;
    }
    const client = getOrCreateClient();
    appendLog('【用户操作】发起建立连接...');
    void client.connect();
  });

  document.getElementById('btn-ws-disconnect')?.addEventListener('click', () => {
    appendLog('【用户操作】主动断开长连接 (close)，永久阻断自动重连...');
    if (wsClient) {
      wsClient.close(1000, '用户主动关闭连接');
      if (bufferCountEl) bufferCountEl.textContent = String(wsClient.getBufferSize());
    }
  });

  document.getElementById('btn-ws-simulate-disconnect')?.addEventListener('click', () => {
    const rawUrl = inputWsUrl?.value?.trim() || '';
    if (rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://')) {
      appendLog('【提示】当前处于真实物理网络模式，模拟闪断仅支持在 Mock 模式下演练。');
      return;
    }
    appendLog('【测试操作】模拟服务端网络异常闪断 (code=1006)...');
    mockWebSocketServer.triggerServerClose(1006, '模拟网关异常重启');
  });

  document.getElementById('btn-ws-toggle-drop-pong')?.addEventListener('click', () => {
    const rawUrl = inputWsUrl?.value?.trim() || '';
    if (rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://')) {
      appendLog('【提示】当前处于真实物理网络模式，假死丢 Pong 模拟仅支持离线 Mock 模式。');
      return;
    }
    const nextDrop = !mockWebSocketServer.isDropPong();
    mockWebSocketServer.setDropPong(nextDrop);
    if (btnDropPong) {
      btnDropPong.textContent = nextDrop ? '恢复正常 Pong 响应' : '模拟服务端假死 (停回Pong)';
      btnDropPong.style.background = nextDrop ? '#ef4444' : '#8b5cf6';
    }
    if (heartbeatStatusEl) {
      heartbeatStatusEl.textContent = nextDrop ? '模拟假死中 (Pong已阻断)' : '正常保活中 (4s周期)';
    }
    appendLog(
      nextDrop
        ? '【测试操作】已阻断服务端 Pong 响应，等待客户端心跳超时判定假死切断...'
        : '【测试操作】已恢复正常 Pong 响应',
    );
  });

  document.getElementById('btn-ws-send-chat')?.addEventListener('click', () => {
    const client = getOrCreateClient();
    const text = inputChat?.value || '测试消息';
    const msg = { type: 'chat', data: { text, time: new Date().toLocaleTimeString() } };
    const ok = client.send(msg);
    if (bufferCountEl) bufferCountEl.textContent = String(client.getBufferSize());
    appendLog(
      ok
        ? `【消息发送】已交付发送或入缓冲: "${text}" (状态: ${client.getStatus()}, 缓冲: ${client.getBufferSize()}/5)`
        : '【发送失败】未就绪且未开启缓冲或队列已满',
    );
  });

  document.getElementById('btn-ws-send-quote')?.addEventListener('click', () => {
    const client = getOrCreateClient();
    const msg = { type: 'quote', data: { symbol: 'ATENG' } };
    const ok = client.send(msg);
    if (bufferCountEl) bufferCountEl.textContent = String(client.getBufferSize());
    appendLog(
      ok
        ? `【订阅行情】发送 quote 行情订阅请求 (状态: ${client.getStatus()})`
        : '【发送失败】未就绪且未开启缓冲',
    );
  });

  document.getElementById('btn-ws-clear-log')?.addEventListener('click', () => {
    if (logWs) logWs.textContent = '// WebSocket 全双工通信与主题订阅日志流...';
  });
}

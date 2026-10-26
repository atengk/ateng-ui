<script setup lang="ts">
/**
 * AuthSecurityDemo: 企业级鉴权双轨注入、Blob-JSON 双态拦截与六步销毁演练面板。
 *
 * 验证：
 * 1. AuthManager 双轨请求头与防盗链 URL Token 注入；
 * 2. ADR-0004 规范之 Blob-JSON 接口报错双态拦截转译为 BusinessException；
 * 3. 确定性销毁六步防线与 GPU 内存确定性回收追踪。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, ref } from 'vue';
import { authManager, type BusinessException } from '@atengk/core';
import {
  AtengVideoPlayer,
  type AtengVideoPlayerInstance,
  type IVideoPlayerEngine,
  TokenInjector,
} from '@atengk/video-player-vue';

// 1. 播放器状态与控制
const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const isMounted = ref(true);
const currentUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const probeStream = ref(true);
const logs = ref<
  Array<{ time: string; type: 'info' | 'warn' | 'error' | 'success'; text: string }>
>([]);

const addLog = (type: 'info' | 'warn' | 'error' | 'success', text: string): void => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, type, text });
  if (logs.value.length > 50) {
    logs.value.pop();
  }
};

// 2. 鉴权状态管理
const inputToken = ref('ateng-sec-token-2026');
const currentToken = ref<string | null>(authManager.getToken());

const headersPreview = computed(() => {
  return TokenInjector.injectHeaders();
});

const urlPreview = computed(() => {
  return TokenInjector.injectUrl(currentUrl.value);
});

const handleLogin = (): void => {
  if (!inputToken.value.trim()) {
    return;
  }
  authManager.setToken(inputToken.value.trim());
  currentToken.value = authManager.getToken();
  addLog('success', `鉴权登录成功，凭据注入生效: ${inputToken.value}`);
};

const handleLogout = (): void => {
  authManager.clearToken();
  currentToken.value = null;
  addLog('warn', '清除本地鉴权令牌，已切换至匿名游客态');
};

// 3. 模拟异常流场景测试
const handleSimulateNormal = (): void => {
  currentUrl.value = 'https://artplayer.org/assets/sample/video.mp4';
  addLog('info', '切换至标准合法点播流 (200 OK)');
};

const handleSimulate401 = (): void => {
  // 使用 data: URI 模拟返回 401 格式的 JSON 响应体
  currentUrl.value =
    'data:application/json;charset=utf-8,' +
    encodeURIComponent(
      JSON.stringify({
        code: 40101,
        msg: '视频点播鉴权令牌已过期失效，请重新换取 Token',
        traceId: 'trace-auth-401-mock',
      }),
    );
  addLog('error', '注入 ADR-0004 异常场景: 401 Unauthorized (JSON 双态异常)');
};

const handleSimulate403 = (): void => {
  currentUrl.value =
    'data:application/json;charset=utf-8,' +
    encodeURIComponent(
      JSON.stringify({
        code: 40303,
        msg: '您所在的用户组未被授予该加密视频频道的点播权限',
        traceId: 'trace-auth-403-mock',
      }),
    );
  addLog('error', '注入 ADR-0004 异常场景: 403 Forbidden (越权访问拦截)');
};

// 4. 六步销毁防线测试
const toggleMount = (): void => {
  if (isMounted.value) {
    addLog(
      'warn',
      '主动触发销毁流程：执行 Abort、解绑 video.src、调用 video.load() 强制回收 GPU 缓冲区',
    );
  } else {
    addLog('info', '重新挂载播放器实例');
  }
  isMounted.value = !isMounted.value;
};

// 5. 事件回调监听
const onPlayerReady = (engine: IVideoPlayerEngine): void => {
  addLog('success', `播放引擎初始化就绪 (时长: ${Math.round(engine.duration)}s)`);
};

const onPlayerError = (err: BusinessException): void => {
  addLog(
    'error',
    `捕获到业务异常拦截: [Code ${err.code}] ${err.msg} (TraceId: ${err.traceId || '无'})`,
  );
};
</script>

<template>
  <div class="auth-security-demo">
    <!-- 左侧：播放器与异常呈现 -->
    <div class="demo-player-col">
      <div class="player-wrapper">
        <AtengVideoPlayer
          v-if="isMounted"
          ref="playerRef"
          :url="currentUrl"
          :probe-stream="probeStream"
          title="企业级鉴权与防线自验"
          poster="https://artplayer.org/assets/sample/poster.jpg"
          @ready="onPlayerReady"
          @error="onPlayerError"
        />
        <div v-else class="unmounted-placeholder">
          <span class="unmounted-icon">🔌</span>
          <p>播放器实例已安全销毁，六步确定性清理完成（显存缓冲已回收）</p>
          <button type="button" class="btn btn--primary" @click="toggleMount">
            重新实例化播放器
          </button>
        </div>
      </div>

      <!-- 流媒体双态异常场景注入器 -->
      <div class="card card--actions">
        <h4 class="card-title">ADR-0004 故障注入与双态拦截演练</h4>
        <p class="card-hint">
          后端鉴权失败或资源被下架时，网关返回 application/json
          报错文本。守卫自动拦截并阻止其投喂给解复用器，避免底层白屏死锁。
        </p>
        <div class="btn-group">
          <button type="button" class="btn btn--success" @click="handleSimulateNormal">
            ✅ 正常视频流 (200 OK)
          </button>
          <button type="button" class="btn btn--warning" @click="handleSimulate401">
            🔒 模拟 401 鉴权失效
          </button>
          <button type="button" class="btn btn--danger" @click="handleSimulate403">
            🚫 模拟 403 权限越权
          </button>
          <button type="button" class="btn" @click="toggleMount">
            {{ isMounted ? '🛑 测试组件快速销毁' : '⚡ 恢复组件挂载' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧：凭据透传状态与审计日志 -->
    <div class="demo-console-col">
      <!-- 鉴权控制台 -->
      <div class="card">
        <h4 class="card-title">企业级凭据双轨注入控制台</h4>
        <div class="auth-form">
          <div class="form-row">
            <input
              v-model="inputToken"
              type="text"
              class="text-input"
              placeholder="输入测试鉴权凭据 Token"
            />
            <button type="button" class="btn btn--primary" @click="handleLogin">设置 Token</button>
            <button type="button" class="btn" @click="handleLogout">清空</button>
          </div>
          <div class="status-indicator">
            <span class="status-dot" :class="currentToken ? 'status-dot--active' : ''"></span>
            <span class="status-text">
              状态：{{ currentToken ? '已注入登录凭据' : '未登录 (匿名模式)' }}
            </span>
          </div>
        </div>

        <!-- 双轨请求头预览 -->
        <div class="code-preview">
          <div class="code-header">
            <span>双轨注入请求头 (Headers)</span>
          </div>
          <pre class="code-block">{{ JSON.stringify(headersPreview, null, 2) }}</pre>
        </div>

        <!-- 防盗链 URL 拼接预览 -->
        <div class="code-preview">
          <div class="code-header">
            <span>防盗链查询参拼接 (URL)</span>
          </div>
          <div class="url-box">{{ urlPreview }}</div>
        </div>
      </div>

      <!-- 审计与销毁防线追踪日志 -->
      <div class="card card--logs">
        <div class="card-title-row">
          <h4 class="card-title">防御机制实时审计日志</h4>
          <button type="button" class="btn btn--sm" @click="logs = []">清屏</button>
        </div>
        <div class="log-stream">
          <div
            v-for="(item, idx) in logs"
            :key="idx"
            class="log-item"
            :class="`log-item--${item.type}`"
          >
            <span class="log-time">{{ item.time }}</span>
            <span class="log-text">{{ item.text }}</span>
          </div>
          <div v-if="logs.length === 0" class="log-empty">
            暂无日志，可操作左侧按钮触发不同防御场景
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-security-demo {
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 20px;
}

@media (max-width: 1024px) {
  .auth-security-demo {
    grid-template-columns: 1fr;
  }
}

.demo-player-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.unmounted-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 12px;
  background-color: #1e293b;
}

.unmounted-icon {
  font-size: 36px;
}

.demo-console-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.card-hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.text-input:focus {
  border-color: #2563eb;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #94a3b8;
}

.status-dot--active {
  background-color: #10b981;
}

.code-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.code-header {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.code-block {
  margin: 0;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  color: #0f172a;
  overflow-x: auto;
}

.url-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 12px;
  color: #2563eb;
  word-break: break-all;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #f1f5f9;
}

.btn--primary {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn--primary:hover {
  background-color: #1d4ed8;
}

.btn--success {
  background-color: #10b981;
  border-color: #10b981;
  color: #fff;
}

.btn--success:hover {
  background-color: #059669;
}

.btn--warning {
  background-color: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
}

.btn--warning:hover {
  background-color: #d97706;
}

.btn--danger {
  background-color: #ef4444;
  border-color: #ef4444;
  color: #fff;
}

.btn--danger:hover {
  background-color: #dc2626;
}

.btn--sm {
  padding: 4px 8px;
  font-size: 12px;
}

.card--logs {
  flex: 1;
  min-height: 240px;
}

.log-stream {
  flex: 1;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: #0f172a;
  border-radius: 6px;
  padding: 10px;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  font-family: monospace;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-item--info .log-text {
  color: #94a3b8;
}

.log-item--success .log-text {
  color: #34d399;
}

.log-item--warn .log-text {
  color: #fbbf24;
}

.log-item--error .log-text {
  color: #f87171;
}

.log-empty {
  color: #64748b;
  font-size: 12px;
  text-align: center;
  padding: 40px 0;
}
</style>

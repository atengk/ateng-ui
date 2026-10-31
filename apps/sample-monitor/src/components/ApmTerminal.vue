<script setup lang="ts">
/**
 * 本地 Mock APM 实时事件接收与 TraceId 全链路回显终端。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref, computed } from 'vue';
import {
  ElCard,
  ElTag,
  ElButton,
  ElBadge,
  ElSelect,
  ElOption,
  ElCollapse,
  ElCollapseItem,
  ElMessage,
} from 'element-plus';
import { sampleState, clearMonitorEvents } from '../state';
import { setupSampleMonitor } from '../monitor';
import { createCoreAxiosMonitorInterceptor, type NetworkPayload } from '@atengk/monitor';

const monitor = setupSampleMonitor();
const selectedCategory = ref<string>('all');
const activeCollapse = ref<string[]>([]);
const simulatedTraceId = ref<string>('trace-demo-10086');

// 过滤后的事件流
const filteredEvents = computed(() => {
  if (selectedCategory.value === 'all') {
    return sampleState.events;
  }
  return sampleState.events.filter(e => e.type === selectedCategory.value);
});

// 获取事件标签颜色
const getTagType = (type: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
  switch (type) {
    case 'error':
      return 'danger';
    case 'white_screen':
      return 'danger';
    case 'performance':
      return 'warning';
    case 'network':
      return 'success';
    case 'lifecycle':
      return 'danger';
    default:
      return 'info';
  }
};

// 模拟 Axios 协同拦截器注入并提取后端 MDC TraceId
const simulateAxiosTrace = () => {
  const newTrace = `trace-mdc-${Math.floor(Math.random() * 90000 + 10000)}`;
  simulatedTraceId.value = newTrace;

  const interceptor = createCoreAxiosMonitorInterceptor(monitor);

  // 模拟从 Axios 响应中提取 TraceId
  interceptor.responseInterceptor({
    status: 200,
    headers: { 'x-trace-id': newTrace },
    data: { code: 200, data: { status: 'healthy' }, msg: 'success', traceId: newTrace },
  });

  // 手动派发一条携带 traceId 的网络事件
  monitor.emit<NetworkPayload>({
    type: 'network',
    level: 'info',
    payload: {
      url: 'http://localhost:8080/api/v1/orders/query',
      method: 'GET',
      status: 200,
      duration: 48,
      traceId: newTrace,
      requestType: 'fetch',
      success: true,
    },
  });

  ElMessage.success(`后端 MDC TraceId [${newTrace}] 已成功提取并与 ContextStore 绑定！`);
};
</script>

<template>
  <el-card shadow="never" class="terminal-card">
    <template #header>
      <div class="terminal-header">
        <div class="header-left">
          <span class="title">5. 本地 Mock APM 实时事件接收终端</span>
          <el-badge :value="sampleState.events.length" :max="99" class="badge" />
        </div>
        <div class="header-actions">
          <el-select v-model="selectedCategory" size="small" style="width: 130px">
            <el-option label="全部事件" value="all" />
            <el-option label="运行时异常" value="error" />
            <el-option label="网络通信" value="network" />
            <el-option label="性能体验" value="performance" />
            <el-option label="白屏感知" value="white_screen" />
            <el-option label="自定义/其他" value="custom" />
          </el-select>
          <el-button type="primary" size="small" plain @click="simulateAxiosTrace">
            模拟后端 TraceId 串联
          </el-button>
          <el-button type="danger" size="small" plain @click="clearMonitorEvents">
            清空终端
          </el-button>
        </div>
      </div>
    </template>

    <div class="trace-status-bar">
      <span>当前上下文绑定的分布式 TraceId:</span>
      <el-tag type="success" effect="dark" size="small">{{ simulatedTraceId }}</el-tag>
    </div>

    <div class="event-stream">
      <div v-if="filteredEvents.length === 0" class="empty-terminal">
        <p>暂无捕获的遥测事件。请在上方面板触发故障、卡顿或网络请求。</p>
      </div>

      <el-collapse v-else v-model="activeCollapse">
        <el-collapse-item
          v-for="(event, idx) in filteredEvents"
          :key="event.id || idx"
          :name="event.id || String(idx)"
        >
          <template #title>
            <div class="collapse-title">
              <el-tag :type="getTagType(event.type)" size="small" class="type-tag">
                {{ event.type.toUpperCase() }}
              </el-tag>
              <el-tag
                :type="event.level === 'fatal' || event.level === 'error' ? 'danger' : 'info'"
                size="small"
              >
                {{ event.level }}
              </el-tag>
              <span class="event-brief">
                {{
                  (event.payload as { message?: string; name?: string })?.message ||
                  (event.payload as { name?: string })?.name ||
                  event.type
                }}
              </span>
              <span class="event-time">
                {{ new Date(event.timestamp).toLocaleTimeString() }}
              </span>
            </div>
          </template>

          <pre class="json-payload">{{ JSON.stringify(event, null, 2) }}</pre>
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-card>
</template>

<style scoped>
.terminal-card {
  border: 1px solid var(--el-color-primary-light-7);
  background: var(--el-bg-color-overlay);
}
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.trace-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
}
.event-stream {
  max-height: 400px;
  overflow-y: auto;
}
.empty-terminal {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}
.event-brief {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.event-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-right: 12px;
}
.json-payload {
  background: var(--el-fill-color-darker);
  color: #a9b7c6;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 250px;
  overflow: auto;
  margin: 0;
}
</style>

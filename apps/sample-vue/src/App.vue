<script setup lang="ts">
/**
 * sample-vue 全局配置与基础运行时自验页面。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { ref } from 'vue';
import {
  VERSION as VUE_PKG_VERSION,
  useAtengConfig,
  useDebounceFn,
  useThrottleFn,
  useEventListener,
} from '@atengk/vue';
import { VERSION as CORE_PKG_VERSION } from '@atengk/core';

// 1. 读取全局注入配置
const config = useAtengConfig();

// 2. 防抖与节流自验状态
const debounceInput = ref('');
const debouncedValue = ref('');
const handleInput = useDebounceFn((val: string) => {
  debouncedValue.value = val;
}, 300);

const clickRawCount = ref(0);
const clickThrottledCount = ref(0);
const handleThrottledClick = useThrottleFn(() => {
  clickThrottledCount.value += 1;
}, 1000);

const onRawClick = () => {
  clickRawCount.value += 1;
  handleThrottledClick();
};

// 3. 受管事件监听自验状态
const windowClickCount = ref(0);
useEventListener(window, 'click', () => {
  windowClickCount.value += 1;
});
</script>

<template>
  <main class="sample-container">
    <header class="header">
      <h1>@atengk/vue 自验沙箱展厅</h1>
      <div class="version-badges">
        <span class="badge">@atengk/core: v{{ CORE_PKG_VERSION }}</span>
        <span class="badge badge-vue">@atengk/vue: v{{ VUE_PKG_VERSION }}</span>
      </div>
    </header>

    <section class="card">
      <h2>1. 全局配置注入自验 (createAtengVue & useAtengConfig)</h2>
      <p class="desc">
        主应用入口已通过
        <code>app.use(createAtengVue({ defaultPageSize: 20 }))</code> 注册全局插件。
      </p>
      <div class="config-grid">
        <div class="config-item">
          <span class="label">全局默认分页大小 (defaultPageSize):</span>
          <span class="value">{{ config.defaultPageSize }} 条/页</span>
        </div>
        <div class="config-item">
          <span class="label">流式客户端自动挂载 (autoConnectStream):</span>
          <span class="value">{{ config.autoConnectStream ? '开启' : '关闭' }}</span>
        </div>
        <div class="config-item">
          <span class="label">WebSocket 客户端自动挂载 (autoConnectWebSocket):</span>
          <span class="value">{{ config.autoConnectWebSocket ? '开启' : '关闭' }}</span>
        </div>
        <div class="config-item">
          <span class="label">默认 HTTP 客户端注入状态:</span>
          <span class="value">{{ config.httpClient ? '已注入 (@atengk/core)' : '未就绪' }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>2. 纯原生受管微工具自验 (Debounce / Throttle / EventListener)</h2>
      <div class="tools-grid">
        <div class="tool-box">
          <h3>防抖测试 (useDebounceFn 300ms)</h3>
          <input
            v-model="debounceInput"
            type="text"
            placeholder="连续快速输入测试防抖..."
            class="input"
            @input="handleInput(debounceInput)"
          />
          <p class="result">
            实时输入: <strong>{{ debounceInput || '(空)' }}</strong>
          </p>
          <p class="result">
            防抖决议: <strong class="highlight">{{ debouncedValue || '(等待输入)' }}</strong>
          </p>
        </div>

        <div class="tool-box">
          <h3>节流测试 (useThrottleFn 1000ms)</h3>
          <button class="btn" @click="onRawClick">狂点我测试节流 (1秒内仅计1次)</button>
          <p class="result">物理点击次数: {{ clickRawCount }} 次</p>
          <p class="result">
            节流生效次数: <strong class="highlight">{{ clickThrottledCount }} 次</strong>
          </p>
        </div>

        <div class="tool-box">
          <h3>受管全局事件监听 (useEventListener)</h3>
          <p class="desc">页面销毁时自动通过 onScopeDispose 确定性解绑：</p>
          <p class="result">
            全局 Window 点击累计: <strong class="highlight">{{ windowClickCount }} 次</strong>
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sample-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #2c3e50;
}

.header {
  border-bottom: 2px solid #eaecef;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

h1 {
  font-size: 28px;
  margin: 0 0 12px 0;
  color: #1f2d3d;
}

.version-badges {
  display: flex;
  gap: 12px;
}

.badge {
  background-color: #f0f2f5;
  color: #4a5568;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.badge-vue {
  background-color: #e6f7ff;
  color: #096dd9;
  border: 1px solid #91d5ff;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

h2 {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 8px;
  color: #2d3748;
}

.desc {
  font-size: 14px;
  color: #718096;
  margin-bottom: 16px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 13px;
  color: #64748b;
}

.value {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.tool-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
}

h3 {
  font-size: 15px;
  margin: 0 0 12px 0;
  color: #334155;
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
}

.btn {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #2563eb;
}

.result {
  font-size: 14px;
  margin: 6px 0;
  color: #475569;
}

.highlight {
  color: #2563eb;
}
</style>

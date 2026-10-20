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
  useRequest,
} from '@atengk/vue';
import { VERSION as CORE_PKG_VERSION } from '@atengk/core';
import PaginationDemo from './components/PaginationDemo.vue';
import LatestDemo from './components/LatestDemo.vue';
import AuthTenantDemo from './components/AuthTenantDemo.vue';
import IdempotentDemo from './components/IdempotentDemo.vue';
import ExcelDemo from './components/ExcelDemo.vue';
import UploadDemo from './components/UploadDemo.vue';
import StreamDemo from './components/StreamDemo.vue';

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

// 4. useRequest 状态机自验
interface UserProfile {
  id: number;
  name: string;
  role: string;
}

const fetchUser = async (id: number): Promise<UserProfile> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id,
    name: id === 1 ? '张三 (超级管理员)' : '李四 (运营人员)',
    role: id === 1 ? 'ADMIN' : 'OPERATOR',
  };
};

const currentUserId = ref(1);
const userRequest = useRequest(fetchUser, {
  defaultParams: [1],
});

const onSwitchUser = (id: number) => {
  currentUserId.value = id;
  userRequest.run(id);
};

const onOptimisticMutate = () => {
  userRequest.mutate(prev =>
    prev
      ? { ...prev, name: `${prev.name} [本地乐观修改 ${new Date().toLocaleTimeString()}]` }
      : undefined,
  );
};
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

    <section class="card">
      <h2>3. 异步请求状态机自验 (useRequest)</h2>
      <p class="desc">
        体验只读状态机（loading, data, error）、默认自动执行、手动切换参数、刷新以及本地乐观变更
        mutate。
      </p>
      <div class="request-demo">
        <div class="button-group">
          <button class="btn" :disabled="userRequest.loading.value" @click="userRequest.refresh()">
            {{ userRequest.loading.value ? '请求处理中...' : '刷新当前用户 (refresh)' }}
          </button>
          <button
            class="btn btn-secondary"
            :disabled="userRequest.loading.value"
            @click="onSwitchUser(currentUserId === 1 ? 2 : 1)"
          >
            切换加载用户 (ID: {{ currentUserId === 1 ? 2 : 1 }})
          </button>
          <button
            class="btn btn-secondary"
            :disabled="!userRequest.data.value"
            @click="onOptimisticMutate"
          >
            乐观更新数据 (mutate)
          </button>
        </div>

        <div class="state-display">
          <div class="state-row">
            <span class="label">Loading 状态机:</span>
            <span
              :class="['status-tag', userRequest.loading.value ? 'status-active' : 'status-idle']"
            >
              {{ userRequest.loading.value ? 'Loading (加载中)' : 'Idle (就绪)' }}
            </span>
          </div>
          <div class="state-row">
            <span class="label">当前数据实体 (只读 Ref):</span>
            <pre class="json-code">{{
              JSON.stringify(userRequest.data.value, null, 2) || '(暂无数据)'
            }}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 契约分页状态机自验组件 -->
    <PaginationDemo />

    <!-- 5. 异步时序竞态双重防御自验组件 -->
    <LatestDemo />

    <!-- 6. 响应式鉴权与多租户切片自验组件 -->
    <AuthTenantDemo />

    <!-- 7. 前端提交防刷与幂等互斥锁自验组件 -->
    <IdempotentDemo />

    <!-- 8. Fesod 流式 Excel 导出与批注回写自验组件 -->
    <ExcelDemo />

    <!-- 9. 大文件分片切片与受控并发上传自验组件 -->
    <UploadDemo />

    <!-- 10. SSE 大模型打字机流式响应自验组件 -->
    <StreamDemo />
  </main>
</template>

<style scoped src="./app.css"></style>
